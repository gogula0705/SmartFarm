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

const BOOKINGS_COLLECTION = 'bookings';
const PRODUCTS_COLLECTION = 'products';

/**
 * Calculate the number of inclusive calendar days between two ISO date strings (YYYY-MM-DD).
 * Example: 2026-09-20 to 2026-09-22 is 3 days (Sept 20, 21, 22).
 * 
 * @param {string} startStr - YYYY-MM-DD
 * @param {string} endStr - YYYY-MM-DD
 * @returns {number}
 */
export function calculateRentalDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 0;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Creates a new equipment booking in Cloud Firestore with double-booking prevention.
 * 
 * Flow:
 * 1. Validates renter identity and dates.
 * 2. Checks product existence, status, category ('tool'), availability ('Available'), and ownership.
 * 3. Queries existing bookings for this tool and checks for date range overlaps:
 *    requestedStart <= existingEnd && requestedEnd >= existingStart
 *    (Ignoring 'cancelled' bookings)
 * 4. Calculates rental duration (days) and totalPrice = pricePerDay * rentalDays.
 * 5. Saves booking record with initial status "pending".
 * 
 * @param {Object} params
 * @param {string} params.productId - ID of the tool product in Firestore
 * @param {string} params.startDate - YYYY-MM-DD start date
 * @param {string} params.endDate - YYYY-MM-DD end date
 * @param {string} params.renterId - Firebase Auth UID of the renter
 * @param {string} [params.renterName] - Name of the renter
 * @returns {Promise<Object>} Created booking document
 */
export async function createBooking({ productId, startDate, endDate, renterId, renterName }) {
  if (!db) {
    throw new Error('Firestore is not initialized. Check your credentials in .env.');
  }

  if (!renterId) {
    throw new Error('Authentication required: You must be signed in to rent a tool.');
  }

  if (!productId) {
    throw new Error('Product ID is required.');
  }

  if (!startDate || !endDate) {
    throw new Error('Both start date and end date are required.');
  }

  // Normalize and validate date strings
  const todayStr = new Date().toISOString().split('T')[0];
  if (startDate < todayStr) {
    throw new Error('Start date cannot be before today.');
  }

  if (endDate < startDate) {
    throw new Error('End date cannot be before start date.');
  }

  const rentalDays = calculateRentalDays(startDate, endDate);
  if (rentalDays < 1) {
    throw new Error('Rental duration must be at least 1 day.');
  }

  try {
    const bookingResult = await runTransaction(db, async (transaction) => {
      // 1. Fetch tool product
      const productRef = doc(db, PRODUCTS_COLLECTION, productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error('Tool not found or has been removed.');
      }

      const product = productDoc.data();

      // Ensure tool category
      if (product.category !== 'tool') {
        throw new Error('Only machinery and tools can be rented.');
      }

      // Check product status
      if (product.status && product.status !== 'active') {
        throw new Error('This tool is no longer active.');
      }

      // Check operational availability
      if (product.availability && product.availability !== 'Available') {
        throw new Error('This tool is currently unavailable.');
      }

      // Prevent owner from renting their own tool
      if (product.ownerId === renterId) {
        throw new Error('You cannot rent your own tool.');
      }

      // 2. Query existing bookings for this product to prevent double-booking
      const existingBookingsQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('productId', '==', productId)
      );
      const existingSnapshot = await getDocs(existingBookingsQuery);

      // Check date overlap condition:
      // requestedStart <= existingEnd AND requestedEnd >= existingStart
      const hasOverlap = existingSnapshot.docs.some((docSnap) => {
        const b = docSnap.data();
        if ((b.status || '').toLowerCase() === 'cancelled') {
          return false;
        }
        return startDate <= b.endDate && endDate >= b.startDate;
      });

      if (hasOverlap) {
        throw new Error('This tool is already booked for the selected dates.');
      }

      // 3. Calculate financial totals
      const pricePerDay = Number(product.pricePerDay) || 0;
      const totalPrice = pricePerDay * rentalDays;

      // 4. Create booking document
      const bookingDocRef = doc(collection(db, BOOKINGS_COLLECTION));
      const bookingPayload = {
        bookingId: bookingDocRef.id,

        renterId,
        renterName: (renterName || 'SmartFarm Member').trim(),

        ownerId: product.ownerId || '',
        ownerName: (product.ownerName || 'SmartFarm Farmer').trim(),

        productId,
        productTitle: (product.title || '').trim(),
        equipmentType: (product.equipmentType || 'Machinery').trim(),

        productImage: Array.isArray(product.images) && product.images[0] ? product.images[0] : '',

        location: product.location || '',

        startDate,
        endDate,
        rentalDays,

        pricePerDay,
        totalPrice,

        status: 'pending',

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(bookingDocRef, bookingPayload);

      return {
        ...bookingPayload,
        createdAt: new Date().toISOString(),
      };
    });

    return bookingResult;
  } catch (error) {
    console.error('Failed to create booking in Firestore:', error);
    if (
      error.message?.includes('already booked for the selected dates') ||
      error.message?.includes('cannot rent your own tool') ||
      error.message?.includes('currently unavailable') ||
      error.message?.includes('Start date') ||
      error.message?.includes('End date') ||
      error.message?.includes('Rental duration')
    ) {
      throw error;
    }
    throw new Error('Unable to create booking. Please try again.');
  }
}

