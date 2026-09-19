import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getUserBookings, cancelBooking } from '../services/bookingService';
import { getUserReviewedTransactionIds } from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';

/**
 * Format Indian Rupee currency (e.g. ₹1,800)
 */
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Format timestamp into readable Indian date and time
 */
function formatDateTime(dateVal) {
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
    return String(dateVal);
  }
}

/**
 * Format date string (YYYY-MM-DD) to friendly Indian date (e.g. 20 Sep 2026)
 */
function formatSimpleDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Status styling and visual metadata
 */
function getStatusMeta(status = 'pending', t) {
  const s = String(status).toLowerCase();
  switch (s) {
    case 'confirmed':
      return {
        label: t ? t('common.confirmed') : 'Confirmed',
        icon: '✓',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500',
        description: 'Rental confirmed by the equipment owner. Machinery reserved.',
      };
    case 'completed':
      return {
        label: t ? t('common.completed') : 'Completed',
        icon: '🎉',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        description: 'Equipment used and safely returned. Rental successfully completed.',
      };
    case 'cancelled':
      return {
        label: t ? t('common.cancelled') : 'Cancelled',
        icon: '✕',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
        description: 'This equipment reservation was cancelled.',
      };
    case 'pending':
    default:
      return {
        label: t ? t('common.pending') : 'Pending',
        icon: '⏳',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        description: t ? t('bookings.bookingSubmitted') : 'Booking request sent. Awaiting equipment owner acceptance.',
      };
  }
}

