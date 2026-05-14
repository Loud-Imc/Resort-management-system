import { PrismaClient, PropertyType } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to generate clean slugs
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
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80',
];

const propertiesDataset = [
  // --- Wayanad District ---
  { name: 'Wayanad Silver Woods', type: PropertyType.RESORT, city: 'Wayanad', address: 'Vythiri, Wayanad', desc: 'Prestige lakeside luxury resort set amidst misty mountains.' },
  { name: 'Vythiri Wild Forest Homestay', type: PropertyType.HOMESTAY, city: 'Wayanad', address: 'Lakkidi, Wayanad', desc: 'Charming rainforest experience nestled high in the Western Ghats.' },
  { name: 'Edakkal View Nature Villa', type: PropertyType.VILLA, city: 'Wayanad', address: 'Ambalavayal, Wayanad', desc: 'Private villa directly facing the historic Edakkal Caves.' },
  { name: 'Banasura Hill Valley Resort', type: PropertyType.RESORT, city: 'Wayanad', address: 'Padinjarathara, Wayanad', desc: 'An eco-luxury resort near the largest earthen dam in India.' },
  { name: 'Sultans Gate Boutique Hotel', type: PropertyType.HOTEL, city: 'Wayanad', address: 'Sulthan Bathery, Wayanad', desc: 'Modern luxury boutique stay for transit travelers and shoppers.' },

  // --- Idukki District ---
  { name: 'Munnar Mist Valley Resort', type: PropertyType.RESORT, city: 'Idukki', address: 'Pallivasal, Munnar', desc: 'Escape into endless tea plantations and cooling mountain fogs.' },
  { name: 'Thekkady Wild Woods Villa', type: PropertyType.VILLA, city: 'Idukki', address: 'Kumily, Thekkady', desc: 'Cozy boutique cabins within listening distance of the Periyar wildlife reserve.' },
  { name: 'Vagamon Pine Meadows Homestay', type: PropertyType.HOMESTAY, city: 'Idukki', address: 'Vagamon Heights, Idukki', desc: 'Rolling green hills, pine forests, and authentic home-cooked meals.' },
  { name: 'Kanthalloor Apple Orchard Homestay', type: PropertyType.HOMESTAY, city: 'Idukki', address: 'Kanthalloor, Marayoor', desc: 'Quaint cottage living famous for cool climate fruits and sugarcane farms.' },
  { name: 'Spice Valley Luxury Heights', type: PropertyType.RESORT, city: 'Idukki', address: 'Kattappana Hilltown, Idukki', desc: 'Grand estate overlooking spice plantations deep in the cardamom hills.' },

  // --- Alappuzha District ---
  { name: 'Alleppey Lagoon Haven', type: PropertyType.RESORT, city: 'Alappuzha', address: 'Punnamada, Alappuzha', desc: 'Spectacular backwater frontage close to the Nehru Trophy starting point.' },
  { name: 'Marari Beachfront Escape', type: PropertyType.RESORT, city: 'Alappuzha', address: 'Mararikulam North, Alappuzha', desc: 'Luxury beach resort complete with private shore hammocks and seafood grills.' },
  { name: 'Vembanad View Private Villa', type: PropertyType.VILLA, city: 'Alappuzha', address: 'Muhamma Waterfront, Alappuzha', desc: 'Stunning architectural retreat right beside India’s longest lake.' },
  { name: 'Kuttanad Paddy Meadows', type: PropertyType.HOMESTAY, city: 'Alappuzha', address: 'Ramankary, Kuttanad', desc: 'Authentic Kerala heritage home placed beneath sea-level rice fields.' },
  { name: 'Canal City Grand Hotel', type: PropertyType.HOTEL, city: 'Alappuzha', address: 'Alappuzha Town Center, Alappuzha', desc: 'Upscale city business hotel bridging Venice of the East canal systems.' },

  // --- Ernakulam District ---
  { name: 'Fort Kochi Colonial Hotel', type: PropertyType.HOTEL, city: 'Ernakulam', address: 'Fort Kochi Heritage Zone, Kochi', desc: 'Beautifully restored 18th-century Portuguese mansion converted into boutique hotel.' },
  { name: 'Cherai Lagoon Resort', type: PropertyType.RESORT, city: 'Ernakulam', address: 'Cherai Beach, Kochi', desc: 'Unique setting bounded by Arabian Sea on west and backwaters on east.' },
  { name: 'Marine Drive Executive Suites', type: PropertyType.HOTEL, city: 'Ernakulam', address: 'Marine Drive, Kochi Waterfront', desc: 'Skyline city living tailored for high-flying corporate partners.' },
  { name: 'Kumbalangi Heritage Homestay', type: PropertyType.HOMESTAY, city: 'Ernakulam', address: 'Kumbalangi Tourism Village, Kochi', desc: 'Award-winning eco-stay giving immersive Chinese fishing net experiences.' },
  { name: 'Athirappilly River Mist Villa', type: PropertyType.VILLA, city: 'Ernakulam', address: 'Kalady Riverbank, Ernakulam', desc: 'Secluded waterside sanctuary ideal for weekend spiritual getaways.' },

  // --- Thiruvananthapuram District ---
  { name: 'Kovalam Cliffside Resort', type: PropertyType.RESORT, city: 'Thiruvananthapuram', address: 'Light House Beach, Kovalam', desc: 'Spectacular world-famous crescent beach cliff-top resort views.' },
  { name: 'Varkala Cliff Edge Homestay', type: PropertyType.HOMESTAY, city: 'Thiruvananthapuram', address: 'North Cliff, Varkala', desc: 'A relaxed backpacker bohemian vibe place for yoga and sunset therapy.' },
  { name: 'Poovar Island Floating Villa', type: PropertyType.VILLA, city: 'Thiruvananthapuram', address: 'Poovar Backwaters, Trivandrum', desc: 'Incredible floating wooden cottages where the lake meets the sea.' },
  { name: 'Royal Capital City Hotel', type: PropertyType.HOTEL, city: 'Thiruvananthapuram', address: 'Thampanoor Central, Trivandrum', desc: 'Grand, luxury commercial hotel in the heart of the state capital.' },
];

