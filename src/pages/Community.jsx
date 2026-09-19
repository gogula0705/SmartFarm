import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import {
  COMMUNITY_CATEGORIES,
  getCommunityPosts,
  getUserLikedPostIds,
  togglePostLike,
  deletePost,
  getCategoryMeta,
} from '../services/communityService';
import CommunityPostCard from '../components/community/CommunityPostCard';
import CreatePostModal from '../components/community/CreatePostModal';

const CATEGORY_KEY_MAP = {
  'General Farming': 'generalFarming',
  'Crops': 'cropsCat',
  'Seeds': 'seedsCat',
  'Tools & Equipment': 'toolsCat',
  'Pest & Disease': 'pestDiseaseCat',
  'Irrigation': 'irrigationCat',
  'Government Schemes': 'govSchemesCat',
  'Market & Prices': 'marketPricesCat',
  'Farming Advice': 'farmingAdviceCat',
};

export default function Community() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const currentUserId = user?.uid;
  const currentUserName = userProfile?.fullName || user?.displayName || 'Farmer Member';
  const currentUserLocation = userProfile?.location || 'Location not provided';

  const [posts, setPosts] = useState([]);
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'oldest' | 'most-liked'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      try {
        setErrorNotice(null);
        const livePosts = await getCommunityPosts(100);
        if (!isMounted) return;
        setPosts(livePosts);

        // Load which posts the current user has liked
        if (currentUserId && livePosts.length > 0) {
          const likedSet = await getUserLikedPostIds(
            currentUserId,
            livePosts.map((p) => p.id)
          );
          if (!isMounted) return;
          setLikedPostIds(likedSet);
        } else if (isMounted) {
          setLikedPostIds(new Set());
        }
      } catch (err) {
        console.error('Failed to load community posts:', err);
        if (isMounted) {
          setErrorNotice(err.message || 'Could not load community discussions. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, refreshTrigger]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle post like toggle
  const handleToggleLike = async (postId) => {
    if (!currentUserId) return;

    const currentlyLiked = likedPostIds.has(postId);
    const newLiked = !currentlyLiked;

    // Optimistic UI updates
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (newLiked) {
        next.add(postId);
      } else {
        next.delete(postId);
      }
      return next;
    });

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentCount = p.likesCount || 0;
          return {
            ...p,
            likesCount: newLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        }
        return p;
      })
    );

    try {
      const result = await togglePostLike(postId, currentUserId);
      // Ensure state matches server source of truth
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (result.liked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: result.likesCount } : p))
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert optimistic update
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const currentCount = p.likesCount || 0;
            return {
              ...p,
              likesCount: currentlyLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
            };
          }
          return p;
        })
      );
    }
  };

  // Handle post deletion
  const handleDeletePost = async (postId) => {
    if (!currentUserId) return;
    try {
      await deletePost(postId, currentUserId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setActionNotice('Discussion deleted successfully.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert(err.message || 'Could not delete post.');
    }
  };

  // Open modal to create post
  const handleOpenCreateModal = () => {
    setPostToEdit(null);
    setIsModalOpen(true);
  };

  // Open modal to edit post
  const handleOpenEditModal = (post) => {
    setPostToEdit(post);
    setIsModalOpen(true);
  };

  // Handle post created or edited
  const handlePostSaved = (savedPost, mode) => {
    if (mode === 'edit') {
      setPosts((prev) =>
        prev.map((p) => (p.id === savedPost.id ? { ...p, ...savedPost } : p))
      );
      setActionNotice('Discussion updated successfully.');
    } else {
      setPosts((prev) => [savedPost, ...prev]);
      setActionNotice('Discussion published successfully.');
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let list = [...posts];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search query (case-insensitive across title, content, authorName, authorLocation, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          p.authorName?.toLowerCase().includes(q) ||
          p.authorLocation?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'oldest') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'most-liked') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      // 'latest' default
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [posts, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background graphics */}
        <div className="absolute -right-10 -bottom-10 text-9xl opacity-10 select-none pointer-events-none">
          🌾
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-semibold backdrop-blur-xs border border-emerald-600/50">
              <span>🌾</span>
              <span>{t('community.badge')}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {t('community.title')}
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              {t('community.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="shrink-0 px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">✍️</span>
            <span>{t('community.startDiscussion')}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('community.searchDiscussions')}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-300/80 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="community-sort" className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline">
              Sort By:
            </label>
            <select
              id="community-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50/80 border border-gray-300/80 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="latest">⏱️ {t('community.latest')}</option>
              <option value="most-liked">❤️ {t('community.mostLiked')}</option>
              <option value="oldest">⏳ {t('community.oldest')}</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills (Horizontal scrolling) */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* All button */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('community.allTopics')}
            </button>

            {/* 9 Agricultural Categories */}
            {COMMUNITY_CATEGORIES.map((cat) => {
              const meta = getCategoryMeta(cat);
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              const catLabel = t(`community.${CATEGORY_KEY_MAP[cat]}`) || cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{catLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feed Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : errorNotice ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h3 className="text-base font-bold text-rose-800">Failed to Load Discussions</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{errorNotice}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : posts.length === 0 ? (
        /* Empty State: No posts in Firestore */
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl mx-auto">
            🌾
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">{t('community.noPostsYet')}</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              {t('community.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <span>✍️</span>
            <span>{t('community.createFirstPost')}</span>
          </button>
        </div>
      ) : filteredAndSortedPosts.length === 0 ? (
        /* Empty State: Search or Category Filter yielded 0 results */
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <h3 className="text-base font-bold text-gray-900">{t('community.noMatchingDiscussions')}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t('marketplace.noProductsDesc')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('community.clearAllFilters')}
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
            >
              {t('community.startDiscussion')}
            </button>
          </div>
        </div>
      ) : (
        /* Community Posts List */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Showing <strong className="text-gray-800">{filteredAndSortedPosts.length}</strong>{' '}
              {filteredAndSortedPosts.length === 1 ? 'discussion' : 'discussions'}
            </span>
            {selectedCategory !== 'all' && (
              <span className="font-medium text-emerald-700">
                Filtered by: {t(`community.${CATEGORY_KEY_MAP[selectedCategory]}`) || selectedCategory}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {filteredAndSortedPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                isLiked={likedPostIds.has(post.id)}
                onToggleLike={handleToggleLike}
                onEditPost={handleOpenEditModal}
                onDeletePost={handleDeletePost}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Post Modal */}
      {isModalOpen && (
        <CreatePostModal
          key={postToEdit?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPostSaved={handlePostSaved}
          postToEdit={postToEdit}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserLocation={currentUserLocation}
        />
      )}
    </div>
  );
}
