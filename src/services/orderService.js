import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';

/**
 * Place a real purchase order in Cloud Firestore for Seeds or Crops using an atomic transaction.
 * 
 * Atomically:
 * 1. Reads the product document from `products/{productId}`
 * 2. Validates product status is active and category is 'seed' or 'crop'
 * 3. Validates buyer is not the seller
 * 4. Validates requested quantity is a positive number <= available stock
 * 5. Decrements the product's quantity in `products/{productId}`
 * 6. Creates a new order document in `orders/{orderId}` capturing current price, quantity, and parties
 * 
 * @param {Object} params
 * @param {string} params.productId - Firestore product document ID
 * @param {number|string} params.quantity - Number of units/kg to buy
 * @param {string} params.buyerId - Firebase Auth UID of the buyer
 * @param {string} [params.buyerName] - Display name of the buyer
 * @returns {Promise<Object>} Created order document data including orderId
 */
export async function createOrder({ productId, quantity, buyerId, buyerName }) {
  if (!db) {
    throw new Error('Firestore is not initialized. Check your credentials in .env.');
  }

  if (!buyerId) {
    throw new Error('Authentication required: You must be logged in to place an order.');
  }

  if (!productId) {
    throw new Error('Product ID is required.');
  }

  const requestedQty = Number(quantity);
  if (isNaN(requestedQty) || requestedQty <= 0) {
    throw new Error('Please enter a valid quantity greater than 0.');
  }

  try {
    const newOrder = await runTransaction(db, async (transaction) => {
      const productRef = doc(db, PRODUCTS_COLLECTION, productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error('Product not found or has been removed.');
      }

      const product = productDoc.data();

      // Ensure product is active
      if (product.status && product.status !== 'active') {
        throw new Error('This product is no longer active for purchase.');
      }

      // BUY workflow only applies to Seeds and Crops
      const category = (product.category || '').toLowerCase();
      if (category !== 'seed' && category !== 'crop') {
        throw new Error('Only Seeds and Crops are available for direct purchase.');
      }

      // Seller cannot buy their own product
      if (product.ownerId === buyerId) {
        throw new Error('You cannot purchase your own product.');
      }

      const currentStock = Number(product.quantity) || 0;

      // Check stock availability
      if (currentStock < requestedQty) {
        throw new Error('Insufficient quantity available.');
      }

      const remainingStock = currentStock - requestedQty;

      // 1. Update product quantity atomically
      transaction.update(productRef, {
        quantity: remainingStock,
        updatedAt: serverTimestamp(),
      });

      // 2. Prepare Order Document
      const orderDocRef = doc(collection(db, ORDERS_COLLECTION));
      const unitPrice = Number(product.price) || 0;
      const totalPrice = unitPrice * requestedQty;

      const orderPayload = {
        orderId: orderDocRef.id,
        buyerId,
        buyerName: (buyerName || 'SmartFarm Member').trim(),
        sellerId: product.ownerId || '',
        sellerName: (product.ownerName || 'SmartFarm Farmer').trim(),

        productId,
        productTitle: (product.title || '').trim(),
        category,

        quantity: requestedQty,
        unitPrice,
        totalPrice,

        productImage: Array.isArray(product.images) && product.images[0] ? product.images[0] : '',
        location: product.location || '',

        status: 'pending',

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(orderDocRef, orderPayload);

      return {
        ...orderPayload,
        // Approximate client-side timestamp for immediate display before refetch
        createdAt: new Date().toISOString(),
      };
    });

    return newOrder;
  } catch (error) {
    console.error('Failed to create order in Firestore:', error);
    // Preserve custom validation messages or return user-friendly error
    if (
      error.message?.includes('Insufficient quantity available') ||
      error.message?.includes('You cannot purchase your own product') ||
      error.message?.includes('Product not found') ||
      error.message?.includes('valid quantity')
    ) {
      throw error;
    }
    throw new Error('Unable to place order. Please try again.');
  }
}

/**
 * Fetch all orders placed by a specific buyer.
 * Orders are loaded with `buyerId == userId` and sorted newest first.
 * 
 * @param {string} userId - Firebase Auth UID of the buyer
 * @returns {Promise<Array<Object>>} List of orders
 */
export async function getUserOrders(userId) {
  if (!db || !userId) return [];

  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('buyerId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Client-side sort descending by createdAt to prevent requiring compound Firestore indexes
    orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return orders;
  } catch (error) {
    console.error('Error fetching user orders from Firestore:', error);
    throw new Error('Failed to load your orders: ' + (error.message || 'Database error'));
  }
}

/**
 * Retrieve a single order by its document ID.
 * Optionally verifies buyer or seller access.
 * 
 * @param {string} orderId
 * @param {string} [userId]
 * @returns {Promise<Object|null>}
 */
export async function getOrderById(orderId, userId) {
  if (!db || !orderId) return null;

  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    const docSnap = await getDoc(orderDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const orderData = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    if (userId && orderData.buyerId !== userId && orderData.sellerId !== userId) {
      throw new Error('Permission denied: You cannot view this order.');
    }

    return orderData;
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    throw error;
  }
}

/**
 * Update the status of an order (e.g. 'pending', 'confirmed', 'completed', 'cancelled').
 * 
 * @param {string} orderId
 * @param {string} status
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(orderId, status) {
  if (!db || !orderId) {
    throw new Error('Invalid order ID or database instance.');
  }

  const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(orderDocRef, {
    status: String(status).trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}
