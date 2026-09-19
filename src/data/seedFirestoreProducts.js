/**
 * SmartFarm Firestore Products Seeding Utility
 * 
 * Inserts 12 realistic Indian agricultural demo sample products directly
 * into the Cloud Firestore `products` collection with duplicate protection.
 * 
 * Requirements:
 * - Direct Firestore document insertion (collection: 'products')
 * - Duplicate protection: skips items matching (ownerId == 'demo-owner-001' && title == item.title)
 * - Zero Firebase Storage usage (uses verified public Unsplash URLs)
 * - Zero fake accounts, orders, bookings, or reviews (rating: 0, reviewCount: 0)
 * - Preserves existing user products
 * - NOT run automatically at app startup; intended for deliberate one-time execution.
 * 
 * Usage:
 *   node src/data/seedFirestoreProducts.js
 *   OR
 *   npm run seed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// --- 1. Load Firebase Environment Variables ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Error: Missing Firebase credentials in .env file.');
  process.exit(1);
}

// Initialize standalone Firebase app instance for the seeding script
const app = initializeApp(firebaseConfig, 'smartfarm-seeder');
const db = getFirestore(app);

// --- 2. Target 12 Demo Products Data ---
export const DEMO_OWNER_ID = 'demo-owner-001';
export const DEMO_OWNER_NAME = 'SmartFarm Demo Farmer';

export const sampleProductsToSeed = [
  // ==========================================
  // SEEDS (4 Items)
  // ==========================================
  {
    category: 'seed',
    title: 'Paddy Seeds',
    variety: 'ADT 45',
    cropType: 'Rice',
    description: 'High-quality paddy seeds suitable for cultivation in Tamil Nadu.',
    price: 85,
    quantity: 25,
    location: 'Thanjavur, Thanjavur, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Ponni_paddy_seed.JPG/960px-Ponni_paddy_seed.JPG',
    ],
  },
  {
    category: 'seed',
    title: 'Tomato Seeds',
    variety: 'Hybrid Tomato',
    cropType: 'Tomato',
    description: 'Hybrid tomato seeds suitable for commercial and small-scale farming.',
    price: 120,
    quantity: 40,
    location: 'Coimbatore, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Starr-110215-0963-Solanum_lycopersicum-seed_packet-KiHana_Nursery_Kihei-Maui_%2824956930012%29.jpg/960px-Starr-110215-0963-Solanum_lycopersicum-seed_packet-KiHana_Nursery_Kihei-Maui_%2824956930012%29.jpg',
    ],
  },
  {
    category: 'seed',
    title: 'Groundnut Seeds',
    variety: 'TMV 7',
    cropType: 'Groundnut',
    description: 'Quality groundnut seeds suitable for dryland cultivation.',
    price: 95,
    quantity: 30,
    location: 'Madurai, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Organic_peanut_seeds.jpg/960px-Organic_peanut_seeds.jpg',
    ],
  },
  {
    category: 'seed',
    title: 'Chilli Seeds',
    variety: 'Hybrid Chilli',
    cropType: 'Chilli',
    description: 'High-quality chilli seeds suitable for warm agricultural regions.',
    price: 150,
    quantity: 20,
    location: 'Guntur, Andhra Pradesh',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Chili_pepper_cut.jpg/960px-Chili_pepper_cut.jpg',
    ],
  },

  // ==========================================
  // TOOLS (4 Items)
  // ==========================================
  {
    category: 'tool',
    title: 'Power Tiller',
    equipmentType: 'Power Tiller',
    condition: 'Good',
    pricePerHour: 450,
    pricePerDay: 3000,
    availability: 'Available',
    description: 'Well-maintained power tiller suitable for field preparation.',
    location: 'Salem, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Power_Tiller.jpg/960px-Power_Tiller.jpg',
    ],
  },
  {
    category: 'tool',
    title: 'Rotavator',
    equipmentType: 'Rotavator',
    condition: 'Excellent',
    pricePerHour: 500,
    pricePerDay: 3500,
    availability: 'Available',
    description: 'Heavy-duty rotavator suitable for soil preparation and field operations.',
    location: 'Erode, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Kuhn_EL201_-_rotavator_at_Bernard_Saunders_WD_2008_-_IMG_4072.jpg/960px-Kuhn_EL201_-_rotavator_at_Bernard_Saunders_WD_2008_-_IMG_4072.jpg',
    ],
  },
  {
    category: 'tool',
    title: 'Water Pump',
    equipmentType: 'Water Pump',
    condition: 'Good',
    pricePerHour: 250,
    pricePerDay: 1600,
    availability: 'Available',
    description: 'Reliable water pump suitable for irrigation and farm water management.',
    location: 'Tiruchirappalli, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Irrigation_Pump_-_geograph.org.uk_-_831138.jpg/960px-Irrigation_Pump_-_geograph.org.uk_-_831138.jpg',
    ],
  },
  {
    category: 'tool',
    title: 'Tractor',
    equipmentType: 'Tractor',
    condition: 'Good',
    pricePerHour: 700,
    pricePerDay: 5000,
    availability: 'Available',
    description: 'Farm tractor available for ploughing, transportation, and other agricultural work.',
    location: 'Nashik, Maharashtra',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Mahindra_B275_DI_Tractor_at_Pogallapalli.jpg/960px-Mahindra_B275_DI_Tractor_at_Pogallapalli.jpg',
    ],
  },

  // ==========================================
  // CROPS (4 Items)
  // ==========================================
  {
    category: 'crop',
    title: 'Fresh Paddy',
    quantity: 500,
    quality: 'Grade A',
    price: 28,
    harvestDate: '2026-09-15',
    description: 'Freshly harvested paddy suitable for rice mills and agricultural buyers.',
    location: 'Thanjavur, Thanjavur, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Indian_male_framer_drying_paddy_in_Raichur%2C_Karnataka%2C_India.jpg/960px-Indian_male_framer_drying_paddy_in_Raichur%2C_Karnataka%2C_India.jpg',
    ],
  },
  {
    category: 'crop',
    title: 'Fresh Tomatoes',
    quantity: 250,
    quality: 'Grade A',
    price: 35,
    harvestDate: '2026-09-16',
    description: 'Fresh farm-grown tomatoes available for bulk purchase.',
    location: 'Krishnagiri, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    category: 'crop',
    title: 'Groundnut',
    quantity: 300,
    quality: 'Grade A',
    price: 75,
    harvestDate: '2026-09-12',
    description: 'Quality groundnut harvested from local farms.',
    location: 'Villupuram, Tamil Nadu',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Dried_groundnuts.jpg/960px-Dried_groundnuts.jpg',
    ],
  },
  {
    category: 'crop',
    title: 'Fresh Chillies',
    quantity: 150,
    quality: 'Grade A',
    price: 90,
    harvestDate: '2026-09-17',
    description: 'Fresh green chillies suitable for wholesale and retail buyers.',
    location: 'Guntur, Andhra Pradesh',
    images: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Green_chili_peppers.jpg/960px-Green_chili_peppers.jpg',
    ],
  },
];

/**
 * Executes the seed operation against Cloud Firestore.
 */
