/**
 * SmartFarm Review & Rating Service (Cloud Firestore)
 * 
 * IMPORTANT:
 * - Product ratings & reviews are stored strictly in Cloud Firestore (`reviews` collection),
 *   NEVER in Firebase Storage.
 * - Reviews require a qualifying completed transaction (Order for Seeds/Crops, Booking for Tools).
 * - Exactly one review allowed per transaction.
 * - Ratings must be integers between 1 and 5.
 * - Recalculates product aggregate rating and reviewCount on every create/update/delete.
 */

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
import { updateProductRating } from './productService.js';

const REVIEWS_COLLECTION = 'reviews';
const ORDERS_COLLECTION = 'orders';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Validate and sanitize rating input.
 * Ensures rating is an integer between 1 and 5.
 */
function sanitizeRating(rating) {
  const num = Number(rating);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new Error('Rating must be an integer between 1 and 5.');
  }
  return num;
}

/**
 * Recalculate and update the aggregated rating and reviewCount for a product.
 * Formula: sum of all ratings / number of reviews (rounded to 1 decimal place).
 * 
 * @param {string} productId
 * @returns {Promise<{ rating: number, reviewCount: number }>}
 */
export async function recalculateProductRating(productId) {
  if (!db || !productId) {
    throw new Error('Invalid product ID or Firestore database instance.');
  }

  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where('productId', '==', productId)
  );

  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map((d) => d.data());
  const reviewCount = reviews.length;

  let averageRating = 0;
  if (reviewCount > 0) {
    const totalScore = reviews.reduce((sum, rev) => sum + (Number(rev.rating) || 0), 0);
    averageRating = Math.round((totalScore / reviewCount) * 10) / 10;
  }

  // Update aggregated fields in products/{productId}
  await updateProductRating(productId, averageRating, reviewCount);

  return { rating: averageRating, reviewCount };
}

/**
 * Create a new review in Firestore and update product rating aggregation.
 * 
 * Enforces:
 * 1. Authentication & input validation
 * 2. Integer rating from 1 to 5
 * 3. Qualifying completed transaction (Order or Booking)
 * 4. Prevention of duplicate review for the same transaction
 * 
 * @param {Object} reviewData
 * @param {string} reviewData.productId - ID of reviewed product
 * @param {string} reviewData.reviewerId - Firebase Auth UID of reviewer
 * @param {string} reviewData.reviewerName - Profile name of reviewer
 * @param {string} reviewData.transactionType - "order" or "booking"
 * @param {string} reviewData.transactionId - Corresponding orderId or bookingId
 * @param {number} reviewData.rating - Integer score from 1 to 5
 * @param {string} [reviewData.comment] - Optional textual review
 * @returns {Promise<string>} Created review document ID
 */
export async function createReview({
  productId,
  reviewerId,
  reviewerName,
  transactionType,
  transactionId,
  rating,
  comment = '',
}) {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  if (!reviewerId || typeof reviewerId !== 'string') {
    throw new Error('Authentication required: You must be logged in to leave a review.');
  }

  if (!productId || typeof productId !== 'string') {
    throw new Error('Valid product ID is required.');
  }

  if (!transactionType || (transactionType !== 'order' && transactionType !== 'booking')) {
    throw new Error('Valid transaction type ("order" or "booking") is required.');
  }

  if (!transactionId || typeof transactionId !== 'string') {
    throw new Error('Valid transaction ID is required.');
  }

  const validRating = sanitizeRating(rating);
  const trimmedProductId = productId.trim();
  const trimmedTransactionId = transactionId.trim();

  // 1. Verify transaction eligibility in Firestore
  if (transactionType === 'order') {
    const orderRef = doc(db, ORDERS_COLLECTION, trimmedTransactionId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Transaction record not found.');
    }

    const orderData = orderSnap.data();
    if (orderData.buyerId !== reviewerId) {
      throw new Error('Permission denied: You can only review your own purchase orders.');
    }
    if (orderData.productId !== trimmedProductId) {
      throw new Error('Transaction does not match the product being reviewed.');
    }
    if ((orderData.status || '').toLowerCase() !== 'completed') {
      throw new Error('Only completed orders can be reviewed.');
    }
  } else if (transactionType === 'booking') {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, trimmedTransactionId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error('Transaction record not found.');
    }

    const bookingData = bookingSnap.data();
    if (bookingData.renterId !== reviewerId) {
      throw new Error('Permission denied: You can only review your own equipment bookings.');
    }
    if (bookingData.productId !== trimmedProductId) {
      throw new Error('Transaction does not match the equipment being reviewed.');
    }
    if ((bookingData.status || '').toLowerCase() !== 'completed') {
      throw new Error('Only completed equipment rentals can be reviewed.');
    }
  }

  // 2. Enforce one review per transaction
  const duplicateQuery = query(
    collection(db, REVIEWS_COLLECTION),
    where('transactionId', '==', trimmedTransactionId)
  );
  const duplicateSnap = await getDocs(duplicateQuery);
  const existingReview = duplicateSnap.docs.find(
    (d) => d.data().reviewerId === reviewerId
  );

  if (existingReview) {
    throw new Error('You have already reviewed this transaction.');
  }

  // 3. Save new review document
  const payload = {
    productId: trimmedProductId,
    reviewerId: reviewerId.trim(),
    reviewerName: (reviewerName || 'SmartFarm Member').trim(),
    transactionType,
    transactionId: trimmedTransactionId,
    rating: validRating,
    comment: (comment || '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), payload);

  // 4. Recalculate product aggregate
  await recalculateProductRating(trimmedProductId);

  return docRef.id;
}

/**
 * Fetch all reviews for a specific product.
 * Sorted client-side newest first.
 * 
 * @param {string} productId
 * @returns {Promise<Array<Object>>}
 */
export async function getProductReviews(productId) {
  if (!db || !productId) return [];

  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('productId', '==', productId)
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Client-side sort by newest
    reviews.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return reviews;
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    throw new Error('Failed to load reviews: ' + (error.message || 'Database error'));
  }
}

