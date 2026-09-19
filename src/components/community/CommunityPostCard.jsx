import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryMeta } from '../../services/communityService';
import { useLanguage } from '../../context/useLanguage';

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

/**
 * Format timestamp into readable Indian date and time
 */
function formatPostDate(dateVal) {
  if (!dateVal) return 'Recent';
  try {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recent';
  }
}

export default function CommunityPostCard({
  post,
  currentUserId,
  isLiked = false,
  onToggleLike,
  onEditPost,
  onDeletePost,
}) {
  const { t } = useLanguage();
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = Boolean(currentUserId && post?.authorId === currentUserId);
  const categoryMeta = getCategoryMeta(post.category);

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeBusy || !onToggleLike) return;

    try {
      setLikeBusy(true);
      await onToggleLike(post.id);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleDeleteClick = async () => {
    if (deleting || !onDeletePost) return;
    try {
      setDeleting(true);
      await onDeletePost(post.id);
    } catch (err) {
      console.error('Failed to delete post:', err);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Card Header: Author & Category */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Author info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-xs uppercase shrink-0">
              {post.authorName ? post.authorName.charAt(0) : 'F'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                {post.authorName || 'Farmer Member'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-0.5">
                  <span>📍</span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {post.authorLocation || 'Location not provided'}
                  </span>
                </span>
                <span>•</span>
                <time className="text-gray-400">{formatPostDate(post.createdAt)}</time>
              </div>
            </div>
          </div>

          {/* Category Badge */}
          <div className="shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${categoryMeta.badgeClass}`}
            >
              <span>{categoryMeta.icon}</span>
              <span>{CATEGORY_KEY_MAP[post.category] ? t(`community.${CATEGORY_KEY_MAP[post.category]}`) : post.category}</span>
            </span>
          </div>
        </div>

        {/* Title */}
        <Link
          to={`/community/post/${post.id}`}
          className="block group focus:outline-hidden"
        >
          <h2 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-2">
            {post.title}
          </h2>
        </Link>

        {/* Content snippet */}
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Card Footer: Interactive Actions & Owner controls */}
      <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Engagement buttons */}
        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={likeBusy}
            aria-label={isLiked ? t('community.like') : t('community.like')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              isLiked
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
            } ${likeBusy ? 'opacity-60 cursor-wait' : ''}`}
          >
            <span className={isLiked ? 'text-rose-500 scale-110 transition-transform' : ''}>
              {isLiked ? '❤️' : '🤍'}
            </span>
            <span>{post.likesCount || 0}</span>
            <span className="hidden xs:inline">{post.likesCount === 1 ? t('community.like') : t('community.likes')}</span>
          </button>

          {/* Comments count / link */}
          <Link
            to={`/community/post/${post.id}#comments`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 font-semibold transition-colors"
          >
            <span>💬</span>
            <span>{post.commentsCount || 0}</span>
            <span className="hidden xs:inline">{post.commentsCount === 1 ? t('community.comment') : t('community.comments')}</span>
          </Link>
        </div>

        {/* Right side: View Discussion & Owner Controls */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <div className="flex items-center gap-1 mr-1 border-r border-gray-200 pr-2">
              <button
                type="button"
                onClick={() => onEditPost?.(post)}
                className="px-2 py-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md font-medium transition-colors cursor-pointer"
                title="Edit your post"
              >
                ✏️ {t('common.edit')}
              </button>
              {deleteConfirm ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold transition-colors cursor-pointer"
                  >
                    {deleting ? t('common.deleting') : t('community.deleteConfirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-1.5 py-1 text-gray-500 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="px-2 py-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md font-medium transition-colors cursor-pointer"
                  title="Delete your post"
                >
                  🗑️
                </button>
              )}
            </div>
          )}

          <Link
            to={`/community/post/${post.id}`}
            className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors py-1"
          >
            <span>{t('community.viewDiscussion')}</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
