import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Cross-Tenant Isolation (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;

    let ownerA: any;
    let ownerB: any;
    let propertyA: any;
    let propertyB: any;
    let tokenA: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
        jwtService = app.get<JwtService>(JwtService);

        // Clean up in order of dependencies
        await prisma.auditLog.deleteMany();
        await prisma.roomBlock.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.income.deleteMany();
        await prisma.expense.deleteMany();
        await prisma.eventBooking.deleteMany();
        await prisma.event.deleteMany();
        await prisma.booking.deleteMany();
        await prisma.room.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.channelPartner.deleteMany();
        await prisma.propertyStaff.deleteMany();
        await prisma.property.deleteMany();
        await prisma.user.deleteMany();

        // Ensure PropertyOwner role exists
        const ownerRole = await prisma.role.upsert({
            where: { name: 'PropertyOwner' },
            update: {},
            create: { name: 'PropertyOwner' }
        });

        // Ensure Permissions exist
        const perms = ['properties.read', 'properties.update', 'properties.delete'];

        for (const pName of perms) {
            const perm = await prisma.permission.upsert({
                where: { name: pName },
                update: {},
                create: { name: pName, module: 'properties' }
            });

            // Assign to Role
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: ownerRole.id,
                        permissionId: perm.id
                    }
                },
                update: {},
                create: {
                    roleId: ownerRole.id,
                    permissionId: perm.id
                }
            });
        }

        // Setup Owner A
        ownerA = await prisma.user.create({
            data: {
                email: 'ownerA@test.com',
                password: 'password',
                firstName: 'Owner',
                lastName: 'A',
                roles: {
                    create: [{ role: { connect: { name: 'PropertyOwner' } } }]
                }
            },
            include: { roles: true }
        });

        // Setup Owner B
        ownerB = await prisma.user.create({
            data: {
                email: 'ownerB@test.com',
                password: 'password',
                firstName: 'Owner',
                lastName: 'B',
                roles: {
                    create: [{ role: { connect: { name: 'PropertyOwner' } } }]
                }
            },
            include: { roles: true }
        });

        // Create Property A
        propertyA = await prisma.property.create({
            data: {
                name: 'Property A',
                slug: 'property-a',
                description: 'Desc A',
                ownerId: ownerA.id,
                address: 'Addr A',
                city: 'City A',
                state: 'State A',
                country: 'Country A',
                pincode: '11111',
                type: 'RESORT',
                email: 'propA@test.com',
                phone: '1234567890',
            }
        });

        // Create Property B
        propertyB = await prisma.property.create({
            data: {
                name: 'Property B',
                slug: 'property-b',
                description: 'Desc B',
                ownerId: ownerB.id, // Owned by B
                address: 'Addr B',
                city: 'City B',
                state: 'State B',
                country: 'Country B',
                pincode: '22222',
                type: 'RESORT',
                email: 'propB@test.com',
                phone: '0987654321',
            }
        });

        // Login Owner A
        const payload = {
            email: ownerA.email,
            sub: ownerA.id,
            roles: ['PropertyOwner'],
            permissions: ['properties.read', 'properties.update'] // Mock permissions for test
        };
        tokenA = jwtService.sign(payload);
    });

    afterAll(async () => {
        await app.close();
    });

    it('Owner A should NOT be able to UPDATE Property B', async () => {
        const res = await request(app.getHttpServer())
            .put(`/properties/${propertyB.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Hacked Property Name',
            });

        if (res.status !== 403) {
            console.log(`[DEBUG] UPDATE /properties/${propertyB.id} failed.`);
            console.log(`[DEBUG] Status: ${res.status}`);
            console.log(`[DEBUG] Body: ${JSON.stringify(res.body)}`);
        }
        expect(res.status).toBe(403);
    });

    it('Owner A should NOT be able to DELETE Property B', async () => {
        const res = await request(app.getHttpServer())
            .delete(`/properties/${propertyB.id}`)
            .set('Authorization', `Bearer ${tokenA}`);

        if (res.status !== 403) {
            console.log(`[DEBUG] DELETE /properties/${propertyB.id} failed.`);
            console.log(`[DEBUG] Status: ${res.status}`);
            console.log(`[DEBUG] Body: ${JSON.stringify(res.body)}`);
        }
        expect(res.status).toBe(403);
    });

    it('Owner A calling /properties/my/properties should only retrieve Property A', async () => {
        const response = await request(app.getHttpServer())
            .get('/properties/my/properties')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        if (response.body.length !== 1 || response.body[0].id !== propertyA.id) {
            console.log(`[DEBUG] GET /properties/my/properties failed.`);
            console.log(`[DEBUG] Expected 1 property (A), got: ${response.body.length}`);
            console.log(`[DEBUG] Body: ${JSON.stringify(response.body)}`);
        }

        expect(response.body).toHaveLength(1);
        expect(response.body[0].id).toBe(propertyA.id);
    });
});
