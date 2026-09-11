import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
    totalRoomTypes: number;
    migratedRoomTypes: number;
    totalProperties: number;
    migratedProperties: number;
    warnings: string[];
}

async function runOccupancyMigration() {
    const args = process.argv.slice(2);
    const isApply = args.includes('--apply') || args.includes('--execute');
    const isDryRun = !isApply || args.includes('--dry-run');

    // Optional filter by propertyId: --propertyId=xyz
    const propertyIdArg = args.find(a => a.startsWith('--propertyId='));
    const targetPropertyId = propertyIdArg ? propertyIdArg.split('=')[1] : null;

    // Optional limit: --limit=5
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limitCount = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

    // Optional flag to only process V1 (un-migrated) room types
    const onlyV1 = args.includes('--only-v1') || !args.includes('--all');

    console.log('================================================================');
    console.log(` 🚀 OCCUPANCY MIGRATION: V1 -> V2 CANONICAL MODEL`);
    console.log(` Mode: ${isDryRun ? '🔍 DRY RUN (Preview only, no database changes)' : '⚡ LIVE APPLY (Writing changes to database)'}`);
    if (targetPropertyId) {
        console.log(` Target Property ID: ${targetPropertyId}`);
    } else if (limitCount) {
        console.log(` Batch Limit: FIRST ${limitCount} Properties`);
    } else {
        console.log(` Target: ALL Properties & RoomTypes across the database`);
    }
    console.log(` Filter: ${onlyV1 ? 'Only migrating un-migrated (V1) RoomTypes' : 'All RoomTypes'}`);
    console.log('================================================================\n');

    const stats: MigrationStats = {
        totalRoomTypes: 0,
        migratedRoomTypes: 0,
        totalProperties: 0,
        migratedProperties: 0,
        warnings: [],
    };

    try {
        // 1. Fetch properties that contain room types
        let propertyQuery = `
            SELECT DISTINCT p.id, p.name 
            FROM properties p
            JOIN room_types rt ON rt."propertyId" = p.id
        `;
        const whereClauses: string[] = [];
        if (targetPropertyId) {
            whereClauses.push(`p.id = '${targetPropertyId.replace(/'/g, "''")}'`);
        }
        if (onlyV1) {
            whereClauses.push(`(rt."occupancyVersion" IS NULL OR rt."occupancyVersion" != 'V2')`);
        }

        if (whereClauses.length > 0) {
            propertyQuery += ` WHERE ` + whereClauses.join(' AND ');
        }
        propertyQuery += ` ORDER BY p.name ASC`;
        if (limitCount && limitCount > 0) {
            propertyQuery += ` LIMIT ${limitCount}`;
        }

        const properties: any[] = await prisma.$queryRawUnsafe(propertyQuery);
        stats.totalProperties = properties.length;
        console.log(`Found ${properties.length} propert(ies) matching migration criteria.\n`);

        if (properties.length === 0) {
            console.log('✨ No un-migrated properties found! All properties and room types are up to date.\n');
            return;
        }

        for (const property of properties) {
            try {
                console.log(`----------------------------------------------------------------`);
                console.log(`🏨 Property: "${property.name}" (ID: ${property.id})`);

                // Fetch room types for this property
                const roomTypesQuery = `
                    SELECT 
                        rt.id,
                        rt.name,
                        rt."baseAdults",
                        rt."baseChildren",
                        rt."maxAdults",
                        rt."maxChildren",
                        rt."maxPhysicalAdults",
                        rt."maxPhysicalChildren",
                        rt."maxPhysicalInfants",
                        rt."occupancyVersion",
                        rt."totalBaseOccupancy",
                        rt."totalMaxOccupancy",
                        rt."baseMaxAdults",
                        rt."baseMaxChildren",
                        rt."isAvailableForGroupBooking",
                        rt."groupMaxOccupancy",
                        COUNT(r.id) FILTER (WHERE r."isEnabled" = true) as "activeRoomCount"
                    FROM room_types rt
                    LEFT JOIN rooms r ON r."roomTypeId" = rt.id
                    WHERE rt."propertyId" = '${property.id.replace(/'/g, "''")}'
                    GROUP BY rt.id
                    ORDER BY rt.name ASC
                `;

                const roomTypes: any[] = await prisma.$queryRawUnsafe(roomTypesQuery);
                let propertyTotalGroupCapacity = 0;
                const roomTypeUpdates: Array<{ id: string; name: string; oldData: any; newData: any }> = [];

                for (const rt of roomTypes) {
                    stats.totalRoomTypes++;

                    // Legacy values extraction
                    const baseAdults = rt.baseAdults !== null && rt.baseAdults !== undefined ? Number(rt.baseAdults) : 2;
                    const baseChildren = rt.baseChildren !== null && rt.baseChildren !== undefined ? Number(rt.baseChildren) : 0;

                    const maxAdults = rt.maxAdults !== null && rt.maxAdults !== undefined ? Number(rt.maxAdults) : baseAdults;
                    const maxChildren = rt.maxChildren !== null && rt.maxChildren !== undefined ? Number(rt.maxChildren) : 0;

                    let maxPhysA = rt.maxPhysicalAdults !== null && rt.maxPhysicalAdults !== undefined ? Number(rt.maxPhysicalAdults) : maxAdults;
                    let maxPhysC = rt.maxPhysicalChildren !== null && rt.maxPhysicalChildren !== undefined ? Number(rt.maxPhysicalChildren) : maxChildren;

                    // Enforce physical constraints: maxPhysical must be at least base
                    if (maxPhysA < baseAdults) {
                        stats.warnings.push(`[${property.name} -> ${rt.name}] maxPhysicalAdults (${maxPhysA}) was less than baseAdults (${baseAdults}). Adjusted maxPhysicalAdults to ${baseAdults}.`);
                        maxPhysA = baseAdults;
                    }

                    // Canonical V2 Calculations
                    const totalBaseOccupancy = baseAdults + baseChildren;
                    const baseMaxAdults = baseAdults;
                    const baseMaxChildren = baseChildren;

                    let totalMaxOccupancy = maxPhysA + maxPhysC;
                    if (totalMaxOccupancy < totalBaseOccupancy) {
                        stats.warnings.push(`[${property.name} -> ${rt.name}] totalMaxOccupancy (${totalMaxOccupancy}) was less than totalBaseOccupancy (${totalBaseOccupancy}). Adjusted totalMaxOccupancy to ${totalBaseOccupancy}.`);
                        totalMaxOccupancy = totalBaseOccupancy;
                    }

                    const maxPhysicalInfants = 0; // Default infants to 0 as required
                    const groupMaxOccupancy = totalMaxOccupancy; // V2 canonical authority alignment

                    const oldData = {
                        version: rt.occupancyVersion || 'V1',
                        baseAdults: rt.baseAdults,
                        baseChildren: rt.baseChildren,
                        maxAdults: rt.maxAdults,
                        maxChildren: rt.maxChildren,
                        maxPhysicalAdults: rt.maxPhysicalAdults,
                        maxPhysicalChildren: rt.maxPhysicalChildren,
                        maxPhysicalInfants: rt.maxPhysicalInfants,
                        totalBaseOccupancy: rt.totalBaseOccupancy,
                        totalMaxOccupancy: rt.totalMaxOccupancy,
                        baseMaxAdults: rt.baseMaxAdults,
                        baseMaxChildren: rt.baseMaxChildren,
                        groupMaxOccupancy: rt.groupMaxOccupancy,
                    };

                    const newData = {
                        occupancyVersion: 'V2',
                        totalBaseOccupancy,
                        totalMaxOccupancy,
                        baseMaxAdults,
                        baseMaxChildren,
                        maxPhysicalAdults: maxPhysA,
                        maxPhysicalChildren: maxPhysC,
                        maxPhysicalInfants,
                        groupMaxOccupancy,
                    };

                    roomTypeUpdates.push({
                        id: rt.id,
                        name: rt.name,
                        oldData,
                        newData,
                    });

                    // Calculate group capacity contribution for enabled rooms
                    const isGroup = rt.isAvailableForGroupBooking === true || rt.isAvailableForGroupBooking === 'true';
                    if (isGroup) {
                        const activeRooms = Number(rt.activeRoomCount || 0);
                        propertyTotalGroupCapacity += totalMaxOccupancy * activeRooms;
                    }
                }

                // Print room type migration plan for this property
                for (const update of roomTypeUpdates) {
                    console.log(`   🛏️  RoomType: "${update.name}" (${update.id})`);
                    console.log(`      BEFORE: [${update.oldData.version}] Base(A:${update.oldData.baseAdults}, C:${update.oldData.baseChildren}) | MaxPhys(A:${update.oldData.maxPhysicalAdults}, C:${update.oldData.maxPhysicalChildren}) | Infants:${update.oldData.maxPhysicalInfants ?? 'N/A'}`);
                    console.log(`      AFTER : [V2] TotalBase:${update.newData.totalBaseOccupancy} (BaseMaxA:${update.newData.baseMaxAdults}, BaseMaxC:${update.newData.baseMaxChildren}) | TotalMax:${update.newData.totalMaxOccupancy} (PA:${update.newData.maxPhysicalAdults}, PC:${update.newData.maxPhysicalChildren}) | Infants:0 | GroupMax:${update.newData.groupMaxOccupancy}`);
                }

                console.log(`   📊 Calculated Property Max Group Capacity: ${propertyTotalGroupCapacity}`);

                // Apply updates if not dry run
                if (!isApply) {
                    stats.migratedRoomTypes += roomTypeUpdates.length;
                    stats.migratedProperties++;
                    console.log(`   🔍 [DRY RUN] Would update Property and ${roomTypeUpdates.length} RoomType(s).\n`);
                } else {
                    for (const update of roomTypeUpdates) {
                        const u = update.newData;
                        await prisma.$executeRawUnsafe(`
                            UPDATE room_types
                            SET 
                                "occupancyVersion" = 'V2',
                                "totalBaseOccupancy" = ${u.totalBaseOccupancy},
                                "totalMaxOccupancy" = ${u.totalMaxOccupancy},
                                "baseMaxAdults" = ${u.baseMaxAdults},
                                "baseMaxChildren" = ${u.baseMaxChildren},
                                "maxPhysicalAdults" = ${u.maxPhysicalAdults},
                                "maxPhysicalChildren" = ${u.maxPhysicalChildren},
                                "maxPhysicalInfants" = ${u.maxPhysicalInfants},
                                "groupMaxOccupancy" = ${u.groupMaxOccupancy},
                                "updatedAt" = NOW()
                            WHERE id = '${update.id.replace(/'/g, "''")}'
                        `);
                        stats.migratedRoomTypes++;
                    }

                    // Update Property group capacity
                    const groupCapSql = propertyTotalGroupCapacity > 0 ? propertyTotalGroupCapacity : 'NULL';
                    await prisma.$executeRawUnsafe(`
                        UPDATE properties
                        SET 
                            "maxGroupCapacity" = ${groupCapSql},
                            "updatedAt" = NOW()
                        WHERE id = '${property.id.replace(/'/g, "''")}'
                    `);
                    stats.migratedProperties++;

                    console.log(`   ✅ Successfully updated Property and ${roomTypeUpdates.length} RoomType(s) in database.\n`);
                }
            } catch (propertyError: any) {
                const errMsg = `Failed to process property "${property.name}" (${property.id}): ${propertyError.message || propertyError}`;
                console.error(`   ❌ [SKIPPED PROPERTY] ${errMsg}\n`);
                stats.warnings.push(`[SKIPPED] ${errMsg}`);
            }
        }

        // Summary Report
        console.log('================================================================');
        console.log(' 📋 MIGRATION SUMMARY REPORT');
        console.log('================================================================');
        console.log(` Mode:               ${isDryRun ? 'DRY RUN (Preview Only)' : 'LIVE EXECUTION (Database Updated)'}`);
        console.log(` Total Properties:   ${stats.totalProperties}`);
        console.log(` Updated Properties: ${stats.migratedProperties}`);
        console.log(` Total Room Types:   ${stats.totalRoomTypes}`);
        console.log(` Updated Room Types: ${stats.migratedRoomTypes}`);
        console.log(` Warnings Logged:    ${stats.warnings.length}`);

        if (stats.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            stats.warnings.forEach((w, idx) => console.log(`  ${idx + 1}. ${w}`));
        }

        if (isDryRun) {
            console.log('\n💡 Next Step: To apply this batch to the database, run:');
            console.log(`   npm run migrate:occupancy-v2 -- ${limitCount ? `--limit=${limitCount} ` : ''}--apply\n`);
        } else {
            console.log('\n🎉 Batch Migration completed successfully!');
            console.log('💡 Tip: Run "npm run migrate:occupancy-v2" without --limit to migrate remaining properties.\n');
        }

    } catch (error) {
        console.error('❌ Migration failed with error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runOccupancyMigration();
