import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const marketingRole = await prisma.role.findFirst({
        where: { name: 'Marketing' }
    });

    if (!marketingRole) {
        console.log('Marketing role not found.');
        return;
    }

    const permissionsToRemove = [
        'marketing.read',
        'properties.approve',
        'properties.create',
        'properties.delete',
        'properties.read',
        'properties.update'
    ];

    const perms = await prisma.permission.findMany({
        where: { name: { in: permissionsToRemove } }
    });

    for (const perm of perms) {
        await prisma.rolePermission.deleteMany({
            where: {
                roleId: marketingRole.id,
                permissionId: perm.id
            }
        });
        console.log(`Removed ${perm.name}`);
    }

    console.log('Done.');
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
