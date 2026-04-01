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
        const existing = await prisma.expenseCategory.findFirst({
            where: { name: cat.name, propertyId: null },
        });

        if (existing) {
            await prisma.expenseCategory.update({
                where: { id: existing.id },
                data: { description: cat.description },
            });
        } else {
            await prisma.expenseCategory.create({
                data: { ...cat, propertyId: null },
            });
        }
        console.log(`✅ Category Sync: ${cat.name}`);
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