function Bookings() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.uid));
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState(location.state?.successMessage || '');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [reviewedTxIds, setReviewedTxIds] = useState(new Set());
  const [reviewingBooking, setReviewingBooking] = useState(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadBookings() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const [userBookings, reviewedIds] = await Promise.all([
          getUserBookings(user.uid),
          getUserReviewedTransactionIds(user.uid),
        ]);
        if (isSubscribed) {
          setBookings(userBookings);
          setReviewedTxIds(reviewedIds);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Failed to load user bookings:', err);
          setError(err.message || 'Unable to load bookings. Please try again.');
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId) => {
    if (!bookingId || !user?.uid) return;

    const confirmed = window.confirm(
      t('bookings.cancelConfirmPrompt')
    );
    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError('');
      await cancelBooking(bookingId, user.uid);

      // Optimistically update local booking status
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId || b.bookingId === bookingId
            ? { ...b, status: 'cancelled', updatedAt: new Date().toISOString() }
            : b
        )
      );

      // Also update selected booking if currently viewing modal
      if (selectedBooking && (selectedBooking.id === bookingId || selectedBooking.bookingId === bookingId)) {
        setSelectedBooking((prev) => ({
          ...prev,
          status: 'cancelled',
        }));
      }

      setSuccessBanner(t('bookings.cancelSuccess'));
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError(err.message || 'Unable to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  // Filter bookings by status tab
  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'all') return true;
    return (b.status || 'pending').toLowerCase() === filterStatus;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ================================================== */}
      {/* 1. HEADER & NAVIGATION                             */}
      {/* ================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
              {t('bookings.equipmentBadge')}
            </span>
            <span className="text-xs text-gray-400">
              {t('bookings.rentalsCount', { count: bookings.length, unit: bookings.length === 1 ? 'Rental' : 'Rentals' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('bookings.title')}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('bookings.subtitle')}
          </p>
        </div>

        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <span>🚜</span>
          <span>{t('bookings.exploreTools')}</span>
        </Link>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✅</span>
            <p className="text-sm font-semibold">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-800 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs font-bold underline cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. STATUS TABS                                     */}
      {/* ================================================== */}
      {!loading && bookings.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: t('bookings.allBookings'), count: bookings.length },
            { id: 'pending', label: t('common.pending'), count: bookings.filter((b) => (b.status || 'pending').toLowerCase() === 'pending').length },
            { id: 'confirmed', label: t('common.confirmed'), count: bookings.filter((b) => (b.status || '').toLowerCase() === 'confirmed').length },
            { id: 'completed', label: t('common.completed'), count: bookings.filter((b) => (b.status || '').toLowerCase() === 'completed').length },
            { id: 'cancelled', label: t('common.cancelled'), count: bookings.filter((b) => (b.status || '').toLowerCase() === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterStatus === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ================================================== */}
      {/* 3. BOOKINGS LIST OR EMPTY STATE                    */}
      {/* ================================================== */}
      {loading ? (
        /* Loading Skeletons */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded-md w-48" />
                  <div className="h-3 bg-gray-200 rounded-md w-32" />
                  <div className="h-3 bg-gray-200 rounded-md w-24" />
                </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="h-6 bg-gray-200 rounded-md w-24" />
                <div className="h-10 bg-gray-200 rounded-xl w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-3xl">
            🚜
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('bookings.noBookings')}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {t('bookings.noBookingsDesc')}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>{t('bookings.exploreTools')}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Filtered Empty State */
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          {t('bookings.noBookingsFiltered', { status: filterStatus })}
        </div>
      ) : (
        /* Booking Cards Grid / List */
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusMeta = getStatusMeta(booking.status, t);
            const isPending = (booking.status || '').toLowerCase() === 'pending';
            const isCancellingThis = cancellingId === (booking.id || booking.bookingId);

            return (
              <div
                key={booking.id || booking.bookingId}
                className="bg-white rounded-3xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Image & Product Info */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 border border-gray-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {booking.productImage ? (
                      <img
                        src={booking.productImage}
                        alt={booking.productTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🚜</span>
                    )}
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                      🚜
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {booking.equipmentType || t('products.equipment')}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400 truncate font-mono">
                        ID: {(booking.id || booking.bookingId || '').slice(-8)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                      {booking.productTitle}
                    </h3>

                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                      <span>{t('bookings.owner')}: <strong className="text-gray-700 font-semibold">{booking.ownerName || 'Equipment Owner'}</strong></span>
                      {booking.location && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>📍 {booking.location}</span>
                        </>
                      )}
                    </p>

                    {/* Rental Schedule Display */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-700 pt-0.5">
                      <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/70">
                        <span>📅</span>
                        <span>{formatSimpleDate(booking.startDate)} → {formatSimpleDate(booking.endDate)}</span>
                        <span className="font-bold text-blue-700 ml-1">({booking.rentalDays} {booking.rentalDays === 1 ? t('common.perDay') : t('common.perDay')})</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 pt-0.5">
                      {t('orders.orderDate', { date: formatDateTime(booking.createdAt) })}
                    </p>
                  </div>
                </div>

                {/* Right: Pricing, Status & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center lg:items-center justify-between lg:justify-end gap-4 lg:gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                  {/* Daily Rate */}
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-400">{t('products.dailyRent')}</p>
                    <p className="text-xs font-semibold text-gray-800">
                      {formatINR(booking.pricePerDay)} /{t('common.perDay')}
                    </p>
                  </div>

                  {/* Total Price */}
                  <div className="text-left sm:text-right min-w-[90px]">
                    <span className="text-[11px] text-gray-400 block font-medium uppercase tracking-wider">
                      {t('products.totalPrice')}
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-blue-700">
                      {formatINR(booking.totalPrice)}
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${statusMeta.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass} animate-pulse`} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        disabled={isCancellingThis}
                        onClick={() => handleCancelBooking(booking.id || booking.bookingId)}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                      >
                        {isCancellingThis ? t('common.loading') : t('common.cancel')}
                      </button>
                    )}

                    {(booking.status || '').toLowerCase() === 'completed' && (
                      reviewedTxIds.has(booking.id || booking.bookingId) ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <span>✓</span>
                          <span>{t('bookings.reviewed')}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingBooking(booking)}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
                        >
                          <span>⭐</span>
                          <span>{t('bookings.reviewTool')}</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBooking(booking)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      {t('bookings.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================== */}
      {/* 4. BOOKING DETAILS MODAL                           */}
      {/* ================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🚜</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{t('bookings.bookingDetailsTitle')}</h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {selectedBooking.id || selectedBooking.bookingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-full bg-gray-200/70 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Status Header */}
              {(() => {
                const sMeta = getStatusMeta(selectedBooking.status, t);
                return (
                  <div className={`p-4 rounded-2xl border ${sMeta.badgeClass} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{t('products.status')}</p>
                      <p className="text-base font-extrabold flex items-center gap-1.5 mt-0.5">
                        <span>{sMeta.icon}</span>
                        <span>{sMeta.label}</span>
                      </p>
                      <p className="text-xs mt-1 opacity-90">{sMeta.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Tool Summary Card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedBooking.productImage ? (
                    <img
                      src={selectedBooking.productImage}
                      alt={selectedBooking.productTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🚜</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                    {selectedBooking.equipmentType || t('products.equipment')}
                  </span>
                  <h4 className="font-bold text-gray-900 text-base truncate">
                    {selectedBooking.productTitle}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t('bookings.owner')}: <strong className="text-gray-800">{selectedBooking.ownerName}</strong>
                  </p>
                </div>
              </div>

              {/* Rental Dates & Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.startDate')}</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatSimpleDate(selectedBooking.startDate)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.endDate')}</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatSimpleDate(selectedBooking.endDate)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('bookings.rentalPeriod')}</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {selectedBooking.rentalDays} {t('common.perDay')}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.dailyRentalRate')}</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatINR(selectedBooking.pricePerDay)} /{t('common.perDay')}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.locationLabel')}</span>
                  <span className="font-bold text-gray-800 truncate block">
                    📍 {selectedBooking.location || 'SmartFarm Base'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('orders.orderDate', { date: '' }).replace(': ', '')}</span>
                  <span className="font-bold text-gray-800 text-[11px] block">
                    {formatDateTime(selectedBooking.createdAt)}
                  </span>
                </div>
              </div>

              {/* Total Cost Card */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                    {t('products.totalPrice')}
                  </span>
                  <span className="text-xs text-blue-600">
                    {formatINR(selectedBooking.pricePerDay)} × {selectedBooking.rentalDays}
                  </span>
                </div>
                <span className="text-3xl font-extrabold text-blue-700">
                  {formatINR(selectedBooking.totalPrice)}
                </span>
              </div>

              {/* Community Assurance Notice */}
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                {t('products.rentalProtectionNotice')}
              </p>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center gap-3">
                {(selectedBooking.status || '').toLowerCase() === 'pending' && (
                  <button
                    type="button"
                    disabled={cancellingId === (selectedBooking.id || selectedBooking.bookingId)}
                    onClick={() => handleCancelBooking(selectedBooking.id || selectedBooking.bookingId)}
                    className="flex-1 py-3 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {cancellingId === (selectedBooking.id || selectedBooking.bookingId)
                      ? t('common.loading')
                      : t('bookings.cancelBooking')}
                  </button>
                )}
                {(selectedBooking.status || '').toLowerCase() === 'completed' && (
                  reviewedTxIds.has(selectedBooking.id || selectedBooking.bookingId) ? (
                    <span className="flex-1 py-3 px-4 rounded-xl text-center text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      {t('bookings.reviewed')} ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedBooking;
                        setSelectedBooking(null);
                        setReviewingBooking(target);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>⭐</span>
                      <span>{t('bookings.reviewTool')}</span>
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 5. REVIEW MODAL                                    */}
      {/* ================================================== */}
      {reviewingBooking && (
        <ReviewModal
          isOpen={Boolean(reviewingBooking)}
          onClose={() => setReviewingBooking(null)}
          productId={reviewingBooking.productId}
          productTitle={reviewingBooking.productTitle}
          transactionType="booking"
          transactionId={reviewingBooking.id || reviewingBooking.bookingId}
          onReviewSaved={async () => {
            if (user?.uid) {
              const reviewed = await getUserReviewedTransactionIds(user.uid);
              setReviewedTxIds(reviewed);
            }
            setSuccessBanner('Thank you for submitting your equipment review!');
          }}
        />
      )}
    </div>
  );
}

export default Bookings;