/**
 * Fetch all reviews written by a specific user.
 * 
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserReviews(userId) {
  if (!db || !userId) return [];

  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('reviewerId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    reviews.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return reviews;
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    throw new Error('Failed to load user reviews: ' + (error.message || 'Database error'));
  }
}

/**
 * Update an existing review. Verifies that caller is the reviewer.
 * Only rating and comment may be updated; immutable fields remain intact.
 * 
 * @param {string} reviewId
 * @param {Object} updateData
 * @param {number} [updateData.rating] - Integer from 1 to 5
 * @param {string} [updateData.comment]
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function updateReview(reviewId, updateData, currentUserId) {
  if (!db || !reviewId) {
    throw new Error('Invalid review ID.');
  }

  if (!currentUserId) {
    throw new Error('Authentication required.');
  }

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Review not found.');
  }

  const existing = snap.data();
  if (existing.reviewerId !== currentUserId) {
    throw new Error('Permission denied: You can only edit your own reviews.');
  }

  const payload = {
    updatedAt: serverTimestamp(),
  };

  if (updateData.rating !== undefined) {
    payload.rating = sanitizeRating(updateData.rating);
  }

  if (updateData.comment !== undefined) {
    payload.comment = String(updateData.comment).trim();
  }

  await updateDoc(docRef, payload);

  // Recalculate product aggregate
  await recalculateProductRating(existing.productId);
}

/**
 * Delete an existing review. Verifies that caller is the reviewer.
 * 
 * @param {string} reviewId
 * @param {string} currentUserId
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId, currentUserId) {
  if (!db || !reviewId) {
    throw new Error('Invalid review ID.');
  }

  if (!currentUserId) {
    throw new Error('Authentication required.');
  }

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Review not found.');
  }

  const existing = snap.data();
  if (existing.reviewerId !== currentUserId) {
    throw new Error('Permission denied: You can only delete your own reviews.');
  }

  await deleteDoc(docRef);

  // Recalculate product aggregate
  await recalculateProductRating(existing.productId);
}

/**
 * Get all transaction IDs that have already been reviewed by the user.
 * 
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
export async function getUserReviewedTransactionIds(userId) {
  if (!db || !userId) return new Set();

  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('reviewerId', '==', userId)
    );
    const snap = await getDocs(q);
    const set = new Set();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.transactionId) {
        set.add(data.transactionId);
      }
    });
    return set;
  } catch (error) {
    console.error('Error fetching reviewed transaction IDs:', error);
    return new Set();
  }
}

/**
 * Check if the user is eligible to review a product.
 * Returns true if the user has at least one completed order or booking for this product
 * that has not yet been reviewed.
 * 
 * @param {string} productId
 * @param {string} userId
 * @returns {Promise<{ eligible: boolean, qualifyingTransaction: Object|null }>}
 */
export async function checkUserReviewEligibility(productId, userId) {
  if (!db || !productId || !userId) {
    return { eligible: false, qualifyingTransaction: null };
  }

  try {
    // 1. Get transaction IDs already reviewed by user
    const reviewedIds = await getUserReviewedTransactionIds(userId);

    // 2. Check for completed Orders
    const ordersQ = query(
      collection(db, ORDERS_COLLECTION),
      where('buyerId', '==', userId),
      where('productId', '==', productId)
    );
    const ordersSnap = await getDocs(ordersQ);
    for (const d of ordersSnap.docs) {
      const order = d.data();
      const orderId = d.id;
      if ((order.status || '').toLowerCase() === 'completed' && !reviewedIds.has(orderId)) {
        return {
          eligible: true,
          qualifyingTransaction: {
            transactionType: 'order',
            transactionId: orderId,
            productTitle: order.productTitle || '',
          },
        };
      }
    }

    // 3. Check for completed Bookings
    const bookingsQ = query(
      collection(db, BOOKINGS_COLLECTION),
      where('renterId', '==', userId),
      where('productId', '==', productId)
    );
    const bookingsSnap = await getDocs(bookingsQ);
    for (const d of bookingsSnap.docs) {
      const booking = d.data();
      const bookingId = d.id;
      if ((booking.status || '').toLowerCase() === 'completed' && !reviewedIds.has(bookingId)) {
        return {
          eligible: true,
          qualifyingTransaction: {
            transactionType: 'booking',
            transactionId: bookingId,
            productTitle: booking.productTitle || '',
          },
        };
      }
    }

    return { eligible: false, qualifyingTransaction: null };
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return { eligible: false, qualifyingTransaction: null };
  }
}
