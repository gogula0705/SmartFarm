/**
 * StarRating Component
 * 
 * Renders visual stars, average numeric rating, and review count.
 * Works seamlessly with demo sample data and live Cloud Firestore ratings.
 * 
 * Example:
 * <StarRating rating={4.6} reviewCount={24} />
 * Output: ★★★★½ 4.6 (24)
 */

function StarRating({
  rating = 0,
  reviewCount = 0,
  size = 'sm',
  showCount = true,
  className = '',
}) {
  const numericRating = Number(rating) || 0;
  const count = Number(reviewCount) || 0;

  // Star sizing presets
  const sizeClasses = {
    xs: {
      star: 'w-3 h-3',
      text: 'text-[11px]',
    },
    sm: {
      star: 'w-3.5 h-3.5',
      text: 'text-xs',
    },
    md: {
      star: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      star: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.sm;

  // Helper to render a star (full, half, or empty)
  const renderStar = (starIndex) => {
    // Fill percentage: 0 to 100
    const difference = numericRating - (starIndex - 1);
    let fillType = 'empty';

    if (difference >= 1) {
      fillType = 'full';
    } else if (difference >= 0.3) {
      fillType = 'half';
    }

    if (fillType === 'full') {
      return (
        <svg
          key={starIndex}
          className={`${currentSize.star} text-amber-400 fill-current shrink-0`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (fillType === 'half') {
      return (
        <div key={starIndex} className={`relative ${currentSize.star} shrink-0`}>
          {/* Empty Background Star */}
          <svg
            className={`${currentSize.star} text-gray-200 fill-current absolute inset-0`}
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {/* Half Overlay */}
          <div className="overflow-hidden w-1/2 absolute inset-y-0 left-0">
            <svg
              className={`${currentSize.star} text-amber-400 fill-current`}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      );
    }

    // Empty Star
    return (
      <svg
        key={starIndex}
        className={`${currentSize.star} text-gray-200 fill-current shrink-0`}
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  };

  // If no reviews exist yet
  if (count === 0 || numericRating === 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-gray-400 ${currentSize.text} ${className}`}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <svg
              key={i}
              className={`${currentSize.star} text-gray-200 fill-current shrink-0`}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="font-medium text-gray-400">No reviews yet</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${currentSize.text} ${className}`}>
      {/* 5 Stars Container */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(renderStar)}
      </div>

      {/* Numerical Rating (e.g., 4.6) */}
      <span className="font-bold text-gray-800">
        {numericRating.toFixed(1)}
      </span>

      {/* Review Count (e.g., (24)) */}
      {showCount && (
        <span className="text-gray-500 font-normal">
          ({count})
        </span>
      )}
    </div>
  );
}

export default StarRating;
