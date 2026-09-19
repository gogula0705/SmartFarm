import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getSampleProductById } from '../data/sampleProducts';
import { getProductById } from '../services/productService';
import { createOrder } from '../services/orderService';
import { createBooking, calculateRentalDays } from '../services/bookingService';
import {
  getProductReviews,
  checkUserReviewEligibility,
  deleteReview,
} from '../services/reviewService';
import StarRating from '../components/StarRating';
import ReviewModal from '../components/ReviewModal';

/**
 * Format Indian Rupee currency
 */
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Format dates
 */
function formatDate(dateVal) {
  if (!dateVal) return 'Recent';
  try {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

function ProductDetails() {
  const { id } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const sampleProduct = getSampleProductById(id);

  const [product, setProduct] = useState(sampleProduct);
  const [loading, setLoading] = useState(!sampleProduct);
  const [imageError, setImageError] = useState(false);

  // Order modal states
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderError, setOrderError] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Tool booking modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Reviews & Rating states
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewEligibility, setReviewEligibility] = useState({ eligible: false, qualifyingTransaction: null });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const loadProductReviews = useCallback(async (productId) => {
    if (!productId) return;
    try {
      setReviewsLoading(true);
      setReviewsError('');
      const data = await getProductReviews(productId);
      setReviews(data);

      if (user?.uid) {
        const eligibility = await checkUserReviewEligibility(productId, user.uid);
        setReviewEligibility(eligibility);
      } else {
        setReviewEligibility({ eligible: false, qualifyingTransaction: null });
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setReviewsError('Unable to load reviews.');
    } finally {
      setReviewsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isSubscribed = true;

    async function load() {
      if (sampleProduct) {
        setProduct(sampleProduct);
        setLoading(false);
        loadProductReviews(id);
        return;
      }

      try {
        setLoading(true);
        const data = await getProductById(id);
        if (isSubscribed) {
          setProduct(data);
          setLoading(false);
          loadProductReviews(id);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Error loading product by ID:', err);
          setProduct(null);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isSubscribed = false;
    };
  }, [id, sampleProduct, loadProductReviews]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">{t('products.loadingProduct')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center text-3xl">
          🔍
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('products.productNotFound')}</h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          {t('products.productNotFoundDesc')}
        </p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
        >
          <span>{t('products.backToMarketplace')}</span>
        </Link>
      </div>
    );
  }

  const {
    category,
    title,
    description,
    location,
    ownerName,
    images = [],
    status,
    createdAt,
    rating,
    reviewCount,
    // Seed fields
    variety,
    cropType,
    price,
    quantity,
    // Tool fields
    equipmentType,
    condition,
    pricePerHour,
    pricePerDay,
    availability,
    // Crop fields
    quality,
    harvestDate,
  } = product;

  // Category specific styling
  const getCategoryMeta = () => {
    switch (category) {
      case 'seed':
        return {
          icon: '🌱',
          label: t('common.seeds'),
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          gradient: 'from-emerald-50 to-emerald-100',
          actionText: t('marketplace.buySeeds'),
          noticeMessage: 'Purchase functionality will be connected soon.',
        };
      case 'tool':
        return {
          icon: '🚜',
          label: t('marketplace.toolsOnly'),
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          gradient: 'from-blue-50 to-blue-100',
          actionText: t('marketplace.rentTool'),
          noticeMessage: 'Rental functionality will be connected soon.',
        };
      case 'crop':
        return {
          icon: '🌾',
          label: t('marketplace.cropsOnly'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          gradient: 'from-amber-50 to-amber-100',
          actionText: t('marketplace.buyCrop'),
          noticeMessage: 'Purchase functionality will be connected soon.',
        };
      default:
        return {
          icon: '📦',
          label: t('common.all'),
          badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
          gradient: 'from-gray-50 to-gray-100',
          actionText: t('products.confirmOrder'),
          noticeMessage: 'Purchase functionality will be connected soon.',
        };
    }
  };

  const meta = getCategoryMeta();
  const hasImage = Array.isArray(images) && images.length > 0 && Boolean(images[0]) && !imageError;

  // Ownership & Stock Calculations
  const isOwner = Boolean(user?.uid && product?.ownerId && user.uid === product.ownerId);
  const isBuyable = category === 'seed' || category === 'crop';
  const availableQty = typeof quantity === 'number' ? quantity : (Number(quantity) || 0);
  const isOutOfStock = isBuyable && availableQty <= 0;

  const handleOpenOrderModal = () => {
    if (isOutOfStock) return;
    setOrderQuantity(1);
    setOrderError('');
    setIsOrderModalOpen(true);
  };

  const handlePlaceOrder = async (e) => {
    e?.preventDefault();
    if (isSubmittingOrder) return;

    if (!user) {
      setOrderError('Authentication required: Please sign in to place an order.');
      return;
    }

    const qty = Number(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      setOrderError('Quantity must be greater than 0.');
      return;
    }

    if (qty > availableQty) {
      setOrderError('Insufficient quantity available.');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      setOrderError('');

      const buyerName =
        userProfile?.fullName || userProfile?.name || user.displayName || 'SmartFarm Member';

      await createOrder({
        productId: product.id,
        quantity: qty,
        buyerId: user.uid,
        buyerName,
      });

      // Optimistically update local product quantity in state
      setProduct((prev) =>
        prev ? { ...prev, quantity: Math.max(0, availableQty - qty) } : prev
      );
      setIsOrderModalOpen(false);

      navigate('/orders', {
        state: {
          successMessage: `Order placed successfully for ${qty} ${category === 'crop' ? 'kg of' : 'units of'} ${title}!`,
        },
      });
    } catch (err) {
      console.error('Error placing order:', err);
      setOrderError(err.message || 'Unable to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Tool availability & rental handlers
  const isToolUnavailable = category === 'tool' && availability !== 'Available';

  const handleOpenBookingModal = () => {
    if (isToolUnavailable) return;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setStartDate(todayStr);
    setEndDate(tomorrowStr);
    setBookingError('');
    setIsBookingModalOpen(true);
  };

  const handleCreateBooking = async (e) => {
    e?.preventDefault();
    if (isSubmittingBooking) return;

    if (!user) {
      setBookingError('Authentication required: Please sign in to rent equipment.');
      return;
    }

    if (!startDate || !endDate) {
      setBookingError('Both start date and end date are required.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (startDate < todayStr) {
      setBookingError('Start date cannot be before today.');
      return;
    }

    if (endDate < startDate) {
      setBookingError('End date cannot be earlier than start date.');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      setBookingError('');

      const renterName =
        userProfile?.fullName || userProfile?.name || user.displayName || 'SmartFarm Member';

      await createBooking({
        productId: product.id,
        startDate,
        endDate,
        renterId: user.uid,
        renterName,
      });

      setIsBookingModalOpen(false);

      navigate('/bookings', {
        state: {
          successMessage: `Rental booking requested for ${title}!`,
        },
      });
    } catch (err) {
      console.error('Error creating booking:', err);
      setBookingError(err.message || 'Unable to create booking. Please try again.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleOpenReviewModal = () => {
    setReviewToEdit(null);
    setIsReviewModalOpen(true);
  };

  const handleEditReview = (review) => {
    setReviewToEdit(review);
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId || !user?.uid) return;
    const confirmed = window.confirm('Are you sure you want to delete your review?');
    if (!confirmed) return;

    try {
      setDeletingReviewId(reviewId);
      await deleteReview(reviewId, user.uid);

      // Refresh product aggregate and reviews
      const updatedProduct = await getProductById(id);
      if (updatedProduct) {
        setProduct((prev) => ({
          ...prev,
          rating: updatedProduct.rating || 0,
          reviewCount: updatedProduct.reviewCount || 0,
        }));
      }
      await loadProductReviews(id);
    } catch (err) {
      console.error('Error deleting review:', err);
      alert(err.message || 'Failed to delete review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleReviewSaved = async () => {
    const updatedProduct = await getProductById(id);
    if (updatedProduct) {
      setProduct((prev) => ({
        ...prev,
        rating: updatedProduct.rating || 0,
        reviewCount: updatedProduct.reviewCount || 0,
      }));
    }
    await loadProductReviews(id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/marketplace" className="hover:text-emerald-700 transition-colors">
          {t('nav.marketplace')}
        </Link>
        <span>/</span>
        <span className="capitalize">{meta.label}</span>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{title}</span>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Visual Placeholder / Image */}
        <div className="lg:col-span-6 space-y-4">
          <div
            className={`w-full aspect-4/3 rounded-3xl bg-gradient-to-br ${meta.gradient} border border-gray-200 shadow-xs flex items-center justify-center relative overflow-hidden`}
          >
            {hasImage ? (
              <img
                src={images[0]}
                alt={title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <span className="text-8xl block filter drop-shadow-md">
                  {meta.icon}
                </span>
                <span className="text-sm font-semibold text-gray-600 mt-4 uppercase tracking-widest block">
                  {meta.label}
                </span>
              </div>
            )}

            {/* Category Badge */}
            <span
              className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${meta.badgeClass} bg-white/95 shadow-xs backdrop-blur-xs`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </span>

            {/* Status Pill */}
            <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize">{status === 'active' ? t('common.active') : status === 'inactive' ? t('common.inactive') : status || t('common.active')}</span>
            </span>
          </div>

          {/* Location & Farmer Highlight */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-lg border border-emerald-100">
                👨‍🌾
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('products.listedBy')}</p>
                <p className="text-sm font-bold text-gray-900">{ownerName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{t('products.locationLabel')}</p>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1 justify-end">
                <span>📍</span>
                <span>{location}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Product Specifications & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <StarRating rating={rating} reviewCount={reviewCount} size="md" />
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-400">
                  {t('products.listedOn', { date: formatDate(createdAt) })}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-400">ID: {product.id}</span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80">
              {category === 'tool' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      {t('products.dailyRentalRate')}
                    </span>
                    <span className="text-2xl font-extrabold text-blue-700">
                      {formatINR(pricePerDay)}
                      <span className="text-sm font-normal text-gray-500"> /{t('common.perDay')}</span>
                    </span>
                  </div>
                  {pricePerHour > 0 && (
                    <div className="border-l border-gray-200 pl-4">
                      <span className="text-xs text-gray-500 uppercase font-semibold block">
                        {t('products.hourlyRate')}
                      </span>
                      <span className="text-xl font-bold text-gray-700">
                        {formatINR(pricePerHour)}
                        <span className="text-xs font-normal text-gray-500"> /{t('common.perHour')}</span>
                      </span>
                    </div>
                  )}
                </div>
              ) : category === 'crop' ? (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    {t('products.pricePerKg')}
                  </span>
                  <span className="text-2xl font-extrabold text-amber-700">
                    {formatINR(price)}
                    <span className="text-sm font-normal text-gray-500"> /{t('common.perKg')}</span>
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    {t('products.pricePerUnit')}
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {formatINR(price)}
                    <span className="text-sm font-normal text-gray-500"> /{t('common.perUnit')}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                {t('products.aboutListing')}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {description || t('products.noDescription')}
              </p>
            </div>

            {/* Comprehensive Category Specifications Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {t('products.productDetails')}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {category === 'seed' && (
                  <>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.seedVariety')}</span>
                      <span className="font-bold text-gray-800">{variety || 'Standard'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.cropType')}</span>
                      <span className="font-bold text-gray-800">{cropType || 'General'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.availableQuantity')}</span>
                      <span className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}>
                        {isOutOfStock ? t('products.outOfStock') : `${availableQty} kg / units`}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.originLocation')}</span>
                      <span className="font-bold text-gray-800">{location}</span>
                    </div>
                  </>
                )}

                {category === 'tool' && (
                  <>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.equipmentType')}</span>
                      <span className="font-bold text-gray-800">{equipmentType || 'Machinery'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.machineCondition')}</span>
                      <span className="font-bold text-gray-800">{condition || 'Good'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.operationalStatus')}</span>
                      <span className="font-bold text-emerald-700">{availability || 'Available'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.baseLocation')}</span>
                      <span className="font-bold text-gray-800">{location}</span>
                    </div>
                  </>
                )}

                {category === 'crop' && (
                  <>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.qualityGrade')}</span>
                      <span className="font-bold text-gray-800">{quality || 'Grade A'}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.harvestDate')}</span>
                      <span className="font-bold text-gray-800">{formatDate(harvestDate)}</span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.availableQuantity')}</span>
                      <span className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}>
                        {isOutOfStock ? t('products.outOfStock') : `${availableQty} kg`}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-400 block font-medium">{t('products.farmLocation')}</span>
                      <span className="font-bold text-gray-800">{location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Community Rating & Trust Info */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  {t('products.communityTrust')}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {rating} ★ ({reviewCount} reviews)
                </span>
              </div>
              <p className="text-xs text-emerald-800/80 leading-relaxed">
                {t('products.trustDesc')}
              </p>
            </div>

            {/* Primary Action Button / Owner Controls */}
            <div className="pt-2">
              {isOwner ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👨‍🌾</span>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">{t('products.yourProductListing')}</p>
                      <p className="text-xs text-emerald-700">
                        {t('products.yourProductDesc', { category: meta.label.toLowerCase() })}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/edit-product/${product.id}`}
                    className="w-full sm:w-auto text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition-colors"
                  >
                    {t('products.editListing')}
                  </Link>
                </div>
              ) : category === 'tool' ? (
                isToolUnavailable ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-gray-400 bg-gray-100 border border-gray-200 shadow-xs cursor-not-allowed flex items-center justify-center gap-2 text-base"
                  >
                    <span>🚫</span>
                    <span>{t('products.currentlyUnavailable')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenBookingModal}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 text-base bg-blue-600 hover:bg-blue-700"
                  >
                    <span>🚜</span>
                    <span>{t('marketplace.rentTool')}</span>
                  </button>
                )
              ) : isOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-gray-400 bg-gray-100 border border-gray-200 shadow-xs cursor-not-allowed flex items-center justify-center gap-2 text-base"
                >
                  <span>🚫</span>
                  <span>{t('products.outOfStock')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenOrderModal}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 text-base ${
                    category === 'crop'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{category === 'crop' ? t('marketplace.buyCrop') : t('marketplace.buySeeds')}</span>
                </button>
              )}
              <p className="text-center text-xs text-gray-400 mt-2">
                {isOwner
                  ? t('products.manageInventoryNotice')
                  : isOutOfStock
                  ? t('products.outOfStockNotice')
                  : isToolUnavailable
                  ? t('products.toolUnavailableNotice')
                  : category === 'tool'
                  ? t('products.rentalProtectionNotice')
                  : t('products.purchaseProtectionNotice')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* REVIEWS & RATINGS SECTION                          */}
      {/* ================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                {t('reviews.communityFeedback')}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-400">
                {t('reviews.verifiedTransactionsOnly')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('reviews.reviewsAndRatings')}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <StarRating rating={product.rating || 0} reviewCount={product.reviewCount || 0} size="md" />
              {product.reviewCount > 0 ? (
                <span className="text-xs text-gray-500 font-medium">
                  {t('reviews.basedOn', { count: product.reviewCount, unit: product.reviewCount === 1 ? 'review' : 'reviews' })}
                </span>
              ) : null}
            </div>
          </div>

          {/* Eligible user action: "Leave a Review" */}
          {reviewEligibility.eligible && (
            <div>
              <button
                type="button"
                onClick={handleOpenReviewModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <span>⭐</span>
                <span>{t('reviews.leaveReview')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Reviews Content: Loading, Error, Empty, or List */}
        {reviewsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-sm text-gray-500 font-medium">{t('common.loading')}</span>
          </div>
        ) : reviewsError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-sm text-red-700">
            <span>{reviewsError}</span>
            <button
              type="button"
              onClick={() => loadProductReviews(id)}
              className="text-xs font-bold underline cursor-pointer"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <div className="text-3xl">💬</div>
            <h4 className="font-bold text-gray-800 text-base">{t('reviews.noReviewsYet')}</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {t('reviews.noReviewsDesc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((rev) => {
              const isMyReview = user && rev.reviewerId === user.uid;
              return (
                <div key={rev.id} className="py-5 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          {rev.reviewerName || 'SmartFarm Member'}
                        </span>
                        {isMyReview && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {t('common.you')}
                          </span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <StarRating rating={rev.rating} reviewCount={1} showCount={false} size="xs" />
                        <span className="text-xs font-semibold text-gray-700">
                          {rev.rating}/5
                        </span>
                        {rev.transactionType && (
                          <span className="text-[10px] text-gray-400 capitalize">
                            • {rev.transactionType === 'booking' ? t('reviews.verifiedRental') : t('reviews.verifiedPurchase')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit / Delete actions for reviewer's own review */}
                    {isMyReview && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditReview(rev)}
                          className="px-3 py-1 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          disabled={deletingReviewId === rev.id}
                          onClick={() => handleDeleteReview(rev.id)}
                          className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deletingReviewId === rev.id ? t('common.deleting') : t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>

                  {rev.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed pt-1">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* PURCHASE ORDER MODAL                               */}
      {/* ================================================== */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{t('products.buyModalTitle')}</h3>
                  <p className="text-xs text-gray-500">{t('products.buyModalSubtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingOrder}
                onClick={() => setIsOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handlePlaceOrder} className="p-6 space-y-5">
              {/* Product Summary */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                      {meta.label}
                    </span>
                    <p className="font-bold text-gray-900 text-base">{title}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass} bg-white`}>
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-gray-400">{t('products.farmerSeller')}:</span>
                    <p className="font-semibold text-gray-800">{ownerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('products.locationLabel')}:</span>
                    <p className="font-semibold text-gray-800 truncate">📍 {location}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('products.price')}:</span>
                    <p className="font-bold text-emerald-700">{formatINR(price)} {category === 'crop' ? `/${t('common.perKg')}` : `/${t('common.perUnit')}`}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('products.availableQuantity')}:</span>
                    <p className="font-semibold text-gray-800">{availableQty} {category === 'crop' ? 'kg' : 'units'}</p>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label htmlFor="order-quantity" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  {t('products.buyerQuantity', { unit: category === 'crop' ? 'kg' : 'units' })}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="order-quantity"
                    type="number"
                    min="1"
                    max={availableQty}
                    step="1"
                    disabled={isSubmittingOrder}
                    value={orderQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderQuantity(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                      setOrderError('');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 text-lg"
                    placeholder="Enter quantity..."
                    required
                  />
                  <span className="absolute right-3.5 text-xs text-gray-400 font-semibold uppercase">
                    {t('products.maxAllowed', { max: availableQty })}
                  </span>
                </div>
                {orderQuantity > availableQty && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    {t('products.requestedExceeds', { max: availableQty })}
                  </p>
                )}
              </div>

              {/* Price Calculation Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('marketplace.unitQuantity')}:</span>
                  <span className="font-semibold">{Number(orderQuantity) || 0} {category === 'crop' ? 'kg' : 'units'}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('products.price')}:</span>
                  <span className="font-semibold">{formatINR(price)}</span>
                </div>
                <div className="pt-2 border-t border-emerald-200/80 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-emerald-950">{t('products.totalPrice')}</span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {formatINR((Number(orderQuantity) || 0) * (Number(price) || 0))}
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {orderError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{orderError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingOrder}
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder || !orderQuantity || Number(orderQuantity) <= 0 || Number(orderQuantity) > availableQty}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('products.placingOrder')}</span>
                    </>
                  ) : (
                    <>
                      <span>🛒</span>
                      <span>{t('products.confirmOrder')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* TOOL RENTAL BOOKING MODAL                          */}
      {/* ================================================== */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🚜</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{t('products.rentModalTitle')}</h3>
                  <p className="text-xs text-gray-500">{t('products.rentModalSubtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingBooking}
                onClick={() => setIsBookingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateBooking} className="p-6 space-y-5">
              {/* Product Summary */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                      {t('products.equipment')}
                    </span>
                    <p className="font-bold text-gray-900 text-base">{title}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-white text-blue-700 border-blue-200">
                    {equipmentType || 'Machinery'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-gray-400">{t('products.ownerRenter')}:</span>
                    <p className="font-semibold text-gray-800">{ownerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('products.baseLocation')}:</span>
                    <p className="font-semibold text-gray-800 truncate">📍 {location}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('products.dailyRentalRate')}:</span>
                    <p className="font-bold text-blue-700">{formatINR(pricePerDay)} /{t('common.perDay')}</p>
                  </div>
                  {pricePerHour > 0 ? (
                    <div>
                      <span className="text-gray-400">{t('products.hourlyRent')}:</span>
                      <p className="font-semibold text-gray-600">{formatINR(pricePerHour)} /{t('common.perHour')}</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-400">{t('products.operationalStatus')}:</span>
                      <p className="font-semibold text-emerald-700">{availability || 'Available'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="booking-start-date" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('products.startDate')}
                  </label>
                  <input
                    id="booking-start-date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isSubmittingBooking}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setBookingError('');
                      if (endDate && e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="booking-end-date" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('products.endDate')}
                  </label>
                  <input
                    id="booking-end-date"
                    type="date"
                    min={startDate || new Date().toISOString().split('T')[0]}
                    disabled={isSubmittingBooking}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setBookingError('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Rental Duration and Price Calculation */}
              {(() => {
                const days = calculateRentalDays(startDate, endDate);
                const dailyRate = Number(pricePerDay) || 0;
                const totalCalculated = dailyRate * days;

                return (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{t('products.rentalDuration')}</span>
                      <span className="font-semibold text-blue-900">
                        {t('products.inclusiveDays', { count: days, unit: days === 1 ? 'day' : 'days' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{t('products.dailyRentalRate')}:</span>
                      <span className="font-semibold">{formatINR(dailyRate)} /{t('common.perDay')}</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200/80 flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-bold text-blue-950 block">{t('products.totalRentalCost')}</span>
                        <span className="text-[11px] text-blue-600">
                          {formatINR(dailyRate)} × {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <span className="text-2xl font-extrabold text-blue-700">
                        {formatINR(totalCalculated)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Error Alert */}
              {bookingError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingBooking}
                  onClick={() => setIsBookingModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingBooking ||
                    !startDate ||
                    !endDate ||
                    startDate > endDate ||
                    startDate < new Date().toISOString().split('T')[0]
                  }
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('products.creatingBooking')}</span>
                    </>
                  ) : (
                    <>
                      <span>🚜</span>
                      <span>{t('products.confirmBooking')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* REVIEW SUBMISSION / EDIT MODAL                     */}
      {/* ================================================== */}
      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewToEdit(null);
          }}
          productId={product.id}
          productTitle={product.title}
          transactionType={reviewEligibility.qualifyingTransaction?.transactionType || 'order'}
          transactionId={reviewEligibility.qualifyingTransaction?.transactionId || ''}
          reviewToEdit={reviewToEdit}
          onReviewSaved={handleReviewSaved}
        />
      )}
    </div>
  );
}

export default ProductDetails;
