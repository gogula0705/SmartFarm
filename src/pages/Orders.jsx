import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getUserOrders } from '../services/orderService';
import { getUserReviewedTransactionIds } from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';

/**
 * Format Indian Rupee currency (e.g. ₹425)
 */
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Format timestamp into readable Indian date and time
 */
function formatDate(dateVal) {
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
 * Status meta and styling
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
        description: 'Order confirmed by the seller. Fulfillment preparation in progress.',
      };
    case 'completed':
      return {
        label: t ? t('common.completed') : 'Completed',
        icon: '🎉',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        description: 'Order fulfilled and received successfully.',
      };
    case 'cancelled':
      return {
        label: t ? t('common.cancelled') : 'Cancelled',
        icon: '✕',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
        description: 'This order was cancelled.',
      };
    case 'pending':
    default:
      return {
        label: t ? t('common.pending') : 'Pending',
        icon: '⏳',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        description: t ? t('orders.orderSubmitted') : 'Order submitted. Awaiting seller confirmation and dispatch.',
      };
  }
}

function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.uid));
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState(location.state?.successMessage || '');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewedTxIds, setReviewedTxIds] = useState(new Set());
  const [reviewingOrder, setReviewingOrder] = useState(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadOrders() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const [userOrders, reviewedIds] = await Promise.all([
          getUserOrders(user.uid),
          getUserReviewedTransactionIds(user.uid),
        ]);
        if (isSubscribed) {
          setOrders(userOrders);
          setReviewedTxIds(reviewedIds);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Failed to load user orders:', err);
          setError(err.message || 'Unable to load orders. Please try again.');
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // Filter orders by status tab
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true;
    return (order.status || 'pending').toLowerCase() === filterStatus;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ================================================== */}
      {/* 1. HEADER & BREADCRUMBS                            */}
      {/* ================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
              {t('orders.myOrdersBadge')}
            </span>
            <span className="text-xs text-gray-400">
              {t('orders.purchasesCount', { count: orders.length, unit: orders.length === 1 ? 'Purchase' : 'Purchases' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('orders.title')}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('orders.subtitle')}
          </p>
        </div>

        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <span>🌾</span>
          <span>{t('orders.exploreMarketplace')}</span>
        </Link>
      </div>

      {/* Success Notification Banner (after placing order) */}
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
      {/* 2. STATUS TABS (if orders exist)                   */}
      {/* ================================================== */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: t('orders.allOrders'), count: orders.length },
            { id: 'pending', label: t('common.pending'), count: orders.filter((o) => (o.status || 'pending').toLowerCase() === 'pending').length },
            { id: 'confirmed', label: t('common.confirmed'), count: orders.filter((o) => (o.status || '').toLowerCase() === 'confirmed').length },
            { id: 'completed', label: t('common.completed'), count: orders.filter((o) => (o.status || '').toLowerCase() === 'completed').length },
            { id: 'cancelled', label: t('common.cancelled'), count: orders.filter((o) => (o.status || '').toLowerCase() === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
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
      {/* 3. ORDER LIST OR EMPTY STATE                       */}
      {/* ================================================== */}
      {loading ? (
        /* Loading Skeleton */
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
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-3xl">
            📦
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('orders.noOrders')}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {t('orders.noOrdersDesc')}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>{t('orders.exploreMarketplace')}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Filtered Empty State */
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          {t('orders.noOrdersFiltered', { status: filterStatus })}
        </div>
      ) : (
        /* Order Cards Grid / List */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusMeta = getStatusMeta(order.status, t);
            const categoryIcon = order.category === 'seed' ? '🌱' : order.category === 'crop' ? '🌾' : '📦';
            const categoryLabel = order.category === 'seed' ? t('common.seeds') : order.category === 'crop' ? t('common.crops') : order.category;

            return (
              <div
                key={order.id || order.orderId}
                className="bg-white rounded-3xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Image & Product Info */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 border border-gray-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {order.productImage ? (
                      <img
                        src={order.productImage}
                        alt={order.productTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{categoryIcon}</span>
                    )}
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                      {categoryIcon}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 capitalize">
                        {categoryLabel}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400 truncate">
                        ID: {(order.id || order.orderId || '').slice(-8)}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                      {order.productTitle}
                    </h3>

                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                      <span>{t('orders.seller')}: <strong className="text-gray-700 font-semibold">{order.sellerName || 'Farmer'}</strong></span>
                      {order.location && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>📍 {order.location}</span>
                        </>
                      )}
                    </p>

                    <p className="text-[11px] text-gray-400">
                      {t('orders.orderDate', { date: formatDate(order.createdAt) })}
                    </p>
                  </div>
                </div>

                {/* Right: Quantity, Pricing & Action */}
                <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center lg:items-center justify-between lg:justify-end gap-4 lg:gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                  {/* Quantity & Unit price */}
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-500">
                      {t('orders.quantityLabel')} <strong className="text-gray-800">{order.quantity} {order.category === 'crop' ? 'kg' : 'units'}</strong>
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('orders.unitPriceLabel', { price: formatINR(order.unitPrice) })}
                    </p>
                  </div>

                  {/* Total Price */}
                  <div className="text-left sm:text-right min-w-[90px]">
                    <span className="text-[11px] text-gray-400 block font-medium uppercase tracking-wider">
                      {t('orders.totalLabel')}
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                      {formatINR(order.totalPrice)}
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
                    {(order.status || '').toLowerCase() === 'completed' && (
                      reviewedTxIds.has(order.id || order.orderId) ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <span>✓</span>
                          <span>{t('orders.reviewed')}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingOrder(order)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
                        >
                          <span>⭐</span>
                          <span>{t('orders.reviewProduct')}</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      {t('orders.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================== */}
      {/* 4. ORDER DETAILS MODAL                             */}
      {/* ================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{t('orders.orderDetailsTitle')}</h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {selectedOrder.id || selectedOrder.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
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
                const sMeta = getStatusMeta(selectedOrder.status, t);
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

              {/* Product Info */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedOrder.productImage ? (
                    <img
                      src={selectedOrder.productImage}
                      alt={selectedOrder.productTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">
                      {selectedOrder.category === 'seed' ? '🌱' : '🌾'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    {selectedOrder.category === 'seed' ? t('common.seeds') : t('common.crops')}
                  </span>
                  <h4 className="font-bold text-gray-900 text-base truncate">
                    {selectedOrder.productTitle}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t('orders.seller')}: <strong className="text-gray-800">{selectedOrder.sellerName}</strong>
                  </p>
                </div>
              </div>

              {/* Transaction Specifications Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.quantity')}</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {selectedOrder.quantity} {selectedOrder.category === 'crop' ? 'kg' : 'units'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.price')}</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formatINR(selectedOrder.unitPrice)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('products.locationLabel')}</span>
                  <span className="font-bold text-gray-800 truncate block">
                    📍 {selectedOrder.location || 'Tamil Nadu, India'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block uppercase font-medium">{t('orders.orderDate', { date: '' }).replace(': ', '')}</span>
                  <span className="font-bold text-gray-800 text-[11px] block">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>
              </div>

              {/* Total Price Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                    {t('orders.totalLabel')}
                  </span>
                  <span className="text-xs text-emerald-700">
                    {t('common.currency')}
                  </span>
                </div>
                <span className="text-3xl font-extrabold text-emerald-700">
                  {formatINR(selectedOrder.totalPrice)}
                </span>
              </div>

              {/* Direct Marketplace Purchase Notice */}
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                {t('products.purchaseProtectionNotice')}
              </p>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center gap-3">
                {(selectedOrder.status || '').toLowerCase() === 'completed' && (
                  reviewedTxIds.has(selectedOrder.id || selectedOrder.orderId) ? (
                    <span className="flex-1 py-3 px-4 rounded-xl text-center text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      {t('orders.reviewed')} ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedOrder;
                        setSelectedOrder(null);
                        setReviewingOrder(target);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>⭐</span>
                      <span>{t('orders.reviewProduct')}</span>
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
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
      {reviewingOrder && (
        <ReviewModal
          isOpen={Boolean(reviewingOrder)}
          onClose={() => setReviewingOrder(null)}
          productId={reviewingOrder.productId}
          productTitle={reviewingOrder.productTitle}
          transactionType="order"
          transactionId={reviewingOrder.id || reviewingOrder.orderId}
          onReviewSaved={async () => {
            if (user?.uid) {
              const reviewed = await getUserReviewedTransactionIds(user.uid);
              setReviewedTxIds(reviewed);
            }
            setSuccessBanner('Thank you for submitting your review!');
          }}
        />
      )}
    </div>
  );
}

export default Orders;
