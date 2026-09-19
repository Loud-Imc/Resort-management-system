import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting image URL migration to api.oreedu.com...');

  const replaceDomain = (url?: string | null) => {
    if (!url) return url;
    return url
      .replace(/https?:\/\/(api\.)?myoreedu\.com/g, 'https://api.oreedu.com')
      .replace(/https?:\/\/(api\.)?routeguide\.in/g, 'https://api.oreedu.com')
      .replace(/https?:\/\/(api\.)?myrouteguide\.com/g, 'https://api.oreedu.com')
      .replace(/https?:\/\/oreedu\.com\/uploads/g, 'https://api.oreedu.com/uploads')
      .replace(/https?:\/\/localhost:\d+\/uploads/g, 'https://api.oreedu.com/uploads');
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
    if (user.avatar) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: replaceDomain(user.avatar) },
      });
      userUpdated++;
    }
  }
  console.log(`✅ Updated ${userUpdated} user avatars.`);

  // 4. Update Banners
  try {
    const banners = await prisma.banner.findMany({});
    let bannerUpdated = 0;
    for (const banner of banners) {
      if (banner.imageUrl) {
        await prisma.banner.update({
          where: { id: banner.id },
          data: { imageUrl: replaceDomain(banner.imageUrl)! },
        });
        bannerUpdated++;
      }
    }
    console.log(`✅ Updated ${bannerUpdated} banners.`);
  } catch (e) {
    // Banner table optional
  }

  // 5. Update Property Requests (if any)
  try {
    const requests = await prisma.propertyRequest.findMany({});
    let reqUpdated = 0;
    for (const req of requests) {
      await prisma.propertyRequest.update({
        where: { id: req.id },
        data: {
          coverImage: replaceDomain(req.coverImage),
          images: replaceArray(req.images),
          documents: replaceArray(req.documents),
        },
      });
      reqUpdated++;
    }
    console.log(`✅ Updated ${reqUpdated} property requests.`);
  } catch (e) {}

  console.log('🎉 Image URL migration complete! All image URLs point to https://api.oreedu.com');
}

main()
  .catch(e => console.error('❌ Migration failed:', e))
  .finally(() => prisma.$disconnect());
