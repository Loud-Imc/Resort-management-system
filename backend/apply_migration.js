const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Applying manual SQL migration...");
    
    // Check if column exists to avoid error if it does
    const billUrlExists = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='assets' and column_name='billUrl';
    `);

    if (billUrlExists.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "assets" ADD COLUMN "billUrl" TEXT;`);
      console.log("Added billUrl column.");
    } else {
      console.log("billUrl column already exists.");
    }

    const imagesExists = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='assets' and column_name='images';
    `);

    if (imagesExists.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "assets" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
      console.log("Added images column.");
    } else {
      console.log("images column already exists.");
    }

    const documentsExists = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='properties' and column_name='documents';
    `);

    if (documentsExists.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "properties" ADD COLUMN "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
      console.log("Added documents column to properties table.");
    } else {
      console.log("documents column in properties table already exists.");
    }
    
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
