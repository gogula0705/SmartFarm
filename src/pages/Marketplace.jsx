import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { sampleProducts } from '../data/sampleProducts';
import { getMarketplaceProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';

function Marketplace() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Category derived directly from URL search params
  const paramCategory = searchParams.get('category')?.toLowerCase();
  const selectedCategory = ['all', 'seed', 'tool', 'crop'].includes(paramCategory)
    ? paramCategory
    : 'all';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load active products from Cloud Firestore (fallback to sampleProducts if empty or error)
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setErrorNotice(null);
        const liveProducts = await getMarketplaceProducts();
        if (isMounted) {
          if (liveProducts && liveProducts.length > 0) {
            setProducts(liveProducts);
          } else {
            setProducts(sampleProducts);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching marketplace products:', err);
        if (isMounted) {
          setProducts(sampleProducts);
          setErrorNotice(t('marketplace.offlineNotice'));
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [t]);

  // Sync category changes with URL query parameter
  const handleCategoryChange = (categoryKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (categoryKey === 'all') {
        next.delete('category');
      } else {
        next.set('category', categoryKey);
      }
      return next;
    });
  };

  // Reset all filters to their default states
  const handleClearFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSortBy('newest');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      return next;
    });
  };

  // Check if any non-default filter is currently applied
  const isFiltered = Boolean(
    selectedCategory !== 'all' ||
    searchQuery.trim() ||
    locationQuery.trim() ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minRating !== '' ||
    sortBy !== 'newest'
  );

  // Helper to extract effective price based on category
  const getProductPrice = (item) => {
    if (item.category === 'tool') {
      return Number(item.pricePerDay) || 0;
    }
    return Number(item.price) || 0;
  };

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category Filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // 2. Search Filter (title, description, category, ownerName, location, variety, cropType, equipmentType)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const searchableText = [
          product.title,
          product.description,
          product.category,
          product.ownerName,
          product.location,
          product.variety,
          product.cropType,
          product.equipmentType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // 3. Location Filter (matches product location, case-insensitive)
      if (locationQuery.trim()) {
        const locQuery = locationQuery.trim().toLowerCase();
        const productLocation = (product.location || '').toLowerCase();
        if (!productLocation.includes(locQuery)) {
          return false;
        }
      }

      // 4. Price Filter (min & max)
      const effectivePrice = getProductPrice(product);

      if (minPrice !== '' && !isNaN(minPrice)) {
        if (effectivePrice < Number(minPrice)) {
          return false;
        }
      }

      if (maxPrice !== '' && !isNaN(maxPrice)) {
        if (effectivePrice > Number(maxPrice)) {
          return false;
        }
      }

      // 5. Rating Filter
      if (minRating !== '' && !isNaN(minRating)) {
        const productRating = Number(product.rating) || 0;
        if (productRating < Number(minRating)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sorting Options
      if (sortBy === 'rating-desc') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortBy === 'price-asc') {
        return getProductPrice(a) - getProductPrice(b);
      }
      if (sortBy === 'price-desc') {
        return getProductPrice(b) - getProductPrice(a);
      }
      if (sortBy === 'name-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: 'newest'
      const getTime = (val) => {
        if (!val) return 0;
        if (typeof val?.toMillis === 'function') return val.toMillis();
        if (typeof val?.toDate === 'function') return val.toDate().getTime();
        if (val.seconds) return val.seconds * 1000;
        const d = new Date(val).getTime();
        return isNaN(d) ? 0 : d;
      };
      const timeA = getTime(a.createdAt);
      const timeB = getTime(b.createdAt);
      return timeB - timeA;
    });
  }, [products, selectedCategory, searchQuery, locationQuery, minPrice, maxPrice, minRating, sortBy]);

  // Results count banner calculation
  const getResultsText = () => {
    const count = filteredProducts.length;
    let unit = t('common.all');
    if (selectedCategory === 'seed') {
      unit = t('common.seeds');
    } else if (selectedCategory === 'tool') {
      unit = t('common.tools');
    } else if (selectedCategory === 'crop') {
      unit = t('common.crops');
    }
    return t('marketplace.resultsCount', { count, unit });
  };

  // Category counts across the dataset
  const categoryCounts = useMemo(() => {
    return {
      all: products.length,
      seed: products.filter((p) => p.category === 'seed').length,
      tool: products.filter((p) => p.category === 'tool').length,
      crop: products.filter((p) => p.category === 'crop').length,
    };
  }, [products]);

  const categoryTabs = [
    { key: 'all', label: t('marketplace.allProducts'), icon: '🌾' },
    { key: 'seed', label: t('marketplace.seedsOnly'), icon: '🌱' },
    { key: 'tool', label: t('marketplace.toolsOnly'), icon: '🚜' },
    { key: 'crop', label: t('marketplace.cropsOnly'), icon: '🌾' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ================================================== */}
      {/* 1. MARKETPLACE HEADER                              */}
      {/* ================================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold mb-2">
            <span>🌾</span>
            <span>{t('marketplace.hubBadge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('marketplace.title')}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1.5 max-w-2xl">
            {t('marketplace.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <Link
            to="/add-product"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs inline-flex items-center gap-2"
          >
            <span>{t('marketplace.listProduct')}</span>
          </Link>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. CATEGORY NAVIGATION TABS                        */}
      {/* ================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
        {categoryTabs.map((tab) => {
          const isActive = selectedCategory === tab.key;
          const count = categoryCounts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleCategoryChange(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================================================== */}
      {/* 3. SEARCH AND FILTERS BAR                          */}
      {/* ================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        {/* Main Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* General Search Input */}
          <div className="md:col-span-6 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
            />
          </div>

          {/* Location Input */}
          <div className="md:col-span-3 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              📍
            </span>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder={t('marketplace.searchLocationPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
            />
          </div>

          {/* Sorting Dropdown */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-700 bg-white cursor-pointer"
            >
              <option value="newest">{t('marketplace.sortNewest')}</option>
              <option value="rating-desc">{t('marketplace.sortRating')}</option>
              <option value="price-asc">{t('marketplace.sortPriceAsc')}</option>
              <option value="price-desc">{t('marketplace.sortPriceDesc')}</option>
              <option value="name-asc">{t('marketplace.sortName')}</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Price Range Filter & Rating Filter */}
        <div className="pt-3 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">
                {t('marketplace.priceLabel')} ({selectedCategory === 'tool' ? t('common.perDay') : t('common.perKg')}):
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder={t('marketplace.minPrice')}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-gray-400">{t('marketplace.priceTo')}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={t('marketplace.maxPrice')}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Minimum Rating Filter */}
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
              <span className="font-semibold text-gray-700">{t('marketplace.rating')}:</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 cursor-pointer"
              >
                <option value="">{t('marketplace.allRatings')}</option>
                <option value="4.8">{t('marketplace.fourPointEightPlus')}</option>
                <option value="4.5">{t('marketplace.fourPointFivePlus')}</option>
                <option value="4.0">{t('marketplace.fourPointZeroPlus')}</option>
              </select>
            </div>
          </div>

          {/* Results Count & Clear Filters */}
          <div className="flex items-center justify-between lg:justify-end gap-3">
            <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
              {getResultsText()}
            </span>

            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <span>{t('marketplace.resetFilters')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notice Banner (if any) */}
      {errorNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
          <span>⚠️</span>
          <span>{errorNotice}</span>
        </div>
      )}

      {/* ================================================== */}
      {/* 4. PRODUCT GRID, SKELETON, OR EMPTY STATE          */}
      {/* ================================================== */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs animate-pulse p-4 space-y-4"
            >
              <div className="w-full h-48 bg-gray-200 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                <div className="h-3 bg-gray-200 rounded-md w-1/2" />
              </div>
              <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                <div className="h-5 bg-gray-200 rounded-md w-1/3" />
                <div className="h-8 bg-gray-200 rounded-xl w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-3xl">
            🌾
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('marketplace.noProductsFound')}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              {t('marketplace.noProductsDesc')}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              {t('marketplace.clearFilters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