export async function seedProducts() {
  console.log('====================================================');
  console.log('🌱 SmartFarm Cloud Firestore Seeding Utility');
  console.log(`📡 Project ID: ${firebaseConfig.projectId}`);
  console.log(`👤 Demo Owner: ${DEMO_OWNER_NAME} (${DEMO_OWNER_ID})`);
  console.log(`📦 Target Products: ${sampleProductsToSeed.length}`);
  console.log('====================================================\n');

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of sampleProductsToSeed) {
    try {
      // Duplicate protection: check if a demo product with this title already exists
      const q = query(
        collection(db, 'products'),
        where('ownerId', '==', DEMO_OWNER_ID),
        where('title', '==', item.title)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        console.log(`⏭️  [SKIP] "${item.title}" already exists (ID: ${existingDoc.id})`);
        skippedCount++;
        continue;
      }

      // Prepare payload adhering to SmartFarm product schema
      const payload = {
        ...item,
        ownerId: DEMO_OWNER_ID,
        ownerName: DEMO_OWNER_NAME,
        status: 'active',
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'products'), payload);
      console.log(`✅ [CREATED] [${item.category.toUpperCase()}] "${item.title}" (ID: ${docRef.id})`);
      addedCount++;
    } catch (err) {
      console.error(`❌ [ERROR] Failed to seed "${item.title}":`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('📊 Seeding Summary:');
  console.log(`   - Added:   ${addedCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Total:   ${sampleProductsToSeed.length}`);
  console.log('====================================================\n');

  return { addedCount, skippedCount };
}

/**
 * Updates demo product image URLs in Cloud Firestore for documents owned by demo-owner-001.
 * Only updates the `images` field and `updatedAt` timestamp.
 */
export async function updateFirestoreDemoImages() {
  console.log('====================================================');
  console.log('🖼️  SmartFarm Cloud Firestore Demo Images Updater');
  console.log(`📡 Project ID: ${firebaseConfig.projectId}`);
  console.log(`👤 Demo Owner: ${DEMO_OWNER_NAME} (${DEMO_OWNER_ID})`);
  console.log(`📦 Products to Update: ${sampleProductsToSeed.length}`);
  console.log('====================================================\n');

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const item of sampleProductsToSeed) {
    try {
      const q = query(
        collection(db, 'products'),
        where('ownerId', '==', DEMO_OWNER_ID),
        where('title', '==', item.title)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(`⚠️  [NOT FOUND] "${item.title}"`);
        notFoundCount++;
        continue;
      }

      for (const docSnap of snapshot.docs) {
        const docRef = doc(db, 'products', docSnap.id);
        await updateDoc(docRef, {
          images: item.images,
          updatedAt: serverTimestamp(),
        });
        console.log(`✅ [UPDATED] [${item.category.toUpperCase()}] "${item.title}" (ID: ${docSnap.id})`);
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] Failed to update "${item.title}":`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('📊 Update Summary:');
  console.log(`   - Updated:   ${updatedCount}`);
  console.log(`   - Not Found: ${notFoundCount}`);
  console.log(`   - Total:     ${sampleProductsToSeed.length}`);
  console.log('====================================================\n');

  return { updatedCount, notFoundCount };
}

// Auto-run if executed directly from CLI
const isCLI = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isCLI) {
  const isUpdateMode = process.argv.includes('--update-images') || process.argv.includes('-u');
  const action = isUpdateMode ? updateFirestoreDemoImages() : seedProducts();

  action
    .then(() => {
      console.log('✨ Operation finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
