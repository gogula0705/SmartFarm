import { useState, useId } from 'react';
import {
  COMMUNITY_CATEGORIES,
  createPost,
  updatePost,
  getCategoryMeta,
} from '../../services/communityService';
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

export default function CreatePostModal({
  isOpen,
  onClose,
  onPostSaved,
  postToEdit = null,
  currentUserId,
  currentUserName,
  currentUserLocation,
}) {
  const { t } = useLanguage();
  const isEditing = Boolean(postToEdit);

  const [title, setTitle] = useState(postToEdit?.title || '');
  const [content, setContent] = useState(postToEdit?.content || '');
  const [category, setCategory] = useState(
    postToEdit?.category && COMMUNITY_CATEGORIES.includes(postToEdit.category)
      ? postToEdit.category
      : COMMUNITY_CATEGORIES[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const categoryId = useId();
  const titleId = useId();
  const contentId = useId();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setErrorMessage('Please provide a title for your post.');
      return;
    }
    if (trimmedTitle.length < 5) {
      setErrorMessage('Post title must be at least 5 characters long.');
      return;
    }
    if (trimmedTitle.length > 150) {
      setErrorMessage('Post title cannot exceed 150 characters.');
      return;
    }

    if (!trimmedContent) {
      setErrorMessage('Please provide the content or description for your post.');
      return;
    }
    if (trimmedContent.length < 10) {
      setErrorMessage('Post content must be at least 10 characters long to provide helpful detail.');
      return;
    }
    if (trimmedContent.length > 3000) {
      setErrorMessage('Post content cannot exceed 3000 characters.');
      return;
    }

    if (!COMMUNITY_CATEGORIES.includes(category)) {
      setErrorMessage('Please select a valid agricultural category.');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing) {
        const updated = await updatePost(
          postToEdit.id,
          {
            title: trimmedTitle,
            content: trimmedContent,
            category,
          },
          currentUserId
        );
        onPostSaved?.(updated, 'edit');
      } else {
        const created = await createPost({
          title: trimmedTitle,
          content: trimmedContent,
          category,
          authorId: currentUserId,
          authorName: currentUserName,
          authorLocation: currentUserLocation,
        });
        onPostSaved?.(created, 'create');
      }

      onClose();
    } catch (err) {
      console.error('Error saving post:', err);
      setErrorMessage(err.message || 'Failed to save post. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryMeta = getCategoryMeta(category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-xs">
              {isEditing ? '✏️' : '🌾'}
            </span>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-gray-900">
                {isEditing ? t('community.editDiscussion') : t('community.startDiscussionModalTitle')}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing
                  ? t('community.editSubtitle')
                  : t('community.startSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Author Badge indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'F'}
              </span>
              <span>
                {t('community.postingAs')} <strong className="text-gray-900">{currentUserName || 'Farmer'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <span>📍</span>
              <span>{currentUserLocation || t('common.notSpecified')}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Category Select */}
          <div>
            <label htmlFor={categoryId} className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              {t('community.categoryField')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id={categoryId}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors appearance-none pr-10"
              >
                {COMMUNITY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_KEY_MAP[cat] ? t(`community.${CATEGORY_KEY_MAP[cat]}`) : cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <span className="mr-1">{selectedCategoryMeta.icon}</span>
                <span className="text-xs">▼</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {t('community.categorySelectHelp')}
            </p>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={titleId} className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {t('community.titleField')} <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] ${title.length > 140 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                {title.length}/150
              </span>
            </div>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              maxLength={150}
              placeholder={t('community.postTitlePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 transition-colors"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={contentId} className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {t('community.contentField')} <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] ${content.length > 2900 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                {content.length}/3000
              </span>
            </div>
            <textarea
              id={contentId}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              maxLength={3000}
              placeholder={t('community.postContentPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400 transition-colors resize-y leading-relaxed"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{isEditing ? t('community.savingChanges') : t('community.publishingPost')}</span>
              </>
            ) : (
              <>
                <span>{isEditing ? t('community.saveChanges') : t('community.publishPost')}</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
