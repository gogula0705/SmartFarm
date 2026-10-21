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
export async function createOrder({ productId, quantity, buyerId, buyerName, clientOrderId }) {
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
      // 1. Prepare Order Document Reference (supports idempotent clientOrderId)
      const orderDocRef = clientOrderId
        ? doc(db, ORDERS_COLLECTION, clientOrderId)
        : doc(collection(db, ORDERS_COLLECTION));

      if (clientOrderId) {
        const existingOrderSnap = await transaction.get(orderDocRef);
        if (existingOrderSnap.exists()) {
          // Idempotent return: order already processed
          return { id: existingOrderSnap.id, ...existingOrderSnap.data() };
        }
      }

      // 2. Fetch product document
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

      const currentStock = Math.max(0, Number(product.quantity) || 0);

      // Check stock availability
      if (currentStock <= 0) {
        throw new Error('This product is currently out of stock.');
      }

      if (currentStock < requestedQty) {
        const unit = category === 'crop' ? 'kg' : 'units';
        throw new Error(`Insufficient quantity available. Only ${currentStock} ${unit} remaining.`);
      }

      const remainingStock = currentStock - requestedQty;

      // 3. Update product quantity atomically (serializable isolation prevents overselling)
      transaction.update(productRef, {
        quantity: remainingStock,
        lastOrderId: orderDocRef.id,
        updatedAt: serverTimestamp(),
      });

      // 4. Prepare Order Document Payload
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
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        stockDeducted: true,
        stockRestored: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(orderDocRef, orderPayload);

      return {
        ...orderPayload,
        createdAt: new Date().toISOString(),
      };
    });

    return newOrder;
  } catch (error) {
    console.error('Failed to create order in Firestore:', error);
    // Preserve custom validation messages or return user-friendly error
    if (
      error.message?.includes('Insufficient quantity available') ||
      error.message?.includes('out of stock') ||
      error.message?.includes('You cannot purchase your own product') ||
      error.message?.includes('Product not found') ||
      error.message?.includes('valid quantity')
    ) {
      throw error;
    }
    throw new Error(error.message || 'Unable to place order. Please try again.');
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

/**
 * Cancel a pending purchase order and atomically restore deducted stock to the product document.
 *
 * Enforces:
 * 1. Caller must be the buyer.
 * 2. Order status must be 'pending'.
 * 3. Atomic stock restoration in products/{productId}.
 * 4. Single-restoration guard (stockRestored: true) preventing duplicate restoration.
 *
 * @param {string} orderId - Document ID of the order to cancel
 * @param {string} currentUserId - Firebase Auth UID of the cancelling buyer
 * @returns {Promise<Object>} Updated order document
 */
export async function cancelOrder(orderId, currentUserId) {
  if (!db || !orderId) {
    throw new Error('Invalid order ID or database instance.');
  }

  if (!currentUserId) {
    throw new Error('Authentication required: You must be logged in to cancel an order.');
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found.');
      }

      const order = orderDoc.data();

      // Authorization Check: buyer can cancel pending orders; seller can cancel pending or confirmed orders
      const isBuyer = order.buyerId === currentUserId;
      const isSeller = order.sellerId === currentUserId;

      if (!isBuyer && !isSeller) {
        throw new Error('Permission denied: You can only cancel orders you are involved with.');
      }

      const currentStatus = (order.status || '').toLowerCase();
      if (currentStatus === 'cancelled') {
        throw new Error('This order has already been cancelled.');
      }

      if (currentStatus === 'completed') {
        throw new Error('Completed orders cannot be cancelled.');
      }

      if (isBuyer && currentStatus !== 'pending') {
        throw new Error(`Buyers can only cancel pending orders (current status: ${order.status}).`);
      }

      if (isSeller && currentStatus !== 'pending' && currentStatus !== 'confirmed') {
        throw new Error(`Sellers can only cancel pending or confirmed orders (current status: ${order.status}).`);
      }

      // Check if stock was previously deducted and not yet restored
      const shouldRestoreStock = order.stockDeducted !== false && order.stockRestored !== true;

      if (shouldRestoreStock && order.productId && order.quantity) {
        const productRef = doc(db, PRODUCTS_COLLECTION, order.productId);
        const productDoc = await transaction.get(productRef);

        if (productDoc.exists()) {
          const currentStock = Math.max(0, Number(productDoc.data().quantity) || 0);
          const returnQty = Math.max(0, Number(order.quantity) || 0);
          const restoredStock = currentStock + returnQty;

          // Restore product stock atomically
          transaction.update(productRef, {
            quantity: restoredStock,
            lastOrderId: orderId,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Update Order Status to cancelled with audit fields
      transaction.update(orderRef, {
        status: 'cancelled',
        stockRestored: true,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...order,
        status: 'cancelled',
        stockRestored: true,
      };
    });

    return result;
  } catch (error) {
    console.error('Failed to cancel order:', error);
    throw error;
  }
}
