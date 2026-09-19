import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import StarRating from './StarRating';

/**
 * Indian Rupee currency formatter (e.g., ₹85, ₹3,000)
 */
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Format date nicely for harvest dates or creation dates
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function ProductCard({ product }) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const {
    id,
    category,
    title,
    description,
    location,
    ownerName,
    images = [],
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

  // Category visual themes & placeholders
  const getCategoryMeta = () => {
    switch (category) {
      case 'seed':
        return {
          icon: '🌱',
          label: t('common.seeds'),
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          bgGradient: 'from-emerald-50 to-emerald-100/50',
          accentColor: 'text-emerald-700',
        };
      case 'tool':
        return {
          icon: '🚜',
          label: t('marketplace.toolsOnly'),
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          bgGradient: 'from-blue-50 to-blue-100/50',
          accentColor: 'text-blue-700',
        };
      case 'crop':
        return {
          icon: '🌾',
          label: t('marketplace.cropsOnly'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          bgGradient: 'from-amber-50 to-amber-100/50',
          accentColor: 'text-amber-700',
        };
      default:
        return {
          icon: '📦',
          label: t('common.all'),
          badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
          bgGradient: 'from-gray-50 to-gray-100',
          accentColor: 'text-gray-700',
        };
    }
  };

  const meta = getCategoryMeta();
  const hasImage = Array.isArray(images) && images.length > 0 && Boolean(images[0]) && !imageError;

  // Stock calculations
  const isBuyable = category === 'seed' || category === 'crop';
  const availableQty = typeof quantity === 'number' ? quantity : (Number(quantity) || 0);
  const isOutOfStock = isBuyable && availableQty <= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Product Image / Category Placeholder */}
      <div className={`relative h-44 w-full bg-gradient-to-br ${meta.bgGradient} flex items-center justify-center overflow-hidden border-b border-gray-100`}>
        {hasImage ? (
          <img
            src={images[0]}
            alt={title}
            onError={() => setImageError(true)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <span className="text-5xl filter drop-shadow-xs transform group-hover:scale-110 transition-transform duration-300">
              {meta.icon}
            </span>
            <span className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">
              {meta.label}
            </span>
          </div>
        )}

        {/* Category Badge */}
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass} shadow-xs backdrop-blur-xs bg-white/90`}>
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </span>

        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200 bg-red-50 text-red-700 shadow-xs backdrop-blur-xs">
            <span>{t('products.outOfStock')}</span>
          </span>
        )}

        {/* Location Pill */}
        <span className="absolute bottom-3 left-3 right-3 text-[11px] font-medium text-gray-700 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200/70 truncate flex items-center gap-1 shadow-xs">
          <span>📍</span>
          <span className="truncate">{location || 'India'}</span>
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title & Seller */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <span>{t('products.byAuthor')}</span>
                <span className="font-medium text-gray-700">{ownerName || t('profile.verifiedFarmer')}</span>
              </p>
            </div>
          </div>

          {/* Product Star Rating */}
          <div className="mt-2">
            <StarRating rating={rating} reviewCount={reviewCount} size="xs" />
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}

          {/* Category-Specific Specifications */}
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            {category === 'seed' && (
              <>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.variety')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{variety || 'Standard'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.cropType')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{cropType || 'General'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg col-span-2 flex items-center justify-between">
                  <span className="text-gray-500 text-[11px]">{t('products.availableQuantity')}</span>
                  <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}>
                    {isOutOfStock ? t('products.outOfStock') : `${availableQty} kg / units`}
                  </span>
                </div>
              </>
            )}

            {category === 'tool' && (
              <>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.equipment')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{equipmentType || 'Machinery'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.condition')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{condition || 'Good'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg col-span-2 flex items-center justify-between">
                  <span className="text-gray-500 text-[11px]">{t('products.status')}</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    {availability || 'Available'}
                  </span>
                </div>
              </>
            )}

            {category === 'crop' && (
              <>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.quality')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{quality || 'Grade A'}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">{t('products.harvested')}</span>
                  <span className="font-semibold text-gray-800 truncate block">{formatDate(harvestDate)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg col-span-2 flex items-center justify-between">
                  <span className="text-gray-500 text-[11px]">{t('products.totalStock')}</span>
                  <span className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}>
                    {isOutOfStock ? t('products.outOfStock') : `${availableQty} kg`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pricing & View Details Action */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          {/* Pricing Info */}
          <div>
            {category === 'tool' ? (
              <div>
                <span className="text-xs text-gray-400 block leading-tight">{t('products.dailyRent')}</span>
                <span className="text-base font-extrabold text-blue-700">
                  {formatINR(pricePerDay)}
                  <span className="text-xs font-normal text-gray-500">/{t('common.perDay')}</span>
                </span>
                {pricePerHour > 0 && (
                  <span className="text-[11px] text-gray-400 block leading-tight">
                    {formatINR(pricePerHour)}/{t('common.perHour')}
                  </span>
                )}
              </div>
            ) : category === 'crop' ? (
              <div>
                <span className="text-xs text-gray-400 block leading-tight">{t('products.pricePerKg')}</span>
                <span className="text-base font-extrabold text-amber-700">
                  {formatINR(price)}
                  <span className="text-xs font-normal text-gray-500">/{t('common.perKg')}</span>
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs text-gray-400 block leading-tight">{t('products.price')}</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatINR(price)}
                  <span className="text-xs font-normal text-gray-500">/{t('common.perUnit')}</span>
                </span>
              </div>
            )}
          </div>

          {/* View Details Action Button */}
          <Link
            to={`/marketplace/product/${id}`}
            className="px-3.5 py-2 bg-gray-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors duration-150 inline-flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <span>{t('marketplace.viewDetails')}</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
