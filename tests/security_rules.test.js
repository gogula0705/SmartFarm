/**
 * SmartFarm Cloud Firestore Security Rules Test Suite
 * 
 * Tests atomic cross-document validations, stock deduction, buyer & seller order cancellation,
 * order status transitions, review verification, rating aggregate protection,
 * community counters bidirectional locking, booking validation against trusted records,
 * and concurrency.
 * 
 * Run with:
 * npx.cmd firebase emulators:exec --only firestore "node --test tests/security_rules.test.js"
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';

const PROJECT_ID = 'smartfarm-27e39';
let testEnv;

before(async () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8088,
      rules: rulesContent,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

// Helper: Seed documents bypassing security rules
async function seedDocument(collectionName, docId, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, collectionName, docId), data);
  });
}

describe('1. Users Collection Security', () => {
  it('allows authenticated users to create and read their own profile', async () => {
    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const aliceRef = doc(aliceDb, 'users', 'alice_uid');

    await assertSucceeds(
      setDoc(aliceRef, {
        uid: 'alice_uid',
        fullName: 'Alice Farmer',
        email: 'alice@example.com',
        phone: '9876543210',
        location: 'Coimbatore, Tamil Nadu',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    const docSnap = await getDoc(aliceRef);
    assert.equal(docSnap.exists(), true);
  });

  it('denies user from reading or modifying another user profile', async () => {
    await seedDocument('users', 'bob_uid', {
      uid: 'bob_uid',
      fullName: 'Bob Farmer',
      email: 'bob@example.com',
      phone: '9876543211',
      location: 'Madurai, Tamil Nadu',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const aliceDb = testEnv.authenticatedContext('alice_uid').firestore();
    const bobRef = doc(aliceDb, 'users', 'bob_uid');

    await assertFails(getDoc(bobRef));
    await assertFails(updateDoc(bobRef, { fullName: 'Hacked Bob' }));
  });

  it('denies unauthenticated users from reading or writing user profiles', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const userRef = doc(unauthDb, 'users', 'any_uid');

    await assertFails(getDoc(userRef));
    await assertFails(
      setDoc(userRef, {
        uid: 'any_uid',
        fullName: 'Anonymous',
        email: 'anon@example.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('2. Demo Product Protection', () => {
  beforeEach(async () => {
    await seedDocument('products', 'demo-product-1', {
      title: 'Demo Organic Wheat Seeds',
      description: 'High quality demo wheat seeds',
      category: 'seed',
      variety: 'Sharbati',
      cropType: 'Wheat',
      price: 60,
      quantity: 50,
      status: 'active',
      ownerId: 'demo-owner-001',
      ownerName: 'Demo Farmer',
      location: 'Punjab',
      images: ['https://example.com/demo.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('products', 'normal-product-1', {
      title: 'Farmer Organic Rice',
      description: 'Fresh harvest rice',
      category: 'crop',
      quality: 'Premium Grade A',
      harvestDate: '2026-10-15',
      price: 45,
      quantity: 100,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Thanjavur',
      images: ['https://example.com/rice.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('denies deletion of demo products by any user', async () => {
    const attackerDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const demoRef = doc(attackerDb, 'products', 'demo-product-1');

    await assertFails(deleteDoc(demoRef));
  });

  it('denies arbitrary direct update of demo products by normal users', async () => {
    const attackerDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const demoRef = doc(attackerDb, 'products', 'demo-product-1');

    await assertFails(updateDoc(demoRef, { title: 'Corrupted Demo Title' }));
  });

  it('allows owner to delete their normal non-demo product', async () => {
    const farmerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const productRef = doc(farmerDb, 'products', 'normal-product-1');

    await assertSucceeds(deleteDoc(productRef));
  });

  it('denies non-owner from deleting another user product', async () => {
    const attackerDb = testEnv.authenticatedContext('attacker_uid').firestore();
    const productRef = doc(attackerDb, 'products', 'normal-product-1');

    await assertFails(deleteDoc(productRef));
  });
});

describe('3. Prevention of Arbitrary Product Inventory Manipulation', () => {
  beforeEach(async () => {
    await seedDocument('products', 'prod-seeds-1', {
      title: 'Hybrid Tomato Seeds',
      description: 'Disease resistant tomato seeds',
      category: 'seed',
      variety: 'Roma',
      cropType: 'Tomato',
      price: 100,
      quantity: 30,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Bangalore',
      images: ['https://example.com/tomato.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('denies buyer from directly updating product quantity without a valid matching order', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-seeds-1');

    await assertFails(
      updateDoc(productRef, {
        quantity: 0,
        updatedAt: serverTimestamp(),
      })
    );

    await assertFails(
      updateDoc(productRef, {
        quantity: 9999,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies non-owner from altering product prices or ownership', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-seeds-1');

    await assertFails(updateDoc(productRef, { price: 1 }));
    await assertFails(updateDoc(productRef, { ownerId: 'buyer_uid' }));
  });
});

describe('4. Atomic Purchase & Cross-Document Stock Validation', () => {
  beforeEach(async () => {
    await seedDocument('products', 'prod-wheat-1', {
      title: 'Premium Sharbati Wheat',
      description: 'Organically grown sharbati wheat',
      category: 'crop',
      quality: 'Grade A',
      harvestDate: '2026-10-10',
      price: 50,
      quantity: 20,
      status: 'active',
      ownerId: 'seller_uid',
      ownerName: 'Punjab Farmer',
      location: 'Ludhiana',
      images: ['https://example.com/wheat.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows authorized atomic purchase with exact matching stock deduction', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-wheat-1');
    const orderRef = doc(buyerDb, 'orders', 'order-valid-1');

    await assertSucceeds(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 16,
          lastOrderId: 'order-valid-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef, {
          orderId: 'order-valid-1',
          buyerId: 'buyer_uid',
          buyerName: 'Buyer Customer',
          sellerId: 'seller_uid',
          sellerName: 'Punjab Farmer',
          productId: 'prod-wheat-1',
          productTitle: 'Premium Sharbati Wheat',
          category: 'crop',
          quantity: 4,
          unitPrice: 50,
          totalPrice: 200,
          productImage: 'https://example.com/wheat.jpg',
          location: 'Ludhiana',
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies purchase if product stock decrement does not match order quantity (mismatch attack)', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-wheat-1');
    const orderRef = doc(buyerDb, 'orders', 'order-mismatch-1');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 5,
          lastOrderId: 'order-mismatch-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef, {
          orderId: 'order-mismatch-1',
          buyerId: 'buyer_uid',
          buyerName: 'Buyer Customer',
          sellerId: 'seller_uid',
          sellerName: 'Punjab Farmer',
          productId: 'prod-wheat-1',
          productTitle: 'Premium Sharbati Wheat',
          category: 'crop',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
          productImage: 'https://example.com/wheat.jpg',
          location: 'Ludhiana',
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies purchase if unit price is forged / tampered by buyer', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-wheat-1');
    const orderRef = doc(buyerDb, 'orders', 'order-cheap-1');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 19,
          lastOrderId: 'order-cheap-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef, {
          orderId: 'order-cheap-1',
          buyerId: 'buyer_uid',
          buyerName: 'Buyer Customer',
          sellerId: 'seller_uid',
          sellerName: 'Punjab Farmer',
          productId: 'prod-wheat-1',
          productTitle: 'Premium Sharbati Wheat',
          category: 'crop',
          quantity: 1,
          unitPrice: 1,
          totalPrice: 1,
          productImage: 'https://example.com/wheat.jpg',
          location: 'Ludhiana',
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies seller from buying their own product', async () => {
    const sellerDb = testEnv.authenticatedContext('seller_uid').firestore();
    const productRef = doc(sellerDb, 'products', 'prod-wheat-1');
    const orderRef = doc(sellerDb, 'orders', 'order-self-1');

    await assertFails(
      runTransaction(sellerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 18,
          lastOrderId: 'order-self-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef, {
          orderId: 'order-self-1',
          buyerId: 'seller_uid',
          sellerId: 'seller_uid',
          productId: 'prod-wheat-1',
          productTitle: 'Premium Sharbati Wheat',
          category: 'crop',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies purchase when requested quantity exceeds available stock', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-wheat-1');
    const orderRef = doc(buyerDb, 'orders', 'order-over-1');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: -5,
          lastOrderId: 'order-over-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef, {
          orderId: 'order-over-1',
          buyerId: 'buyer_uid',
          sellerId: 'seller_uid',
          productId: 'prod-wheat-1',
          productTitle: 'Premium Sharbati Wheat',
          category: 'crop',
          quantity: 25,
          unitPrice: 50,
          totalPrice: 1250,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });
});

describe('5. Order Cancellation & Stock Restoration', () => {
  beforeEach(async () => {
    await seedDocument('products', 'prod-seeds-cancel', {
      title: 'Chilli Seeds',
      description: 'Hot pepper chilli seeds',
      category: 'seed',
      variety: 'Guntur Sannam',
      cropType: 'Chilli',
      price: 40,
      quantity: 15,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Guntur',
      images: ['https://example.com/chilli.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-pending-1', {
      orderId: 'order-pending-1',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-seeds-cancel',
      productTitle: 'Chilli Seeds',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      productImage: 'https://example.com/chilli.jpg',
      location: 'Guntur',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-confirmed-1', {
      orderId: 'order-confirmed-1',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-seeds-cancel',
      productTitle: 'Chilli Seeds',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      productImage: 'https://example.com/chilli.jpg',
      location: 'Guntur',
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows buyer to atomically cancel a pending order and restore exact stock', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(buyerDb, 'orders', 'order-pending-1');

    await assertSucceeds(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-pending-1',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('allows seller to atomically cancel a pending order and restore stock', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const productRef = doc(sellerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(sellerDb, 'orders', 'order-pending-1');

    await assertSucceeds(
      runTransaction(sellerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-pending-1',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('allows seller to atomically cancel a confirmed order and restore stock', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const productRef = doc(sellerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(sellerDb, 'orders', 'order-confirmed-1');

    await assertSucceeds(
      runTransaction(sellerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-confirmed-1',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies seller from cancelling without restoring stock', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const orderRef = doc(sellerDb, 'orders', 'order-pending-1');

    await assertFails(
      updateDoc(orderRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies seller from cancelling with mismatched stock restoration quantity', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const productRef = doc(sellerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(sellerDb, 'orders', 'order-pending-1');

    await assertFails(
      runTransaction(sellerDb, async (transaction) => {
        // Order was for 5 units, but seller restores only 2 (15 + 2 = 17)
        transaction.update(productRef, {
          quantity: 17,
          lastOrderId: 'order-pending-1',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies buyer from cancelling a confirmed order', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(buyerDb, 'orders', 'order-confirmed-1');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-confirmed-1',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies duplicate cancellation / stock restoration on already cancelled order', async () => {
    await seedDocument('orders', 'order-already-cancelled', {
      orderId: 'order-already-cancelled',
      buyerId: 'buyer_uid',
      sellerId: 'farmer_uid',
      productId: 'prod-seeds-cancel',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      status: 'cancelled',
      stockDeducted: true,
      stockRestored: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-seeds-cancel');
    const orderRef = doc(buyerDb, 'orders', 'order-already-cancelled');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-already-cancelled',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          updatedAt: serverTimestamp(),
        });
      })
    );
  });
});

describe('6. Verified Reviews & Rating Aggregate Protection', () => {
  beforeEach(async () => {
    await seedDocument('products', 'prod-reviewed-1', {
      title: 'Organic Fertilizer',
      description: 'Bio fertilizer for crops',
      category: 'seed',
      variety: 'BioCompost',
      cropType: 'General',
      price: 30,
      quantity: 50,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Pune',
      images: ['https://example.com/fert.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-completed-buyer', {
      orderId: 'order-completed-buyer',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-reviewed-1',
      category: 'seed',
      quantity: 2,
      unitPrice: 30,
      totalPrice: 60,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-still-pending', {
      orderId: 'order-still-pending',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-reviewed-1',
      category: 'seed',
      quantity: 1,
      unitPrice: 30,
      totalPrice: 30,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows review creation when reviewId matches verified completed transactionId', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    await assertSucceeds(
      setDoc(reviewRef, {
        productId: 'prod-reviewed-1',
        reviewerId: 'buyer_uid',
        reviewerName: 'Buyer Customer',
        transactionType: 'order',
        transactionId: 'order-completed-buyer',
        rating: 5,
        comment: 'Excellent bio fertilizer! Yield increased.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies review creation when reviewId does not match transactionId', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const reviewRef = doc(buyerDb, 'reviews', 'mismatched-review-id');

    await assertFails(
      setDoc(reviewRef, {
        productId: 'prod-reviewed-1',
        reviewerId: 'buyer_uid',
        reviewerName: 'Buyer Customer',
        transactionType: 'order',
        transactionId: 'order-completed-buyer',
        rating: 5,
        comment: 'Mismatched ID review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies duplicate review creation for the same transactionId', async () => {
    await seedDocument('reviews', 'order-completed-buyer', {
      productId: 'prod-reviewed-1',
      reviewerId: 'buyer_uid',
      reviewerName: 'Buyer Customer',
      transactionType: 'order',
      transactionId: 'order-completed-buyer',
      rating: 5,
      comment: 'Initial review',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    // Attempting to overwrite existing review with a new setDoc -> MUST FAIL
    await assertFails(
      setDoc(reviewRef, {
        productId: 'prod-reviewed-1',
        reviewerId: 'buyer_uid',
        reviewerName: 'Buyer Customer',
        transactionType: 'order',
        transactionId: 'order-completed-buyer',
        rating: 1,
        comment: 'Duplicate review attack!',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies fabricated review referencing a non-completed or non-existent transaction', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const pendingRef = doc(buyerDb, 'reviews', 'order-still-pending');

    await assertFails(
      setDoc(pendingRef, {
        productId: 'prod-reviewed-1',
        reviewerId: 'buyer_uid',
        reviewerName: 'Buyer Customer',
        transactionType: 'order',
        transactionId: 'order-still-pending',
        rating: 5,
        comment: 'Great!',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    const fakeRef = doc(buyerDb, 'reviews', 'fake-transaction-id');
    await assertFails(
      setDoc(fakeRef, {
        productId: 'prod-reviewed-1',
        reviewerId: 'buyer_uid',
        reviewerName: 'Buyer Customer',
        transactionType: 'order',
        transactionId: 'fake-transaction-id',
        rating: 5,
        comment: 'Fake review!',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('allows atomic review creation with product rating update', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-reviewed-1');
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    await assertSucceeds(
      runTransaction(buyerDb, async (transaction) => {
        transaction.set(reviewRef, {
          productId: 'prod-reviewed-1',
          reviewerId: 'buyer_uid',
          reviewerName: 'Buyer Customer',
          transactionType: 'order',
          transactionId: 'order-completed-buyer',
          rating: 4,
          comment: 'Good product.',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(productRef, {
          rating: 4,
          reviewCount: 1,
          lastReviewId: 'order-completed-buyer',
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('validates exact mathematical weighted-average on subsequent reviews and rejects fabricated rating aggregates', async () => {
    // Seed initial review and product with 1 review: rating = 4.0, reviewCount = 1
    await seedDocument('reviews', 'order-completed-buyer', {
      productId: 'prod-reviewed-1',
      reviewerId: 'buyer_uid',
      reviewerName: 'Buyer Customer',
      transactionType: 'order',
      transactionId: 'order-completed-buyer',
      rating: 4,
      comment: 'Good product.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('products', 'prod-reviewed-1', {
      title: 'Farmer Bio Compost',
      description: 'Organic compost',
      category: 'seed',
      variety: 'BioCompost',
      cropType: 'General',
      price: 30,
      quantity: 50,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Pune',
      images: ['https://example.com/fert.jpg'],
      rating: 4,
      reviewCount: 1,
      lastReviewId: 'order-completed-buyer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed order-completed-buyer-2 for buyer_2_uid
    await seedDocument('orders', 'order-completed-buyer-2', {
      orderId: 'order-completed-buyer-2',
      buyerId: 'buyer_2_uid',
      buyerName: 'Buyer Two',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-reviewed-1',
      category: 'seed',
      quantity: 1,
      unitPrice: 30,
      totalPrice: 30,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyer2Db = testEnv.authenticatedContext('buyer_2_uid').firestore();
    const productRef = doc(buyer2Db, 'products', 'prod-reviewed-1');
    const review2Ref = doc(buyer2Db, 'reviews', 'order-completed-buyer-2');

    // New review has rating = 2
    // Expected average: (4.0 * 1 + 2) / 2 = 3.0

    // Attempt 1: Fabricated rating aggregate (claiming 4.5 instead of 3.0) -> MUST FAIL
    await assertFails(
      runTransaction(buyer2Db, async (transaction) => {
        transaction.set(review2Ref, {
          productId: 'prod-reviewed-1',
          reviewerId: 'buyer_2_uid',
          reviewerName: 'Buyer Two',
          transactionType: 'order',
          transactionId: 'order-completed-buyer-2',
          rating: 2,
          comment: 'Could be better.',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(productRef, {
          rating: 4.5, // Fabricated!
          reviewCount: 2,
          lastReviewId: 'order-completed-buyer-2',
          updatedAt: serverTimestamp(),
        });
      })
    );

    // Attempt 2: Mathematically correct rating aggregate (3.0) -> MUST SUCCEED
    await assertSucceeds(
      runTransaction(buyer2Db, async (transaction) => {
        transaction.set(review2Ref, {
          productId: 'prod-reviewed-1',
          reviewerId: 'buyer_2_uid',
          reviewerName: 'Buyer Two',
          transactionType: 'order',
          transactionId: 'order-completed-buyer-2',
          rating: 2,
          comment: 'Could be better.',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(productRef, {
          rating: 3.0, // (4 * 1 + 2) / 2 = 3.0
          reviewCount: 2,
          lastReviewId: 'order-completed-buyer-2',
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies modifying rating on an existing review but allows updating comment', async () => {
    await seedDocument('reviews', 'order-completed-buyer', {
      productId: 'prod-reviewed-1',
      reviewerId: 'buyer_uid',
      reviewerName: 'Buyer Customer',
      transactionType: 'order',
      transactionId: 'order-completed-buyer',
      rating: 4,
      comment: 'Initial comment',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    // Attempt to change rating from 4 to 5 -> MUST FAIL
    await assertFails(
      updateDoc(reviewRef, {
        rating: 5,
        updatedAt: serverTimestamp(),
      })
    );

    // Updating comment text only -> MUST SUCCEED
    await assertSucceeds(
      updateDoc(reviewRef, {
        comment: 'Updated review comments after further use.',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies deleting review documents to protect rating aggregate integrity', async () => {
    await seedDocument('reviews', 'order-completed-buyer', {
      productId: 'prod-reviewed-1',
      reviewerId: 'buyer_uid',
      reviewerName: 'Buyer Customer',
      transactionType: 'order',
      transactionId: 'order-completed-buyer',
      rating: 4,
      comment: 'Initial comment',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    // Deletion attempt -> MUST FAIL
    await assertFails(deleteDoc(reviewRef));
  });

  it('denies using an existing review ID to manipulate product rating aggregates', async () => {
    // Seed existing review
    await seedDocument('reviews', 'existing-review-id', {
      productId: 'prod-reviewed-1',
      reviewerId: 'buyer_uid',
      reviewerName: 'Buyer Customer',
      transactionType: 'order',
      transactionId: 'order-completed-buyer',
      rating: 5,
      comment: 'Past review',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-reviewed-1');

    // Attempting to reuse existing review ID without creating a new review
    await assertFails(
      updateDoc(productRef, {
        rating: 5,
        reviewCount: 1,
        lastReviewId: 'existing-review-id',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies fabricated review count increment in atomic transaction', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-reviewed-1');
    const reviewRef = doc(buyerDb, 'reviews', 'order-completed-buyer');

    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.set(reviewRef, {
          productId: 'prod-reviewed-1',
          reviewerId: 'buyer_uid',
          reviewerName: 'Buyer Customer',
          transactionType: 'order',
          transactionId: 'order-completed-buyer',
          rating: 5,
          comment: 'Good product.',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Fabricated reviewCount: jump from 0 to 50!
        transaction.update(productRef, {
          rating: 5,
          reviewCount: 50,
          lastReviewId: 'order-completed-buyer',
          updatedAt: serverTimestamp(),
        });
      })
    );
  });
});

describe('7. Community Counters Protection & Bidirectional Locking', () => {
  beforeEach(async () => {
    await seedDocument('communityPosts', 'post-community-1', {
      postId: 'post-community-1',
      title: 'Drip Irrigation Tips for Tamil Nadu Summer',
      content: 'Here are 5 tips for water conservation during peak summer.',
      category: 'Irrigation',
      authorId: 'author_uid',
      authorName: 'Ramesh Farmer',
      authorLocation: 'Salem',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows atomic like toggle with corresponding subcollection like document', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const postRef = doc(userDb, 'communityPosts', 'post-community-1');
    const likeRef = doc(userDb, 'communityPosts', 'post-community-1', 'likes', 'user_uid');

    await assertSucceeds(
      runTransaction(userDb, async (transaction) => {
        transaction.set(likeRef, {
          userId: 'user_uid',
          createdAt: serverTimestamp(),
        });
        transaction.update(postRef, {
          likesCount: 1,
        });
      })
    );
  });

  it('denies creating like document without incrementing post likesCount', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const likeRef = doc(userDb, 'communityPosts', 'post-community-1', 'likes', 'user_uid');

    // Standalone like creation without post update
    await assertFails(
      setDoc(likeRef, {
        userId: 'user_uid',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies updating post likesCount without creating like document', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const postRef = doc(userDb, 'communityPosts', 'post-community-1');

    await assertFails(
      updateDoc(postRef, {
        likesCount: 1,
      })
    );
  });

  it('allows atomic comment creation with post commentsCount increment', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const postRef = doc(userDb, 'communityPosts', 'post-community-1');
    const commentRef = doc(userDb, 'communityPosts', 'post-community-1', 'comments', 'comment-new-1');

    await assertSucceeds(
      runTransaction(userDb, async (transaction) => {
        transaction.set(commentRef, {
          commentId: 'comment-new-1',
          postId: 'post-community-1',
          content: 'Very helpful drip irrigation advice!',
          authorId: 'user_uid',
          authorName: 'Suresh Kumar',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(postRef, {
          commentsCount: 1,
          lastCommentId: 'comment-new-1',
        });
      })
    );
  });

  it('denies creating comment document without incrementing post commentsCount', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const commentRef = doc(userDb, 'communityPosts', 'post-community-1', 'comments', 'comment-new-2');

    await assertFails(
      setDoc(commentRef, {
        commentId: 'comment-new-2',
        postId: 'post-community-1',
        content: 'Unlinked comment!',
        authorId: 'user_uid',
        authorName: 'Suresh Kumar',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies arbitrary increment of commentsCount without creating comment document', async () => {
    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const postRef = doc(userDb, 'communityPosts', 'post-community-1');

    await assertFails(
      updateDoc(postRef, {
        commentsCount: 10,
        lastCommentId: 'fake-comment-id',
      })
    );
  });
});

describe('8. Order State Transitions & Terminal States', () => {
  beforeEach(async () => {
    await seedDocument('orders', 'order-state-pending', {
      orderId: 'order-state-pending',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-seeds-cancel',
      productTitle: 'Chilli Seeds',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      productImage: 'https://example.com/chilli.jpg',
      location: 'Guntur',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-state-confirmed', {
      orderId: 'order-state-confirmed',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-seeds-cancel',
      productTitle: 'Chilli Seeds',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      productImage: 'https://example.com/chilli.jpg',
      location: 'Guntur',
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-state-completed', {
      orderId: 'order-state-completed',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-seeds-cancel',
      productTitle: 'Chilli Seeds',
      category: 'seed',
      quantity: 5,
      unitPrice: 40,
      totalPrice: 200,
      productImage: 'https://example.com/chilli.jpg',
      location: 'Guntur',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows seller to confirm a pending order', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const orderRef = doc(sellerDb, 'orders', 'order-state-pending');

    await assertSucceeds(
      updateDoc(orderRef, {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('allows seller to complete a confirmed order', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const orderRef = doc(sellerDb, 'orders', 'order-state-confirmed');

    await assertSucceeds(
      updateDoc(orderRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies seller from transitioning pending directly to completed', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const orderRef = doc(sellerDb, 'orders', 'order-state-pending');

    await assertFails(
      updateDoc(orderRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies modifying or cancelling a completed order', async () => {
    const sellerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const orderRef = doc(sellerDb, 'orders', 'order-state-completed');

    await assertFails(
      updateDoc(orderRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      })
    );

    await assertFails(
      updateDoc(orderRef, {
        status: 'pending',
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('9. Bookings Validation Against Trusted Records', () => {
  beforeEach(async () => {
    await seedDocument('products', 'tool-tractor-1', {
      title: 'Mahindra 475 DI Tractor',
      description: 'Heavy duty 42 HP tractor with rotavator attachment',
      category: 'tool',
      equipmentType: 'Tractor',
      condition: 'Excellent',
      pricePerHour: 300,
      pricePerDay: 1500,
      availability: 'Available',
      status: 'active',
      ownerId: 'owner_uid',
      ownerName: 'Tractor Rentals Tamil Nadu',
      location: 'Salem',
      images: ['https://example.com/tractor.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('products', 'not-a-tool-crop', {
      title: 'Harvested Corn',
      description: 'Sweet corn harvest',
      category: 'crop',
      quality: 'Grade A',
      harvestDate: '2026-10-12',
      price: 30,
      quantity: 100,
      status: 'active',
      ownerId: 'owner_uid',
      ownerName: 'Corn Farmer',
      location: 'Salem',
      images: ['https://example.com/corn.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('allows renter to book an active tool with matching daily rate, days, total, and valid dates', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingRef = doc(renterDb, 'bookings', 'booking-valid-1');

    await assertSucceeds(
      setDoc(bookingRef, {
        bookingId: 'booking-valid-1',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 4500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking when product category is not tool', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingRef = doc(renterDb, 'bookings', 'booking-invalid-category');

    await assertFails(
      setDoc(bookingRef, {
        bookingId: 'booking-invalid-category',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Corn Farmer',
        productId: 'not-a-tool-crop',
        productTitle: 'Harvested Corn',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/corn.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 4500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking when pricePerDay is forged', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingRef = doc(renterDb, 'bookings', 'booking-cheap-tool');

    await assertFails(
      setDoc(bookingRef, {
        bookingId: 'booking-cheap-tool',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 3,
        pricePerDay: 1, // Real price is 1500!
        totalPrice: 3,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking when totalPrice does not match calculation', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingRef = doc(renterDb, 'bookings', 'booking-wrong-math');

    await assertFails(
      setDoc(bookingRef, {
        bookingId: 'booking-wrong-math',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 100, // Should be 4500!
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking with inverted date range (startDate > endDate)', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingRef = doc(renterDb, 'bookings', 'booking-inverted-dates');

    await assertFails(
      setDoc(bookingRef, {
        bookingId: 'booking-inverted-dates',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-10',
        endDate: '2026-11-01', // End date before start date!
        rentalDays: 1,
        pricePerDay: 1500,
        totalPrice: 1500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies tool owner from renting their own tool', async () => {
    const ownerDb = testEnv.authenticatedContext('owner_uid').firestore();
    const bookingRef = doc(ownerDb, 'bookings', 'booking-self-rent');

    await assertFails(
      setDoc(bookingRef, {
        bookingId: 'booking-self-rent',
        renterId: 'owner_uid',
        renterName: 'Owner Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 4500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking with invalid date format (non-ISO YYYY-MM-DD)', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();
    const bookingSlashRef = doc(renterDb, 'bookings', 'booking-slash-dates');

    // Slash format: 2026/11/01
    await assertFails(
      setDoc(bookingSlashRef, {
        bookingId: 'booking-slash-dates',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026/11/01',
        endDate: '2026/11/03',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 4500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    const bookingDmRef = doc(renterDb, 'bookings', 'booking-dm-dates');
    // DD-MM-YYYY format
    await assertFails(
      setDoc(bookingDmRef, {
        bookingId: 'booking-dm-dates',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '01-11-2026',
        endDate: '03-11-2026',
        rentalDays: 3,
        pricePerDay: 1500,
        totalPrice: 4500,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies booking with fractional or non-positive rental days', async () => {
    const renterDb = testEnv.authenticatedContext('renter_uid').firestore();

    // Fractional days: 2.5
    const bookingFracRef = doc(renterDb, 'bookings', 'booking-frac-days');
    await assertFails(
      setDoc(bookingFracRef, {
        bookingId: 'booking-frac-days',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 2.5,
        pricePerDay: 1500,
        totalPrice: 3750,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Non-positive days: 0
    const bookingZeroRef = doc(renterDb, 'bookings', 'booking-zero-days');
    await assertFails(
      setDoc(bookingZeroRef, {
        bookingId: 'booking-zero-days',
        renterId: 'renter_uid',
        renterName: 'Renter Customer',
        ownerId: 'owner_uid',
        ownerName: 'Tractor Rentals Tamil Nadu',
        productId: 'tool-tractor-1',
        productTitle: 'Mahindra 475 DI Tractor',
        equipmentType: 'Tractor',
        productImage: 'https://example.com/tractor.jpg',
        location: 'Salem',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        rentalDays: 0,
        pricePerDay: 1500,
        totalPrice: 0,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe('10. Concurrent Purchases Simulation', () => {
  it('handles concurrent purchase transactions against limited inventory', async () => {
    await seedDocument('products', 'prod-limited-stock', {
      title: 'Limited Organic Cotton Seeds',
      description: 'Rare native cotton seeds',
      category: 'seed',
      variety: 'Desi Cotton',
      cropType: 'Cotton',
      price: 200,
      quantity: 3,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Nagpur',
      images: ['https://example.com/cotton.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyer1Db = testEnv.authenticatedContext('buyer_1').firestore();
    const buyer2Db = testEnv.authenticatedContext('buyer_2').firestore();

    const productRef1 = doc(buyer1Db, 'products', 'prod-limited-stock');
    const orderRef1 = doc(buyer1Db, 'orders', 'order-buyer-1');

    const productRef2 = doc(buyer2Db, 'products', 'prod-limited-stock');
    const orderRef2 = doc(buyer2Db, 'orders', 'order-buyer-2');

    // Buyer 1 successfully buys all 3 units
    await assertSucceeds(
      runTransaction(buyer1Db, async (transaction) => {
        transaction.update(productRef1, {
          quantity: 0,
          lastOrderId: 'order-buyer-1',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef1, {
          orderId: 'order-buyer-1',
          buyerId: 'buyer_1',
          buyerName: 'Buyer One',
          sellerId: 'farmer_uid',
          sellerName: 'Farmer Joe',
          productId: 'prod-limited-stock',
          productTitle: 'Limited Organic Cotton Seeds',
          category: 'seed',
          quantity: 3,
          unitPrice: 200,
          totalPrice: 600,
          productImage: 'https://example.com/cotton.jpg',
          location: 'Nagpur',
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );

    // Buyer 2 tries to buy 2 units when stock is now 0 (would result in negative stock)
    await assertFails(
      runTransaction(buyer2Db, async (transaction) => {
        transaction.update(productRef2, {
          quantity: -2,
          lastOrderId: 'order-buyer-2',
          updatedAt: serverTimestamp(),
        });

        transaction.set(orderRef2, {
          orderId: 'order-buyer-2',
          buyerId: 'buyer_2',
          buyerName: 'Buyer Two',
          sellerId: 'farmer_uid',
          sellerName: 'Farmer Joe',
          productId: 'prod-limited-stock',
          productTitle: 'Limited Organic Cotton Seeds',
          category: 'seed',
          quantity: 2,
          unitPrice: 200,
          totalPrice: 400,
          productImage: 'https://example.com/cotton.jpg',
          location: 'Nagpur',
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cash_on_delivery',
          stockDeducted: true,
          stockRestored: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });
});

describe('11. Advanced Attack Vectors & Edge Cases', () => {
  it('enforces rating aggregate rounding boundary tolerance (±0.06)', async () => {
    await seedDocument('products', 'prod-boundary-1', {
      title: 'Boundary Test Organic Seeds',
      description: 'Seeds for boundary testing',
      category: 'seed',
      variety: 'BoundaryVariety',
      cropType: 'Corn',
      price: 50,
      quantity: 50,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Pune',
      images: ['https://example.com/corn.jpg'],
      rating: 3.0,
      reviewCount: 1,
      lastReviewId: 'order-boundary-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('reviews', 'order-boundary-1', {
      productId: 'prod-boundary-1',
      reviewerId: 'buyer_1',
      reviewerName: 'Buyer One',
      transactionType: 'order',
      transactionId: 'order-boundary-1',
      rating: 3,
      comment: 'Initial 3-star review',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-boundary-2', {
      orderId: 'order-boundary-2',
      buyerId: 'buyer_2',
      buyerName: 'Buyer Two',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-boundary-1',
      category: 'seed',
      quantity: 1,
      unitPrice: 50,
      totalPrice: 50,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyer2Db = testEnv.authenticatedContext('buyer_2').firestore();
    const productRef = doc(buyer2Db, 'products', 'prod-boundary-1');
    const reviewRef = doc(buyer2Db, 'reviews', 'order-boundary-2');

    // Expected average: (3.0 * 1 + 3) / 2 = 3.0
    // Attempt with delta > 0.06: 3.07 (delta = 0.07) -> MUST FAIL
    await assertFails(
      runTransaction(buyer2Db, async (transaction) => {
        transaction.set(reviewRef, {
          productId: 'prod-boundary-1',
          reviewerId: 'buyer_2',
          reviewerName: 'Buyer Two',
          transactionType: 'order',
          transactionId: 'order-boundary-2',
          rating: 3,
          comment: 'Boundary review',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(productRef, {
          rating: 3.07,
          reviewCount: 2,
          lastReviewId: 'order-boundary-2',
          updatedAt: serverTimestamp(),
        });
      })
    );

    // Attempt with delta <= 0.06: 3.05 (delta = 0.05) -> MUST SUCCEED
    await assertSucceeds(
      runTransaction(buyer2Db, async (transaction) => {
        transaction.set(reviewRef, {
          productId: 'prod-boundary-1',
          reviewerId: 'buyer_2',
          reviewerName: 'Buyer Two',
          transactionType: 'order',
          transactionId: 'order-boundary-2',
          rating: 3,
          comment: 'Boundary review',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(productRef, {
          rating: 3.05,
          reviewCount: 2,
          lastReviewId: 'order-boundary-2',
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies review creation for another user transaction (impersonation attack)', async () => {
    // Seed order-completed-buyer belonging to buyer_uid
    await seedDocument('orders', 'order-for-buyer-only', {
      orderId: 'order-for-buyer-only',
      buyerId: 'buyer_uid',
      buyerName: 'Legitimate Buyer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-wheat-1',
      category: 'crop',
      quantity: 1,
      unitPrice: 50,
      totalPrice: 50,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attacker charlie_uid attempts to create review referencing buyer_uid's transaction
    const charlieDb = testEnv.authenticatedContext('charlie_uid').firestore();
    const reviewRef = doc(charlieDb, 'reviews', 'order-for-buyer-only');

    await assertFails(
      setDoc(reviewRef, {
        productId: 'prod-wheat-1',
        reviewerId: 'charlie_uid',
        reviewerName: 'Charlie Impersonator',
        transactionType: 'order',
        transactionId: 'order-for-buyer-only',
        rating: 1,
        comment: 'Malicious review on someone else order!',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies duplicate cancellation on the same order', async () => {
    await seedDocument('products', 'prod-cancel-twice', {
      title: 'Seeds for Double Cancel',
      description: 'Test stock restoration',
      category: 'seed',
      variety: 'DoubleCancelVariety',
      cropType: 'Rice',
      price: 30,
      quantity: 10,
      status: 'active',
      ownerId: 'farmer_uid',
      ownerName: 'Farmer Joe',
      location: 'Pune',
      images: ['https://example.com/rice.jpg'],
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('orders', 'order-cancel-twice', {
      orderId: 'order-cancel-twice',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-cancel-twice',
      productTitle: 'Seeds for Double Cancel',
      category: 'seed',
      quantity: 5,
      unitPrice: 30,
      totalPrice: 150,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-cancel-twice');
    const orderRef = doc(buyerDb, 'orders', 'order-cancel-twice');

    // First cancellation -> MUST SUCCEED
    await assertSucceeds(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 15,
          lastOrderId: 'order-cancel-twice',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );

    // Second cancellation attempt on the now-cancelled order -> MUST FAIL
    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 20,
          lastOrderId: 'order-cancel-twice',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: true,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('denies order cancellation with forged stockRestored flag (false)', async () => {
    await seedDocument('orders', 'order-forged-flag', {
      orderId: 'order-forged-flag',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-cancel-twice',
      productTitle: 'Seeds for Double Cancel',
      category: 'seed',
      quantity: 2,
      unitPrice: 30,
      totalPrice: 60,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const productRef = doc(buyerDb, 'products', 'prod-cancel-twice');
    const orderRef = doc(buyerDb, 'orders', 'order-forged-flag');

    // Attempting to cancel with stockRestored: false (to bypass or repeat restoration) -> MUST FAIL
    await assertFails(
      runTransaction(buyerDb, async (transaction) => {
        transaction.update(productRef, {
          quantity: 17,
          lastOrderId: 'order-forged-flag',
          updatedAt: serverTimestamp(),
        });

        transaction.update(orderRef, {
          status: 'cancelled',
          stockRestored: false,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );
  });

  it('requires atomic like and comment deletion with counter decrement', async () => {
    await seedDocument('communityPosts', 'post-sub-delete', {
      postId: 'post-sub-delete',
      title: 'Organic Fertilizer Secrets',
      content: 'Here is how to brew effective compost tea.',
      category: 'Farming Advice',
      authorId: 'author_uid',
      authorName: 'Ramesh',
      authorLocation: 'Salem',
      likesCount: 1,
      commentsCount: 1,
      lastCommentId: 'comment-del-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedDocument('communityPosts/post-sub-delete/likes', 'user_uid', {
      userId: 'user_uid',
      createdAt: new Date(),
    });

    await seedDocument('communityPosts/post-sub-delete/comments', 'comment-del-1', {
      commentId: 'comment-del-1',
      postId: 'post-sub-delete',
      content: 'Great advice!',
      authorId: 'user_uid',
      authorName: 'User Member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userDb = testEnv.authenticatedContext('user_uid').firestore();
    const postRef = doc(userDb, 'communityPosts', 'post-sub-delete');
    const likeRef = doc(userDb, 'communityPosts', 'post-sub-delete', 'likes', 'user_uid');
    const commentRef = doc(userDb, 'communityPosts', 'post-sub-delete', 'comments', 'comment-del-1');

    // Standalone like deletion without post counter decrement -> MUST FAIL
    await assertFails(deleteDoc(likeRef));

    // Standalone comment deletion without post counter decrement -> MUST FAIL
    await assertFails(deleteDoc(commentRef));

    // Atomic like deletion with post likesCount decrement -> MUST SUCCEED
    await assertSucceeds(
      runTransaction(userDb, async (transaction) => {
        transaction.delete(likeRef);
        transaction.update(postRef, {
          likesCount: 0,
        });
      })
    );

    // Atomic comment deletion with post commentsCount decrement -> MUST SUCCEED
    await assertSucceeds(
      runTransaction(userDb, async (transaction) => {
        transaction.delete(commentRef);
        transaction.update(postRef, {
          commentsCount: 0,
          lastCommentId: 'comment-del-1',
        });
      })
    );
  });

  it('denies unauthorized modifications of immutable order and product fields', async () => {
    await seedDocument('orders', 'order-immutable-test', {
      orderId: 'order-immutable-test',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-wheat-1',
      category: 'crop',
      quantity: 2,
      unitPrice: 50,
      totalPrice: 100,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cash_on_delivery',
      stockDeducted: true,
      stockRestored: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const orderRef = doc(buyerDb, 'orders', 'order-immutable-test');

    // Buyer attempts to modify unitPrice from 50 to 1 -> MUST FAIL
    await assertFails(
      updateDoc(orderRef, {
        unitPrice: 1,
        totalPrice: 2,
        updatedAt: serverTimestamp(),
      })
    );

    // Product owner attempts to change ownerId or createdAt on their product -> MUST FAIL
    const farmerDb = testEnv.authenticatedContext('farmer_uid').firestore();
    const productRef = doc(farmerDb, 'products', 'prod-wheat-1');
    await assertFails(
      updateDoc(productRef, {
        ownerId: 'new_owner_uid',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('enforces strict cross-user confidentiality for orders', async () => {
    await seedDocument('orders', 'order-secret-1', {
      orderId: 'order-secret-1',
      buyerId: 'buyer_uid',
      buyerName: 'Buyer Customer',
      sellerId: 'farmer_uid',
      sellerName: 'Farmer Joe',
      productId: 'prod-wheat-1',
      category: 'crop',
      quantity: 1,
      unitPrice: 50,
      totalPrice: 50,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const charlieDb = testEnv.authenticatedContext('charlie_uid').firestore();
    const orderRef = doc(charlieDb, 'orders', 'order-secret-1');

    // Third party reading an order they are not party to -> MUST FAIL
    await assertFails(getDoc(orderRef));
  });

  it('denies direct document writes that bypass cross-document validations', async () => {
    const buyerDb = testEnv.authenticatedContext('buyer_uid').firestore();
    const orderRef = doc(buyerDb, 'orders', 'order-standalone-1');
    const productRef = doc(buyerDb, 'products', 'prod-wheat-1');

    // Standalone order creation without product stock decrement -> MUST FAIL
    await assertFails(
      setDoc(orderRef, {
        orderId: 'order-standalone-1',
        buyerId: 'buyer_uid',
        buyerName: 'Buyer Customer',
        sellerId: 'seller_uid',
        sellerName: 'Punjab Farmer',
        productId: 'prod-wheat-1',
        category: 'crop',
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cash_on_delivery',
        stockDeducted: true,
        stockRestored: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Standalone product stock update by buyer without an order -> MUST FAIL
    await assertFails(
      updateDoc(productRef, {
        quantity: 15,
        updatedAt: serverTimestamp(),
      })
    );
  });
});
