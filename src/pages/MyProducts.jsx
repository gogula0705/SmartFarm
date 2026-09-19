import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getUserProducts, deleteProduct, updateProductStatus } from '../services/productService';

/**
 * Format currency in Indian Rupees (₹)
 */
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function MyProducts() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(Boolean(user?.uid));
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating state for optimistic feedback
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Image load error tracker by product ID
  const [brokenImages, setBrokenImages] = useState({});

  // Re-fetch trigger state
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isSubscribed = true;

    async function load() {
      if (!user?.uid) return;
      try {
        setError('');
        const data = await getUserProducts(user.uid);
        if (isSubscribed) {
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('Error loading user products:', err);
          setError('Unable to load your products.');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid, refreshIndex]);

  const reloadProducts = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  // Dismiss notification banner after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!productToDelete || !user) return;
    setIsDeleting(true);

    try {
      await deleteProduct(productToDelete.id, user.uid);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setSuccessMessage(`"${productToDelete.title}" has been deleted.`);
      setProductToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle status toggle (active / inactive)
  const handleStatusChange = async (productId, newStatus) => {
    if (!user) return;
    setUpdatingStatusId(productId);

    try {
      await updateProductStatus(productId, newStatus, user.uid);
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
      );
      setSuccessMessage(`Product status updated to ${newStatus === 'active' ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      console.error('Status update failed:', err);
      setError(err.message || 'Failed to update product status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Filter products by selected category tab
  const filteredProducts = products.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  // Calculate category counts dynamically from Firestore products
  const counts = {
    all: products.length,
    seed: products.filter((p) => p.category === 'seed').length,
    tool: products.filter((p) => p.category === 'tool').length,
    crop: products.filter((p) => p.category === 'crop').length,
  };

  const categoryTabs = [
    { id: 'all', label: t('marketplace.allProducts'), icon: '📦' },
    { id: 'seed', label: t('common.seeds'), icon: '🌱' },
    { id: 'tool', label: t('common.tools'), icon: '🚜' },
    { id: 'crop', label: t('common.crops'), icon: '🌾' },
  ];

  const getCategoryMeta = (category) => {
    switch (category) {
      case 'seed':
        return {
          label: t('common.seeds'),
          icon: '🌱',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          gradient: 'from-emerald-50 to-emerald-100/60',
        };
      case 'tool':
        return {
          label: t('common.tools'),
          icon: '🚜',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          gradient: 'from-blue-50 to-blue-100/60',
        };
      case 'crop':
        return {
          label: t('common.crops'),
          icon: '🌾',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          gradient: 'from-amber-50 to-amber-100/60',
        };
      default:
        return {
          label: t('marketplace.allProducts'),
          icon: '📦',
          badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
          gradient: 'from-gray-50 to-gray-100',
        };
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ================================================== */}
      {/* 1. TOP BANNER & HEADING                            */}
      {/* ================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('products.myProductsTitle')}
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-xl">
            {t('products.myProductsSubtitle')}
          </p>
        </div>
        <Link
          to="/add-product"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs self-start sm:self-center cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>{t('products.addNewProduct')}</span>
        </Link>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
          >
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* Error Alert with Try Again */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={reloadProducts}
            className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. CATEGORY FILTER TABS                            */}
      {/* ================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {categoryTabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================================================== */}
      {/* 3. LOADING SKELETON STATE                          */}
      {/* ================================================== */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs animate-pulse"
            >
              <div className="h-44 bg-gray-200"></div>
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-16 bg-gray-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================== */}
      {/* 4. EMPTY STATE                                     */}
      {/* ================================================== */}
      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="text-5xl">
            {selectedCategory === 'seed'
              ? '🌱'
              : selectedCategory === 'tool'
              ? '🚜'
              : selectedCategory === 'crop'
              ? '🌾'
              : '🧺'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {products.length === 0
                ? t('products.noProductsListed')
                : t('products.noCategoryProductsListed', {
                    category:
                      selectedCategory === 'seed'
                        ? t('common.seeds')
                        : selectedCategory === 'tool'
                        ? t('common.tools')
                        : t('common.crops'),
                  })}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {t('products.noProductsDesc')}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/add-product"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              <span>{t('products.addYourFirstProduct')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 5. PRODUCTS GRID                                   */}
      {/* ================================================== */}
      {!loading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const meta = getCategoryMeta(product.category);
            const hasValidImage =
              Array.isArray(product.images) &&
              product.images.length > 0 &&
              Boolean(product.images[0]) &&
              !brokenImages[product.id];

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Card Top: Image & Status Badges */}
                <div>
                  <div className={`relative h-44 w-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center overflow-hidden border-b border-gray-100`}>
                    {hasValidImage ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [product.id]: true }))
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-5xl filter drop-shadow-xs transform group-hover:scale-110 transition-transform duration-300">
                          {meta.icon}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">
                          {meta.label} Listing
                        </span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeClass} shadow-xs bg-white/95 backdrop-blur-xs`}>
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                    </div>

                    {/* Status Control Toggle */}
                    <div className="absolute top-3 right-3">
                      <select
                        value={product.status || 'active'}
                        disabled={updatingStatusId === product.id}
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-xs cursor-pointer border focus:outline-none transition-colors ${
                          product.status === 'active'
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-gray-600 text-white border-gray-700'
                        } ${updatingStatusId === product.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <option value="active" className="bg-white text-gray-900">
                          ● {t('common.active')}
                        </option>
                        <option value="inactive" className="bg-white text-gray-900">
                          ○ {t('common.inactive')}
                        </option>
                      </select>
                    </div>

                    {/* Location Pill */}
                    <span className="absolute bottom-3 left-3 right-3 text-[11px] font-medium text-gray-700 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200/70 truncate flex items-center gap-1 shadow-xs">
                      <span>📍</span>
                      <span className="truncate">{product.location || t('common.notSpecified')}</span>
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                        {product.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {product.description || t('products.noDescription')}
                      </p>
                    </div>

                    {/* Category-Specific Specifications Grid */}
                    <div className="pt-2 border-t border-gray-100 text-xs space-y-1.5 bg-gray-50/80 p-3 rounded-xl">
                      {/* SEED */}
                      {product.category === 'seed' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.variety')} / {t('products.cropType')}:</span>
                            <span className="font-semibold text-gray-800 truncate max-w-[150px]">
                              {product.variety} ({product.cropType})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.stockQuantity')}</span>
                            <span className="font-semibold text-gray-800">
                              {product.quantity} kg / units
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
                            <span className="text-gray-500 font-medium">{t('products.price')}:</span>
                            <span className="text-base font-bold text-emerald-700">
                              {formatINR(product.price)}
                            </span>
                          </div>
                        </>
                      )}

                      {/* TOOL */}
                      {product.category === 'tool' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.equipmentType')} & {t('products.condition')}:</span>
                            <span className="font-semibold text-gray-800">
                              {product.equipmentType} • {product.condition}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.availability')}:</span>
                            <span className="font-semibold text-emerald-700">
                              {product.availability}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
                            <span className="text-gray-500 font-medium">{t('products.dailyRent')}:</span>
                            <div className="text-right">
                              <span className="text-base font-bold text-blue-700">
                                {formatINR(product.pricePerDay)}/{t('common.perDay')}
                              </span>
                              {Number(product.pricePerHour) > 0 && (
                                <span className="text-xs text-gray-400 block">
                                  {formatINR(product.pricePerHour)}/{t('common.perHour')}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* CROP */}
                      {product.category === 'crop' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.quality')}:</span>
                            <span className="font-semibold text-gray-800">
                              {product.quality || 'Grade A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{t('products.availableQuantity')}</span>
                            <span className="font-semibold text-gray-800">
                              {product.quantity} kg
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
                            <span className="text-gray-500 font-medium">{t('products.pricePerKg')}:</span>
                            <span className="text-base font-bold text-amber-700">
                              {formatINR(product.price)}/{t('common.perKg')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Buttons (View, Edit, Delete) */}
                <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 bg-white">
                  <Link
                    to={`/marketplace/product/${product.id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                  >
                    {t('common.view')}
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/edit-product/${product.id}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================== */}
      {/* 6. DELETE CONFIRMATION MODAL                       */}
      {/* ================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {t('products.deleteModalTitle')}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {t('products.deleteModalDesc', { title: productToDelete.title })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{t('common.deleting')}</span>
                  </>
                ) : (
                  <span>{t('common.delete')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProducts;
