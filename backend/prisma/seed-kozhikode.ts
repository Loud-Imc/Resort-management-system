import { PrismaClient, PropertyType } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-') + '-' + Math.random().toString(36).substring(7);
}

const IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
];

const kozhikkodeProperties = [
  {
    name: 'Malabar Heritage Beach Resort',
    type: PropertyType.RESORT,
    address: 'Kappad Beach Road, Kozhikkode',
    desc: 'Luxurious historic beachfront resort set where Vasco da Gama first landed, featuring traditional Kerala architecture and world-class seafood dining.',
  },
  {
    name: 'Kadalundi Backwater Eco-Villa',
    type: PropertyType.VILLA,
    address: 'Kadalundi Bird Sanctuary, Kozhikkode',
    desc: 'Peaceful waterfront escape surrounded by lush mangroves and native bird habitats. Perfect for nature lovers and kayaking enthusiasts.',
  },
  {
    name: 'Beypore Marina Boutique Stay',
    type: PropertyType.HOMESTAY,
    address: 'Beypore Port, Kozhikkode',
    desc: 'Premium modern homestay overlooking the ancient dhow shipyards, blending modern luxury with heartfelt Malabar hospitality.',
  },
];

async function seedKozhikkode() {
  console.log('🌴 Fetching Category Map...');
  const categories = await prisma.propertyCategory.findMany();
  
  console.log('👤 Finding default Property Owner user...');
  const owner = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'PropertyOwner' } } } },
  });

  if (!owner) {
    console.error('❌ ERROR: No PropertyOwner user found in the database.');
    return;
  }

  console.log(`✅ Owner found: ${owner.firstName || 'Owner'} (ID: ${owner.id})`);
  console.log(`🌴 Seeding 3 Featured properties in Kozhikkode...\n`);

  for (const pData of kozhikkodeProperties) {
    const slug = generateSlug(pData.name);
    const catSlug = pData.type.toLowerCase();
    const category = categories.find(c => c.slug === catSlug) || categories.find(c => c.slug === 'other');
    const randCover = IMAGES[Math.floor(Math.random() * IMAGES.length)];

    // 1. Create property record with isFeatured = true
    const property = await prisma.property.create({
      data: {
        name: pData.name,
        slug: slug,
        description: pData.desc,
        type: pData.type,
        address: pData.address,
        city: 'Kozhikkode',
        state: 'Kerala',
        country: 'India',
        pincode: '673001',
        email: `contact@${slug.substring(0, 15)}.com`,
        phone: '+919' + Math.floor(100000000 + Math.random() * 900000000).toString(),
        coverImage: randCover,
        images: [randCover, IMAGES[0], IMAGES[1]],
        amenities: ['High Speed WiFi', 'Air Conditioning', 'Beach Access', 'Malabar Cuisine', 'Parking'],
        rating: 4.7 + Math.random() * 0.2,
        reviewCount: Math.floor(20 + Math.random() * 40),
        isActive: true,
        isVerified: true,
        isFeatured: true, // Marked as live featured campaign
        promotionStart: new Date(),
        promotionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'APPROVED',
        ownerId: owner.id,
        categoryId: category?.id || null,
        baseCurrency: 'INR',
      }
    });

    console.log(`🏠 Created: ${property.name}`);

    // 2. Create active promotion request record so slot counters detect it
    await prisma.promotionRequest.create({
      data: {
        propertyId: property.id,
        type: 'HOMEPAGE_FEATURED',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        price: 5000,
        paymentId: `pay_kozhikkode_${Math.random().toString(36).substring(7)}`,
      }
    });

    // 3. Create a default room type
    const basePrice = 3500;
    const standardRt = await prisma.roomType.create({
      data: {
        name: 'Deluxe Malabar Suite',
        description: 'Spacious suite with sweeping ocean views and handcrafted teak furnishings.',
        basePrice: basePrice,
        extraAdultPrice: 1000,
        extraChildPrice: 500,
        maxAdults: 3,
        maxChildren: 2,
        amenities: ['WiFi', 'Air Conditioning', 'Ocean View', 'Mini Bar'],
        highlights: ['Sea View', 'Breakfast Included'],
        inclusions: ['Breakfast Included'],
        images: [randCover],
        isPubliclyVisible: true,
        propertyId: property.id,
      }
    });

    // 4. Create rooms for inventory
    for (let r = 1; r <= 3; r++) {
      await prisma.room.create({
        data: {
          roomNumber: `M${r}0${r}`,
          floor: 1,
          status: 'AVAILABLE',
          isEnabled: true,
          roomTypeId: standardRt.id,
          propertyId: property.id,
        }
      });
    }
  }

  console.log('\n🎉 Successfully seeded 3 Promoted/Featured properties in Kozhikkode!');
}

seedKozhikkode()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
