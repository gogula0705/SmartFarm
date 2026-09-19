import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { createReview, updateReview } from '../services/reviewService';

function ReviewModalDialog({
  onClose,
  productId,
  productTitle = '',
  transactionType = 'order',
  transactionId = '',
  reviewToEdit = null,
  onReviewSaved,
}) {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();

  const [rating, setRating] = useState(reviewToEdit?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(reviewToEdit?.comment || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(reviewToEdit);
  const activeRating = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user) {
      setError('You must be signed in to submit a review.');
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (isEditing) {
        await updateReview(
          reviewToEdit.id,
          {
            rating,
            comment: comment.trim(),
          },
          user.uid
        );
      } else {
        const reviewerName =
          userProfile?.fullName || userProfile?.name || user.displayName || 'SmartFarm Member';

        await createReview({
          productId,
          reviewerId: user.uid,
          reviewerName,
          transactionType,
          transactionId,
          rating,
          comment: comment.trim(),
        });
      }

      if (onReviewSaved) {
        await onReviewSaved();
      }

      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {isEditing ? t('reviews.editReview') : t('reviews.writeReview')}
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-xs">
                {productTitle || t('reviews.communityFeedback')}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Star Rating Selector */}
          <div className="text-center space-y-2 py-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              {t('reviews.yourRating')} <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= activeRating;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={isSubmitting}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      setRating(star);
                      setError('');
                    }}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-110 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      className={`w-9 h-9 transition-colors ${
                        isLit ? 'text-amber-400 fill-current' : 'text-gray-200 fill-current'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-amber-700 h-4">
              {activeRating > 0 ? `${activeRating} ${activeRating > 1 ? 'Stars' : 'Star'} • ${t(`reviews.ratingLabels.${activeRating}`)}` : t('reviews.tapStarsToRate')}
            </p>
          </div>

          {/* Comment Textarea */}
          <div>
            <label htmlFor="review-comment" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {t('reviews.reviewComment')} <span className="text-gray-400 font-normal lowercase">{t('reviews.commentOptional')}</span>
            </label>
            <textarea
              id="review-comment"
              rows={4}
              disabled={isSubmitting}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('reviews.shareExperience')}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm placeholder:text-gray-400 resize-none transition-all"
              maxLength={1000}
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{t('reviews.commentHelper')}</span>
              <span>{comment.length}/1000</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Metadata Notice */}
          {!isEditing && transactionId && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 text-[11px] text-gray-500 flex items-center justify-between">
              <span>{transactionType === 'booking' ? t('reviews.verifiedRental') : t('reviews.verifiedPurchase')}</span>
              <span className="font-mono text-gray-400">ID: {transactionId.slice(-8)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rating || rating < 1}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isEditing ? t('reviews.updating') : t('reviews.submitting')}</span>
                </>
              ) : (
                <span>{isEditing ? t('reviews.updateReview') : t('reviews.submitReview')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewModal(props) {
  if (!props.isOpen) return null;
  const key = props.reviewToEdit ? `edit-${props.reviewToEdit.id}` : `new-${props.transactionId || 'review'}`;
  return <ReviewModalDialog key={key} {...props} />;
}

export default ReviewModal;