async function seed() {
  console.log('🌱 Fetching Category Map...');
  const categories = await prisma.propertyCategory.findMany();
  
  console.log('👤 Finding default Property Owner user...');
  const owner = await prisma.user.findUnique({
    where: { email: 'owner@resort.com' },
  });

  if (!owner) {
    console.error('❌ ERROR: User with email "owner@resort.com" was not found. Run the main seed command first!');
    return;
  }

  console.log(`✅ User found: ${owner.firstName} ${owner.lastName} (ID: ${owner.id})`);
  console.log(`🌱 Commencing batch insert of ${propertiesDataset.length} properties...\n`);

  let count = 0;
  for (const pData of propertiesDataset) {
    const slug = generateSlug(pData.name);
    const catSlug = pData.type.toLowerCase();
    const category = categories.find(c => c.slug === catSlug) || categories.find(c => c.slug === 'other');
    
    const randCover = IMAGES[Math.floor(Math.random() * IMAGES.length)];

    // 1. Create property record
    const property = await prisma.property.create({
      data: {
        name: pData.name,
        slug: slug,
        description: pData.desc,
        type: pData.type,
        address: pData.address,
        city: pData.city, // District mapping
        state: 'Kerala',
        country: 'India',
        pincode: '6' + Math.floor(10000 + Math.random() * 90000).toString(),
        email: `bookings@${slug.substring(0, 12)}.com`,
        phone: '+919' + Math.floor(100000000 + Math.random() * 900000000).toString(),
        coverImage: randCover,
        images: [randCover, IMAGES[0], IMAGES[1]],
        amenities: ['High Speed WiFi', 'Air Conditioning', 'Housekeeping', 'Parking'],
        rating: 4.0 + Math.random(),
        reviewCount: Math.floor(Math.random() * 50),
        isActive: true,
        isVerified: true,
        status: 'APPROVED',
        ownerId: owner.id,
        categoryId: category?.id || null,
        baseCurrency: 'INR',
      }
    });

    console.log(`🏠 [${++count}/24] Created ${property.name} in ${property.city} (${property.address})`);

    // 2. Create generic room types with randomized price tiers
    const basePrice = Math.round((2500 + Math.random() * 5000) / 500) * 500;
    const suitePrice = basePrice * 2;

    const standardRt = await prisma.roomType.create({
      data: {
        name: 'Standard Heritage Room',
        description: 'Cozy air-conditioned space with modern ensuite and garden views.',
        basePrice: basePrice,
        extraAdultPrice: Math.round(basePrice * 0.25),
        extraChildPrice: Math.round(basePrice * 0.15),
        maxAdults: 2,
        maxChildren: 1,
        amenities: ['WiFi', 'Cable TV', 'Coffee Maker', 'Air Conditioning'],
        highlights: ['Garden View', 'King Sized Bed'],
        inclusions: ['Breakfast Included'],
        images: [IMAGES[Math.floor(Math.random() * IMAGES.length)]],
        propertyId: property.id,
      }
    });

    const suiteRt = await prisma.roomType.create({
      data: {
        name: 'Luxury Panoramic Suite',
        description: 'Expansive layout featuring top-floor panoramic balcony, jacuzzi bath, and premium minibar.',
        basePrice: suitePrice,
        extraAdultPrice: Math.round(suitePrice * 0.25),
        extraChildPrice: Math.round(suitePrice * 0.15),
        maxAdults: 3,
        maxChildren: 2,
        amenities: ['WiFi', 'Balcony', 'Jacuzzi Bath', 'Premium View'],
        highlights: ['Stunning Sunrise View', 'Spacious Lounge'],
        inclusions: ['All Meals Included', 'Free Airport Pick Up'],
        images: [IMAGES[Math.floor(Math.random() * IMAGES.length)]],
        propertyId: property.id,
      }
    });

    // 3. Spin up 4 rooms for inventory
    const rts = [standardRt, suiteRt];
    for (let r = 1; r <= 4; r++) {
      const type = rts[r % 2];
      await prisma.room.create({
        data: {
          roomNumber: `${type.name[0]}${r}0${r}`,
          floor: Math.ceil(r / 2),
          status: 'AVAILABLE',
          isEnabled: true,
          roomTypeId: type.id,
          propertyId: property.id,
        }
      });
    }
  }

  console.log('\n🎉 SEEDING COMPLETE! 24 Real-World Properties added with Room Types & Rooms!');
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
