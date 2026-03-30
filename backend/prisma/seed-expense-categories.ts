import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Expense Categories...');

    const categories = [
        { name: 'Maintenance', description: 'Property repairs and upkeep' },
        { name: 'Utilities', description: 'Electricity, Water, Internet, Gas' },
        { name: 'Salaries', description: 'Staff wages and benefits' },
        { name: 'Marketing', description: 'Advertising and promotions' },
        { name: 'Food & Beverages', description: 'Restaurant and kitchen supplies' },
        { name: 'Housekeeping', description: 'Cleaning supplies and laundry' },
        { name: 'Rent', description: 'Lease and property rent' },
        { name: 'Taxes', description: 'Government taxes and duties' },
        { name: 'Other', description: 'Miscellaneous expenses' },
    ];

    for (const cat of categories) {
        await prisma.expenseCategory.upsert({
            where: { name: cat.name },
            update: {
                description: cat.description,
            },
            create: cat,
        });
        console.log(`✅ Category Upserted: ${cat.name}`);
    }

    console.log('\n🎉 Expense Categories seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
