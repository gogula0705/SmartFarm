import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const PRODUCTS_COLLECTION = 'products';

/**
 * Validate and clean product data before saving to Firestore.
 * Ensures consistent field types and avoids saving undefined values.
 */
function sanitizeProductPayload(data, category) {
  const common = {
    category,
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    location: (data.location || '').trim(),
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    status: data.status === 'inactive' ? 'inactive' : 'active',
  };

  if (category === 'seed') {
    return {
      ...common,
      variety: (data.variety || '').trim(),
      cropType: (data.cropType || '').trim(),
      price: Number(data.price) || 0,
      quantity: typeof data.quantity === 'number' ? data.quantity : (data.quantity || '').toString().trim(),
    };
  }

  if (category === 'tool') {
    return {
      ...common,
      equipmentType: (data.equipmentType || '').trim(),
      condition: (data.condition || 'Good').trim(),
      pricePerHour: Number(data.pricePerHour) || 0,
      pricePerDay: Number(data.pricePerDay) || 0,
      availability: (data.availability || 'Available').trim(),
    };
  }

  if (category === 'crop') {
    return {
      ...common,
      quantity: typeof data.quantity === 'number' ? data.quantity : (data.quantity || '').toString().trim(),
      quality: (data.quality || 'Grade A').trim(),
      price: Number(data.price) || 0,
      harvestDate: (data.harvestDate || '').trim(),
    };
  }

  return common;
}

/**
 * Create a new product in the Firestore `products` collection.
 * 
 * @param {Object} productData
 * @param {string} ownerId
 * @param {string} ownerName
 * @returns {Promise<string>} Document ID of created product
 */
export async function createProduct(productData, ownerId, ownerName) {
  if (!db) {
    throw new Error('Firestore is not initialized. Check your credentials in .env.');
  }

  if (!ownerId) {
    throw new Error('Owner ID is required to create a product.');
  }

  const category = (productData.category || '').toLowerCase();
  if (!['seed', 'tool', 'crop'].includes(category)) {
    throw new Error('Invalid product category. Must be "seed", "tool", or "crop".');
  }

  const sanitized = sanitizeProductPayload(productData, category);

  const payload = {
    ...sanitized,
    ownerId,
    ownerName: (ownerName || 'SmartFarm Member').trim(),
    rating: typeof productData.rating === 'number' ? productData.rating : 0,
    reviewCount: typeof productData.reviewCount === 'number' ? productData.reviewCount : 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), payload);
  return docRef.id;
}

/**
 * Fetch all products owned by a specific user.
 * 
 * @param {string} userId
 * @returns {Promise<Array<Object>>} List of products sorted by newest first
 */
export async function getUserProducts(userId) {
  if (!db || !userId) return [];

  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('ownerId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Sort client-side to prevent Firestore compound index errors on new projects
    products.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return products;
  } catch (error) {
    console.error('Error fetching user products:', error);
    throw new Error('Failed to load your products: ' + (error.message || 'Database error'));
  }
}

/**
 * Retrieve a single product by its Firestore Document ID.
 * 
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
export async function getProductById(productId) {
  if (!db || !productId) return null;

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw new Error('Failed to retrieve product: ' + (error.message || 'Database error'));
  }
}

/**
 * Update an existing product document in Firestore.
 * Verifies that the updating user is the actual owner.
 * 
 * @param {string} productId
 * @param {Object} productData
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function updateProduct(productId, productData, currentUserId) {
  if (!db || !productId) {
    throw new Error('Invalid product ID or database instance.');
  }

  // Security Check: Verify ownership before performing update
  const existingProduct = await getProductById(productId);
  if (!existingProduct) {
    throw new Error('Product not found.');
  }

  if (existingProduct.ownerId !== currentUserId) {
    throw new Error('Permission denied: You can only edit your own products.');
  }

  const category = (productData.category || existingProduct.category || '').toLowerCase();
  const sanitized = sanitizeProductPayload(productData, category);

  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(docRef, {
    ...sanitized,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a product document from Firestore.
 * Verifies that the deleting user is the actual owner.
 * 
 * @param {string} productId
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId, currentUserId) {
  if (!db || !productId) {
    throw new Error('Invalid product ID or database instance.');
  }

  // Security Check: Verify ownership before performing delete
  const existingProduct = await getProductById(productId);
  if (!existingProduct) {
    throw new Error('Product not found.');
  }

  if (existingProduct.ownerId !== currentUserId) {
    throw new Error('Permission denied: You can only delete your own products.');
  }

  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}

/**
 * Update aggregated product rating in Firestore.
 * Used when a review is created, updated, or deleted.
 * 
 * @param {string} productId
 * @param {number} rating - Average rating (e.g. 4.6)
 * @param {number} reviewCount - Total review count
 * @returns {Promise<void>}
 */
export async function updateProductRating(productId, rating, reviewCount) {
  if (!db || !productId) {
    throw new Error('Invalid product ID or database instance.');
  }

  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(docRef, {
    rating: Number(rating) || 0,
    reviewCount: Number(reviewCount) || 0,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update a product's listing status (active/inactive).
 * Verifies ownership before updating.
 * 
 * @param {string} productId
 * @param {string} status - 'active' or 'inactive'
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function updateProductStatus(productId, status, currentUserId) {
  if (!db || !productId) {
    throw new Error('Invalid product ID or database instance.');
  }

  const existingProduct = await getProductById(productId);
  if (!existingProduct) {
    throw new Error('Product not found.');
  }

  if (existingProduct.ownerId !== currentUserId) {
    throw new Error('Permission denied: You can only update your own products.');
  }

  const validStatus = status === 'inactive' ? 'inactive' : 'active';
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(docRef, {
    status: validStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch all active products for the Marketplace from Firestore.
 * 
 * @returns {Promise<Array<Object>>} List of active products sorted by newest first
 */
export async function getMarketplaceProducts() {
  if (!db) return [];

  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Sort client-side to prevent Firestore compound index requirement
    products.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return products;
  } catch (error) {
    console.error('Error fetching marketplace products:', error);
    throw new Error('Failed to load marketplace products: ' + (error.message || 'Database error'));
  }
}
