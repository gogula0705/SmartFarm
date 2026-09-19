import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import {
  getPostById,
  deletePost,
  togglePostLike,
  checkUserLikedPost,
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  getCategoryMeta,
} from '../services/communityService';
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

function formatFullDate(dateVal) {
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

export default function PostDiscussion() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const currentUserId = user?.uid;
  const currentUserName = userProfile?.fullName || user?.displayName || 'Farmer Member';
  const currentUserLocation = userProfile?.location || 'Location not provided';

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);

  // Comment inline editing state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingCommentId, setSavingCommentId] = useState(null);

  // Post edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function fetchDiscussionData() {
      try {
        setErrorNotice(null);

        const [fetchedPost, fetchedComments, likedStatus] = await Promise.all([
          getPostById(id),
          getPostComments(id),
          currentUserId ? checkUserLikedPost(id, currentUserId) : Promise.resolve(false),
        ]);

        if (!isMounted) return;

        if (!fetchedPost) {
          setErrorNotice('Discussion post not found. It may have been deleted or moved.');
          setPost(null);
        } else {
          setPost(fetchedPost);
          setComments(fetchedComments);
          setIsLiked(likedStatus);
        }
      } catch (err) {
        console.error('Error loading post discussion:', err);
        if (isMounted) {
          setErrorNotice(err.message || 'Failed to load post discussion. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDiscussionData();

    return () => {
      isMounted = false;
    };
  }, [id, currentUserId]);

  const handleToggleLike = async () => {
    if (!currentUserId || !post || likeBusy) return;

    // Optimistic toggle
    const prevLiked = isLiked;
    const prevCount = post.likesCount || 0;
    const optimisticCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    setIsLiked(!prevLiked);
    setPost((prev) => ({ ...prev, likesCount: optimisticCount }));
    setLikeBusy(true);

    try {
      const result = await togglePostLike(post.id, currentUserId);
      setIsLiked(result.liked);
      setPost((prev) => ({ ...prev, likesCount: result.likesCount }));
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update
      setIsLiked(prevLiked);
      setPost((prev) => ({ ...prev, likesCount: prevCount }));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUserId || !post || deletingPost) return;

    try {
      setDeletingPost(true);
      await deletePost(post.id, currentUserId);
      navigate('/community', { replace: true });
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.message || 'Failed to delete post.');
      setDeletingPost(false);
      setDeleteConfirm(false);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPost((prev) => ({
      ...prev,
      ...updatedPost,
    }));
    setIsEditModalOpen(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError(null);

    const trimmed = newCommentText.trim();
    if (!trimmed) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > 1000) {
      setCommentError('Comment cannot exceed 1000 characters.');
      return;
    }

    try {
      setSubmittingComment(true);
      const newComment = await createComment({
        postId: post.id,
        content: trimmed,
        authorId: currentUserId,
        authorName: currentUserName,
      });

      setComments((prev) => [...prev, newComment]);
      setPost((prev) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to create comment:', err);
      setCommentError(err.message || 'Could not publish comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleSaveEditComment = async (commentId) => {
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;

    try {
      setSavingCommentId(commentId);
      const updated = await updateComment(post.id, commentId, trimmed, currentUserId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated.content, updatedAt: updated.updatedAt } : c))
      );
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      console.error('Failed to edit comment:', err);
      alert(err.message || 'Failed to update comment.');
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(post.id, commentId, currentUserId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((prev) => ({
        ...prev,
        commentsCount: Math.max(0, (prev.commentsCount || 1) - 1),
      }));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert(err.message || 'Failed to delete comment.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
        <div className="bg-white p-8 rounded-2xl border border-gray-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded-md"></div>
              <div className="h-3 w-28 bg-gray-200 rounded-md"></div>
            </div>
          </div>
          <div className="h-8 w-3/4 bg-gray-200 rounded-md"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded-md"></div>
            <div className="h-4 w-full bg-gray-200 rounded-md"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorNotice || !post) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <div className="text-5xl mb-4">🌾</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('community.noMatchingDiscussions')}</h1>
        <p className="text-gray-600 text-sm mb-6">
          {errorNotice || 'This community post might have been removed or does not exist.'}
        </p>
        <Link
          to="/community"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          ← {t('community.title')}
        </Link>
      </div>
    );
  }

  const categoryMeta = getCategoryMeta(post.category);
  const isOwner = Boolean(currentUserId && post.authorId === currentUserId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 pt-2">
        <Link to="/community" className="hover:text-emerald-600 font-medium transition-colors">
          ← {t('community.title')}
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-semibold truncate max-w-xs sm:max-w-md">{post.title}</span>
      </nav>

      {/* Main Post Card */}
      <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Post Meta Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center text-lg shadow-sm uppercase shrink-0">
                {post.authorName ? post.authorName.charAt(0) : 'F'}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {post.authorName || 'Farmer Member'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <span>📍</span>
                    <span>{post.authorLocation || t('common.notSpecified')}</span>
                  </span>
                  <span>•</span>
                  <span>{formatFullDate(post.createdAt)}</span>
                  {post.updatedAt && (
                    <>
                      <span>•</span>
                      <span className="italic text-gray-400">{t('common.edit')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Category Pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${categoryMeta.badgeClass}`}
            >
              <span>{categoryMeta.icon}</span>
              <span>{CATEGORY_KEY_MAP[post.category] ? t(`community.${CATEGORY_KEY_MAP[post.category]}`) : post.category}</span>
            </span>
          </div>

          {/* Post Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
            {post.title}
          </h1>

          {/* Post Content */}
          <div className="prose prose-emerald max-w-none text-gray-800 leading-relaxed whitespace-pre-line text-base font-normal">
            {post.content}
          </div>

          {/* Actions & Engagement Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-100">
            {/* Like & Comments Stats */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={likeBusy}
                aria-label={isLiked ? t('community.like') : t('community.like')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                } ${likeBusy ? 'opacity-60 cursor-wait' : ''}`}
              >
                <span className={`text-base ${isLiked ? 'scale-110' : ''}`}>{isLiked ? '❤️' : '🤍'}</span>
                <span>{post.likesCount || 0}</span>
                <span>{post.likesCount === 1 ? t('community.like') : t('community.likes')}</span>
              </button>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                <span>💬</span>
                <span>{comments.length}</span>
                <span>{comments.length === 1 ? t('community.comment') : t('community.comments')}</span>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  ✏️ {t('common.edit')}
                </button>

                {deleteConfirm ? (
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                    <span className="text-xs font-semibold text-rose-700 px-2">{t('community.deleteDiscussionPrompt')}</span>
                    <button
                      type="button"
                      onClick={handleDeletePost}
                      disabled={deletingPost}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {deletingPost ? t('common.deleting') : t('community.deleteConfirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deletingPost}
                      className="px-2 py-1 text-gray-600 hover:bg-rose-100 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                    title="Delete post"
                  >
                    🗑️ {t('common.delete')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Discussion & Comments Thread */}
      <section id="comments" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>{t('community.answersAndDiscussion')}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {comments.length}
            </span>
          </h3>
          <span className="text-xs text-gray-500">Peer-to-peer farmer exchange</span>
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-600 px-1">
            <span>
              {t('community.postingAs')} <strong className="text-gray-900">{currentUserName}</strong>
            </span>
            <span className="text-gray-400">{newCommentText.length}/1000</span>
          </div>

          <textarea
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={submittingComment}
            maxLength={1000}
            placeholder={t('community.commentPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 transition-colors"
          />

          {commentError && (
            <p className="text-xs text-rose-600 font-medium px-1 flex items-center gap-1">
              <span>⚠️</span>
              <span>{commentError}</span>
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingComment || !newCommentText.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              {submittingComment ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Posting Answer...</span>
                </>
              ) : (
                <>
                  <span>{t('community.postAnswer')}</span>
                  <span>💬</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4 pt-4">
          {comments.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
              <span className="text-3xl block mb-2">💬</span>
              <h4 className="text-sm font-semibold text-gray-800">{t('community.noPostsYet')}</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Be the first farmer to share insights, cultivation advice, or answers to this topic!
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isCommentAuthor = Boolean(currentUserId && comment.authorId === currentUserId);
              const isEditingThis = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs uppercase shrink-0">
                        {comment.authorName ? comment.authorName.charAt(0) : 'F'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                          <span>{comment.authorName || 'Farmer Member'}</span>
                          {isCommentAuthor && (
                            <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                              {t('common.you')}
                            </span>
                          )}
                        </div>
                        <time className="text-[11px] text-gray-400">{formatFullDate(comment.createdAt)}</time>
                      </div>
                    </div>

                    {isCommentAuthor && !isEditingThis && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStartEditComment(comment)}
                          className="text-gray-500 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
                        >
                          {t('common.edit')}
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Content / Inline Edit Box */}
                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        disabled={savingCommentId === comment.id}
                        maxLength={1000}
                        className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          disabled={savingCommentId === comment.id}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditComment(comment.id)}
                          disabled={savingCommentId === comment.id || !editingCommentText.trim()}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer"
                        >
                          {savingCommentId === comment.id ? t('common.saving') : t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed pl-10.5">
                      {comment.content}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Edit Post Modal */}
      {isEditModalOpen && (
        <CreatePostModal
          key={post.id}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onPostSaved={handlePostUpdated}
          postToEdit={post}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserLocation={currentUserLocation}
        />
      )}
    </div>
  );
}
