const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Applying asset permissions seed...");
        
        const assetsPermissions = [
            'assets.create',
            'assets.read',
            'assets.update',
            'assets.delete',
        ];

        // 1. Create permissions
        for (const perm of assetsPermissions) {
            await prisma.permission.upsert({
                where: { name: perm },
                update: { description: perm },
                create: {
                    name: perm,
                    module: 'assets',
                    description: perm,
                },
            });
            console.log(`Created/updated permission: ${perm}`);
        }

        // 2. Assign to roles
        const rolesToUpdate = ['SuperAdmin', 'PropertyOwner', 'Admin', 'Manager'];
        
        for (const roleName of rolesToUpdate) {
            const role = await prisma.role.findFirst({ where: { name: roleName, propertyId: null } });
            
            if (role) {
                let addedCount = 0;
                for (const perm of assetsPermissions) {
                    const permission = await prisma.permission.findUnique({ where: { name: perm } });
                    if (permission) {
                        try {
                            await prisma.rolePermission.create({
                                data: {
                                    roleId: role.id,
                                    permissionId: permission.id
                                }
                            });
                            addedCount++;
                        } catch (err) {
                            // Already exists
                        }
                    }
                }
                console.log(`Assigned ${addedCount} new asset permissions to ${roleName}`);
            }
        }

        console.log("Permissions seeded successfully!");
    } catch (error) {
        console.error("Error seeding permissions:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
