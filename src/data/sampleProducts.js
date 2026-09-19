/**
 * SmartFarm Marketplace Sample Data
 * 
 * IMPORTANT:
 * These are realistic Indian agricultural demo sample listings.
 * They are local/static sample data and not connected to Firestore yet.
 * The `rating` and `reviewCount` fields represent aggregated rating information
 * for demo display and must NOT be written or synced into Firestore.
 * High-quality agricultural demo images are provided via reliable image URLs.
 */

export const sampleProducts = [
  // ==========================================
  // SEEDS (4 Samples)
  // ==========================================
  {
    id: 'sample-seed-1',
    ownerId: 'sample-user-1',
    ownerName: 'Ravi Kumar',
    category: 'seed',
    title: 'Paddy Seeds',
    variety: 'ADT 45',
    cropType: 'Rice',
    description: 'Quality paddy seeds suitable for cultivation in Tamil Nadu.',
    price: 85,
    quantity: 25,
    location: 'Thanjavur, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Ponni_paddy_seed.JPG/960px-Ponni_paddy_seed.JPG',
    ],
    status: 'active',
    rating: 4.6,
    reviewCount: 24,
    createdAt: '2026-09-10T08:00:00.000Z',
  },
  {
    id: 'sample-seed-2',
    ownerId: 'sample-user-2',
    ownerName: 'Suresh',
    category: 'seed',
    title: 'Tomato Seeds',
    variety: 'Hybrid Tomato',
    cropType: 'Tomato',
    description: 'Hybrid tomato seeds suitable for vegetable cultivation.',
    price: 120,
    quantity: 10,
    location: 'Coimbatore, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Starr-110215-0963-Solanum_lycopersicum-seed_packet-KiHana_Nursery_Kihei-Maui_%2824956930012%29.jpg/960px-Starr-110215-0963-Solanum_lycopersicum-seed_packet-KiHana_Nursery_Kihei-Maui_%2824956930012%29.jpg',
    ],
    status: 'active',
    rating: 4.8,
    reviewCount: 18,
    createdAt: '2026-09-11T09:30:00.000Z',
  },
  {
    id: 'sample-seed-3',
    ownerId: 'sample-user-3',
    ownerName: 'Priya Devi',
    category: 'seed',
    title: 'Groundnut Seeds',
    variety: 'TMV 7',
    cropType: 'Groundnut',
    description: 'Groundnut seeds suitable for seasonal cultivation.',
    price: 95,
    quantity: 40,
    location: 'Madurai, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Organic_peanut_seeds.jpg/960px-Organic_peanut_seeds.jpg',
    ],
    status: 'active',
    rating: 4.5,
    reviewCount: 15,
    createdAt: '2026-09-12T10:15:00.000Z',
  },
  {
    id: 'sample-seed-4',
    ownerId: 'sample-user-4',
    ownerName: 'Arun',
    category: 'seed',
    title: 'Chilli Seeds',
    variety: 'Hybrid Chilli',
    cropType: 'Chilli',
    description: 'Quality chilli seeds for commercial and small-scale farming.',
    price: 150,
    quantity: 15,
    location: 'Guntur, Andhra Pradesh',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Chili_pepper_cut.jpg/960px-Chili_pepper_cut.jpg',
    ],
    status: 'active',
    rating: 4.9,
    reviewCount: 31,
    createdAt: '2026-09-13T11:00:00.000Z',
  },

  // ==========================================
  // TOOLS (4 Samples)
  // ==========================================
  {
    id: 'sample-tool-1',
    ownerId: 'sample-user-5',
    ownerName: 'Murugan',
    category: 'tool',
    title: 'Power Tiller',
    equipmentType: 'Power Tiller',
    description: 'Well-maintained power tiller available for farm preparation.',
    condition: 'Good',
    pricePerHour: 450,
    pricePerDay: 3000,
    availability: 'Available',
    location: 'Salem, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Power_Tiller.jpg/960px-Power_Tiller.jpg',
    ],
    status: 'active',
    rating: 4.7,
    reviewCount: 42,
    createdAt: '2026-09-08T07:45:00.000Z',
  },
  {
    id: 'sample-tool-2',
    ownerId: 'sample-user-6',
    ownerName: 'Karthik',
    category: 'tool',
    title: 'Rotavator',
    equipmentType: 'Rotavator',
    description: 'Agricultural rotavator suitable for soil preparation.',
    condition: 'Excellent',
    pricePerHour: 500,
    pricePerDay: 3500,
    availability: 'Available',
    location: 'Erode, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Kuhn_EL201_-_rotavator_at_Bernard_Saunders_WD_2008_-_IMG_4072.jpg/960px-Kuhn_EL201_-_rotavator_at_Bernard_Saunders_WD_2008_-_IMG_4072.jpg',
    ],
    status: 'active',
    rating: 4.9,
    reviewCount: 29,
    createdAt: '2026-09-09T14:20:00.000Z',
  },
  {
    id: 'sample-tool-3',
    ownerId: 'sample-user-7',
    ownerName: 'Vijay',
    category: 'tool',
    title: 'Water Pump',
    equipmentType: 'Water Pump',
    description: 'Diesel water pump suitable for agricultural irrigation.',
    condition: 'Good',
    pricePerHour: 250,
    pricePerDay: 1600,
    availability: 'Available',
    location: 'Tiruchirappalli, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Irrigation_Pump_-_geograph.org.uk_-_831138.jpg/960px-Irrigation_Pump_-_geograph.org.uk_-_831138.jpg',
    ],
    status: 'active',
    rating: 4.4,
    reviewCount: 19,
    createdAt: '2026-09-11T16:00:00.000Z',
  },
  {
    id: 'sample-tool-4',
    ownerId: 'sample-user-8',
    ownerName: 'Ramesh',
    category: 'tool',
    title: 'Tractor',
    equipmentType: 'Tractor',
    description: 'Agricultural tractor available for field preparation and transport.',
    condition: 'Good',
    pricePerHour: 700,
    pricePerDay: 5000,
    availability: 'Available',
    location: 'Nashik, Maharashtra',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Mahindra_B275_DI_Tractor_at_Pogallapalli.jpg/960px-Mahindra_B275_DI_Tractor_at_Pogallapalli.jpg',
    ],
    status: 'active',
    rating: 4.8,
    reviewCount: 56,
    createdAt: '2026-09-12T12:10:00.000Z',
  },

  // ==========================================
  // CROPS (4 Samples)
  // ==========================================
  {
    id: 'sample-crop-1',
    ownerId: 'sample-user-9',
    ownerName: 'Selvam',
    category: 'crop',
    title: 'Fresh Paddy',
    quantity: 500,
    quality: 'Grade A',
    price: 28,
    harvestDate: '2026-09-10',
    description: 'Freshly harvested paddy from a local farm.',
    location: 'Thanjavur, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Indian_male_framer_drying_paddy_in_Raichur%2C_Karnataka%2C_India.jpg/960px-Indian_male_framer_drying_paddy_in_Raichur%2C_Karnataka%2C_India.jpg',
    ],
    status: 'active',
    rating: 4.7,
    reviewCount: 38,
    createdAt: '2026-09-10T15:30:00.000Z',
  },
  {
    id: 'sample-crop-2',
    ownerId: 'sample-user-10',
    ownerName: 'Lakshmi',
    category: 'crop',
    title: 'Fresh Tomatoes',
    quantity: 250,
    quality: 'Premium',
    price: 35,
    harvestDate: '2026-09-12',
    description: 'Fresh farm-grown tomatoes.',
    location: 'Krishnagiri, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    rating: 4.6,
    reviewCount: 27,
    createdAt: '2026-09-12T08:00:00.000Z',
  },
  {
    id: 'sample-crop-3',
    ownerId: 'sample-user-11',
    ownerName: 'Manoj',
    category: 'crop',
    title: 'Groundnut',
    quantity: 300,
    quality: 'Grade A',
    price: 75,
    harvestDate: '2026-09-08',
    description: 'Quality groundnut harvested from a local farm.',
    location: 'Villupuram, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Dried_groundnuts.jpg/960px-Dried_groundnuts.jpg',
    ],
    status: 'active',
    rating: 4.5,
    reviewCount: 21,
    createdAt: '2026-09-08T11:45:00.000Z',
  },
  {
    id: 'sample-crop-4',
    ownerId: 'sample-user-12',
    ownerName: 'Deepak',
    category: 'crop',
    title: 'Fresh Chillies',
    quantity: 150,
    quality: 'Premium',
    price: 90,
    harvestDate: '2026-09-13',
    description: 'Freshly harvested quality chillies.',
    location: 'Guntur, Andhra Pradesh',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Green_chili_peppers.jpg/960px-Green_chili_peppers.jpg',
    ],
    status: 'active',
    rating: 4.9,
    reviewCount: 35,
    createdAt: '2026-09-13T09:15:00.000Z',
  },
];

/**
 * Retrieve a sample product by its unique identifier.
 * Facilitates transition to Firestore getProductById in the future.
 * 
 * @param {string} id 
 * @returns {Object|null}
 */
export function getSampleProductById(id) {
  return sampleProducts.find((item) => item.id === id) || null;
}