/**
 * Fetch all tool bookings made by a specific renter.
 * Ordered newest first.
 * 
 * @param {string} userId - Firebase Auth UID of the renter
 * @returns {Promise<Array<Object>>} List of user bookings
 */
export async function getUserBookings(userId) {
  if (!db || !userId) return [];

  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where('renterId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Client-side sort descending by createdAt to prevent requiring compound Firestore indexes
    bookings.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return bookings;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw new Error('Failed to load your bookings: ' + (error.message || 'Database error'));
  }
}

/**
 * Retrieve a single booking by ID with ownership verification.
 * 
 * @param {string} bookingId
 * @param {string} [userId]
 * @returns {Promise<Object|null>}
 */
export async function getBookingById(bookingId, userId) {
  if (!db || !bookingId) return null;

  try {
    const bookingDocRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const docSnap = await getDoc(bookingDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const bookingData = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    if (userId && bookingData.renterId !== userId && bookingData.ownerId !== userId) {
      throw new Error('Permission denied: You cannot view this booking.');
    }

    return bookingData;
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    throw error;
  }
}

/**
 * Cancel a pending booking.
 * Can only be cancelled while status is "pending".
 * Sets status to "cancelled" and preserves document history.
 * 
 * @param {string} bookingId
 * @param {string} userId - Firebase Auth UID of the renter
 * @returns {Promise<void>}
 */
export async function cancelBooking(bookingId, userId) {
  if (!db || !bookingId) {
    throw new Error('Invalid booking ID.');
  }

  if (!userId) {
    throw new Error('Authentication required.');
  }

  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  const docSnap = await getDoc(bookingRef);

  if (!docSnap.exists()) {
    throw new Error('Booking not found.');
  }

  const booking = docSnap.data();

  // Verify renter ownership
  if (booking.renterId !== userId) {
    throw new Error('Permission denied: You can only cancel your own bookings.');
  }

  // Enforce cancellation only for pending status
  if ((booking.status || '').toLowerCase() !== 'pending') {
    throw new Error('Only pending bookings can be cancelled.');
  }

  await updateDoc(bookingRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update the status of a booking (e.g. 'pending', 'confirmed', 'completed', 'cancelled').
 * 
 * @param {string} bookingId
 * @param {string} status
 * @returns {Promise<void>}
 */
export async function updateBookingStatus(bookingId, status) {
  if (!db || !bookingId) {
    throw new Error('Invalid booking ID or database instance.');
  }

  const bookingDocRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  await updateDoc(bookingDocRef, {
    status: String(status).trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}
