/**
 * Image Service Abstraction
 * 
 * DESIGN GOAL:
 * Allows the application to manage product images without requiring Firebase Cloud Storage
 * (staying on Firebase's free Spark plan without upgrading to the Blaze billing tier).
 *
 * CURRENT BEHAVIOR (Spark Plan / Development Mode):
 * - Accepts direct image URLs (e.g., Unsplash, Cloudinary, external links).
 * - Converts local File / Blob objects to Data URLs (base64) for instant previews.
 * - Provides reliable fallback placeholder images.
 *
 * UPGRADING TO FIREBASE STORAGE LATER:
 * When you are ready to enable Firebase Storage:
 * 1. Initialize `getStorage(app)` in `src/config/firebase.js`.
 * 2. In this file, import `ref`, `uploadBytes`, and `getDownloadURL` from 'firebase/storage'.
 * 3. Replace the body of `uploadImage()` with the Firebase Storage block provided below.
 * -> UI components and Firestore data schemas will NOT require any changes!
 */

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';

/**
 * Validates whether an image input is a valid URL or data URI.
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:image/')
  );
}

/**
 * Uploads or processes an image for product listings.
 * 
 * @param {File|Blob|string} imageInput - A File object, Blob, or existing URL string.
 * @param {string} folderPath - Optional target folder/category (used when Firebase Storage is active).
 * @returns {Promise<string>} - Resolves to the public or accessible image URL.
 */
export async function uploadImage(imageInput, _folderPath = 'products') {
  // If input is already an external URL or data URL, return it directly
  if (typeof imageInput === 'string' && isValidImageUrl(imageInput)) {
    return imageInput.trim();
  }

  // If input is a local File/Blob from an <input type="file">
  if (imageInput instanceof File || imageInput instanceof Blob) {
    /* 
    ==================================================================================
    FUTURE FIREBASE STORAGE IMPLEMENTATION (Uncomment when upgrading to Blaze plan):
    ==================================================================================
    import { storage } from '../config/firebase';
    import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

    const fileExt = imageInput.name ? imageInput.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, imageInput);
    return await getDownloadURL(snapshot.ref);
    ==================================================================================
    */

    // Development mode fallback: Convert File to Data URL for instant rendering
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(new Error('Failed to read image file: ' + err.message));
      reader.readAsDataURL(imageInput);
    });
  }

  // Fallback if no valid image was provided
  return DEFAULT_PRODUCT_IMAGE;
}
