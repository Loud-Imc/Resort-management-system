import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding expense categories...');

    const categories = [
        { name: 'Rent', description: 'Monthly property rent' },
        { name: 'Electricity', description: 'Utility bills for electricity' },
        { name: 'Salary', description: 'Staff salaries and wages' },
        { name: 'Maintenance', description: 'Repairs and general maintenance' },
        { name: 'Food & Beverage', description: 'Kitchen supplies and guest dining expenses' },
        { name: 'Marketing', description: 'Advertisements and promotions' },
        { name: 'Laundry', description: 'Linen and laundry services' },
        { name: 'Water', description: 'Utility bills for water' },
        { name: 'Internet & Phone', description: 'Communication and internet services' },
        { name: 'Tax', description: 'Government taxes and duties' },
        { name: 'Miscellaneous', description: 'Other operational expenses' },
    ];

    for (const category of categories) {
        await prisma.expenseCategory.upsert({
            where: { name: category.name },
            update: {},
            create: category,
        });
    }

    console.log('✅ Expense categories seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
