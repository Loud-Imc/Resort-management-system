import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'sahalcrm@routeguide.in' },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    });
    console.log(JSON.stringify(user, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
