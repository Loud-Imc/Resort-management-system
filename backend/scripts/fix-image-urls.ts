import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting image URL migration from routeguide -> myoreedu...');

  const replaceDomain = (url?: string | null) => {
    if (!url) return url;
    return url.replace(/routeguide\.in/g, 'myoreedu.com').replace(/myrouteguide\.com/g, 'myoreedu.com');
  };

  const replaceArray = (arr?: string[]) => {
    if (!arr || !Array.isArray(arr)) return arr;
    return arr.map(item => replaceDomain(item) as string);
  };

  // 1. Update Properties
  const properties = await prisma.property.findMany({});
  let propUpdated = 0;
  for (const prop of properties) {
    const newCover = replaceDomain(prop.coverImage);
    const newImages = replaceArray(prop.images);
    const newLicence = replaceDomain(prop.licenceImage);
    const newDoc = replaceArray(prop.documents);
    const newAadhaarFront = replaceDomain(prop.ownerAadhaarImage);
    const newAadhaarBack = replaceDomain(prop.ownerAadhaarImageBack);

    await prisma.property.update({
      where: { id: prop.id },
      data: {
        coverImage: newCover,
        images: newImages,
        licenceImage: newLicence,
        documents: newDoc,
        ownerAadhaarImage: newAadhaarFront,
        ownerAadhaarImageBack: newAadhaarBack,
      },
    });
    propUpdated++;
  }
  console.log(`✅ Updated ${propUpdated} properties.`);

  // 2. Update RoomTypes
  const roomTypes = await prisma.roomType.findMany({});
  let roomUpdated = 0;
  for (const room of roomTypes) {
    const newImages = replaceArray(room.images);
    await prisma.roomType.update({
      where: { id: room.id },
      data: {
        images: newImages,
      },
    });
    roomUpdated++;
  }
  console.log(`✅ Updated ${roomUpdated} room types.`);

  // 3. Update Users (avatars)
  const users = await prisma.user.findMany({});
  let userUpdated = 0;
  for (const user of users) {
    if (user.avatar && (user.avatar.includes('routeguide') || user.avatar.includes('myrouteguide'))) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: replaceDomain(user.avatar) },
      });
      userUpdated++;
    }
  }
  console.log(`✅ Updated ${userUpdated} user avatars.`);

  console.log('🎉 Image URL migration complete!');
}

main()
  .catch(e => console.error('❌ Migration failed:', e))
  .finally(() => prisma.$disconnect());
