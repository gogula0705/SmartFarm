import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

export const COMMUNITY_CATEGORIES = [
  'General Farming',
  'Crops',
  'Seeds',
  'Tools & Equipment',
  'Pest & Disease',
  'Irrigation',
  'Government Schemes',
  'Market & Prices',
  'Farming Advice',
];

export const CATEGORY_META = {
  'General Farming': {
    icon: '🌾',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  'Crops': {
    icon: '🌽',
    badgeClass: 'bg-lime-50 text-lime-700 border-lime-200',
    dotClass: 'bg-lime-500',
  },
  'Seeds': {
    icon: '🌱',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  'Tools & Equipment': {
    icon: '🚜',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  'Pest & Disease': {
    icon: '🐛',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  'Irrigation': {
    icon: '💧',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  'Government Schemes': {
    icon: '🏛️',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  'Market & Prices': {
    icon: '📈',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  'Farming Advice': {
    icon: '💡',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dotClass: 'bg-yellow-500',
  },
};

/**
 * Get category styling metadata with a fallback
 */
export function getCategoryMeta(category) {
  return (
    CATEGORY_META[category] || {
      icon: '💬',
      badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
      dotClass: 'bg-gray-500',
    }
  );
}

/**
 * Create a new community post
 */
export async function createPost({
  title,
  content,
  category,
  authorId,
  authorName,
  authorLocation,
}) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }

  if (!title || !title.trim()) {
    throw new Error('Post title is required');
  }
  if (!content || !content.trim()) {
    throw new Error('Post content is required');
  }
  if (!category || !COMMUNITY_CATEGORIES.includes(category)) {
    throw new Error('Please select a valid farming category');
  }
  if (!authorId) {
    throw new Error('User must be authenticated to create a post');
  }

  const postsRef = collection(db, 'communityPosts');
  const newPostDoc = doc(postsRef);

  const postData = {
    postId: newPostDoc.id,
    title: title.trim(),
    content: content.trim(),
    category: category.trim(),
    authorId: String(authorId),
    authorName: String(authorName || 'Farmer').trim(),
    authorLocation: String(authorLocation || 'Location not provided').trim(),
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newPostDoc, postData);

  return {
    id: newPostDoc.id,
    ...postData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Fetch community posts ordered by newest first
 */
export async function getCommunityPosts(limitCount = 50) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }

  const postsRef = collection(db, 'communityPosts');
  const q = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

/**
 * Get a single post by ID
 */
export async function getPostById(postId) {
  if (!db || !postId) return null;

  const postRef = doc(db, 'communityPosts', postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) {
    return null;
  }

  return {
    id: postSnap.id,
    ...postSnap.data(),
  };
}

/**
 * Update an existing post (Author only)
 */
export async function updatePost(postId, { title, content, category }, currentUserId) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId) {
    throw new Error('Post ID is required');
  }
  if (!currentUserId) {
    throw new Error('User must be authenticated to edit a post');
  }

  const postRef = doc(db, 'communityPosts', postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }

  const postData = postSnap.data();
  if (postData.authorId !== currentUserId) {
    throw new Error('Unauthorized: You can only edit your own posts');
  }

  if (!title || !title.trim()) {
    throw new Error('Post title is required');
  }
  if (!content || !content.trim()) {
    throw new Error('Post content is required');
  }
  if (!category || !COMMUNITY_CATEGORIES.includes(category)) {
    throw new Error('Please select a valid farming category');
  }

  const updates = {
    title: title.trim(),
    content: content.trim(),
    category: category.trim(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(postRef, updates);

  return {
    id: postId,
    ...postData,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Delete a post and its subcollections (comments & likes) (Author only)
 */
export async function deletePost(postId, currentUserId) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId) {
    throw new Error('Post ID is required');
  }
  if (!currentUserId) {
    throw new Error('User must be authenticated to delete a post');
  }

  const postRef = doc(db, 'communityPosts', postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }

  const postData = postSnap.data();
  if (postData.authorId !== currentUserId) {
    throw new Error('Unauthorized: You can only delete your own posts');
  }

  // Clean up subcollections: comments and likes
  try {
    const commentsRef = collection(db, 'communityPosts', postId, 'comments');
    const commentsSnap = await getDocs(commentsRef);
    if (!commentsSnap.empty) {
      const batch = writeBatch(db);
      commentsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not batch delete comments subcollection:', err);
  }

  try {
    const likesRef = collection(db, 'communityPosts', postId, 'likes');
    const likesSnap = await getDocs(likesRef);
    if (!likesSnap.empty) {
      const batch = writeBatch(db);
      likesSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not batch delete likes subcollection:', err);
  }

  // Delete the root post document
  await deleteDoc(postRef);

  return true;
}

/**
 * Toggle like for a post (1 like per user)
 * Atomically updates likes subcollection and post.likesCount
 */
export async function togglePostLike(postId, userId) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required to like a post');
  }

  return await runTransaction(db, async (transaction) => {
    const postRef = doc(db, 'communityPosts', postId);
    const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);

    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const likeDoc = await transaction.get(likeRef);
    const currentLikes = postDoc.data().likesCount || 0;

    if (likeDoc.exists()) {
      // User has already liked: Unlike post
      transaction.delete(likeRef);
      const newLikesCount = Math.max(0, currentLikes - 1);
      transaction.update(postRef, { likesCount: newLikesCount });
      return { liked: false, likesCount: newLikesCount };
    } else {
      // User has not liked: Add like
      transaction.set(likeRef, {
        userId,
        createdAt: serverTimestamp(),
      });
      const newLikesCount = currentLikes + 1;
      transaction.update(postRef, { likesCount: newLikesCount });
      return { liked: true, likesCount: newLikesCount };
    }
  });
}

/**
 * Check if a single post is liked by the user
 */
export async function checkUserLikedPost(postId, userId) {
  if (!db || !postId || !userId) return false;

  const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

/**
 * Get Set of post IDs liked by user among a specified list of post IDs
 */
export async function getUserLikedPostIds(userId, postIds = []) {
  if (!db || !userId || !postIds || postIds.length === 0) {
    return new Set();
  }

  const results = await Promise.all(
    postIds.map(async (postId) => {
      try {
        const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);
        const snap = await getDoc(likeRef);
        return snap.exists() ? postId : null;
      } catch {
        return null;
      }
    })
  );

  return new Set(results.filter(Boolean));
}

/**
 * Create a new comment on a post
 * Atomically creates comment document and increments post.commentsCount
 */
export async function createComment({ postId, content, authorId, authorName }) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId) {
    throw new Error('Post ID is required');
  }
  if (!authorId) {
    throw new Error('User must be authenticated to comment');
  }
  if (!content || !content.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  const postRef = doc(db, 'communityPosts', postId);
  const commentsColRef = collection(db, 'communityPosts', postId, 'comments');
  const newCommentDoc = doc(commentsColRef);

  return await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const currentComments = postDoc.data().commentsCount || 0;
    const commentData = {
      commentId: newCommentDoc.id,
      postId,
      content: content.trim(),
      authorId: String(authorId),
      authorName: String(authorName || 'Farmer').trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(newCommentDoc, commentData);
    transaction.update(postRef, {
      commentsCount: currentComments + 1,
    });

    return {
      id: newCommentDoc.id,
      ...commentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

/**
 * Fetch all comments for a post ordered chronologically (oldest first)
 */
export async function getPostComments(postId) {
  if (!db || !postId) return [];

  const commentsRef = collection(db, 'communityPosts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

/**
 * Update an existing comment (Author only)
 */
export async function updateComment(postId, commentId, content, currentUserId) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId || !commentId) {
    throw new Error('Post ID and Comment ID are required');
  }
  if (!currentUserId) {
    throw new Error('User must be authenticated to edit a comment');
  }
  if (!content || !content.trim()) {
    throw new Error('Comment content cannot be empty');
  }

  const commentRef = doc(db, 'communityPosts', postId, 'comments', commentId);
  const commentSnap = await getDoc(commentRef);

  if (!commentSnap.exists()) {
    throw new Error('Comment not found');
  }

  const commentData = commentSnap.data();
  if (commentData.authorId !== currentUserId) {
    throw new Error('Unauthorized: You can only edit your own comment');
  }

  const updates = {
    content: content.trim(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(commentRef, updates);

  return {
    id: commentId,
    ...commentData,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Delete a comment (Author only)
 * Atomically deletes comment document and decrements post.commentsCount
 */
export async function deleteComment(postId, commentId, currentUserId) {
  if (!db) {
    throw new Error('Database service is not initialized');
  }
  if (!postId || !commentId) {
    throw new Error('Post ID and Comment ID are required');
  }
  if (!currentUserId) {
    throw new Error('User must be authenticated to delete a comment');
  }

  const postRef = doc(db, 'communityPosts', postId);
  const commentRef = doc(db, 'communityPosts', postId, 'comments', commentId);

  return await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    const commentDoc = await transaction.get(commentRef);

    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentDoc.data();
    if (commentData.authorId !== currentUserId) {
      throw new Error('Unauthorized: You can only delete your own comment');
    }

    transaction.delete(commentRef);

    if (postDoc.exists()) {
      const currentComments = postDoc.data().commentsCount || 0;
      transaction.update(postRef, {
        commentsCount: Math.max(0, currentComments - 1),
      });
    }

    return true;
  });
}
