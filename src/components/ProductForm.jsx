import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { uploadImage, isValidImageUrl } from '../services/imageService';

function ProductForm({ initialData = null, onSubmit, isEditing = false }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const categories = [
    { id: 'seed', label: t('common.seeds'), icon: '🌱', description: 'Certified seeds, heirloom varieties & saplings' },
    { id: 'tool', label: t('common.tools'), icon: '🚜', description: 'Machinery, tools, irrigation & implements' },
    { id: 'crop', label: t('common.crops'), icon: '🌾', description: 'Fresh produce, grains & harvested yields' },
  ];

  const [category, setCategory] = useState(initialData?.category || 'seed');
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    status: initialData?.status || 'active',
    // Seed fields
    variety: initialData?.variety || '',
    cropType: initialData?.cropType || '',
    // Tool fields
    equipmentType: initialData?.equipmentType || '',
    condition: initialData?.condition || 'Good',
    pricePerHour: initialData?.pricePerHour ?? '',
    pricePerDay: initialData?.pricePerDay ?? '',
    availability: initialData?.availability || 'Available',
    // Crop fields
    quality: initialData?.quality || 'Grade A',
    harvestDate: initialData?.harvestDate || '',
    // Shared numeric / quantity
    price: initialData?.price ?? '',
    quantity: initialData?.quantity ?? '',
  });

  const [images, setImages] = useState(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : []
  );

  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Add an external image URL
  const handleAddImageUrl = () => {
    if (!urlInput.trim()) return;
    if (!isValidImageUrl(urlInput.trim())) {
      setError('Please enter a valid HTTP, HTTPS, or Data URL.');
      return;
    }
    setImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
    setError('');
  };

  // Add image via local file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (under 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image must be smaller than 5MB.');
      return;
    }

    setProcessingImage(true);
    setError('');

    try {
      const dataUrl = await uploadImage(file);
      setImages((prev) => [...prev, dataUrl]);
    } catch (err) {
      console.error('Image processing failed:', err);
      setError('Failed to process image: ' + err.message);
    } finally {
      setProcessingImage(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const validate = () => {
    if (!formData.title.trim()) return 'Product title / name is required.';
    if (!formData.description.trim()) return 'Description is required.';
    if (!formData.location.trim()) return 'Location (City, District, State) is required.';

    if (category === 'seed') {
      if (!formData.variety.trim()) return 'Seed variety is required.';
      if (!formData.cropType.trim()) return 'Crop type is required.';
      if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
        return 'Valid price in ₹ (>= 0) is required.';
      }
      if (!formData.quantity.toString().trim() || Number(formData.quantity) <= 0) {
        return 'Valid quantity greater than 0 is required.';
      }
    }

    if (category === 'tool') {
      if (!formData.equipmentType.trim()) return 'Equipment type is required.';
      if (formData.pricePerHour === '' || isNaN(formData.pricePerHour) || Number(formData.pricePerHour) < 0) {
        return 'Valid price per hour in ₹ (enter 0 if not applicable) is required.';
      }
      if (formData.pricePerDay === '' || isNaN(formData.pricePerDay) || Number(formData.pricePerDay) <= 0) {
        return 'Valid price per day in ₹ (> 0) is required.';
      }
    }

    if (category === 'crop') {
      if (!formData.quantity.toString().trim() || Number(formData.quantity) <= 0) {
        return 'Valid crop quantity greater than 0 is required.';
      }
      if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
        return 'Valid price in ₹ (>= 0) is required.';
      }
      if (!formData.harvestDate.trim()) return 'Harvest date is required.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalImages = Array.isArray(images) ? images : [];
      await onSubmit({
        ...formData,
        category,
        images: finalImages,
      });
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Failed to save product. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      {/* Category Selection */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-base font-bold text-gray-900 mb-3">
          {t('productForm.categoryStep')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              disabled={isEditing}
              onClick={() => {
                setCategory(cat.id);
                setError('');
              }}
              className={`p-4 rounded-xl text-left border-2 transition-all cursor-pointer ${
                category === cat.id
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${isEditing ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="font-bold text-sm text-gray-900">{cat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
            </button>
          ))}
        </div>
        {isEditing && (
          <p className="text-xs text-gray-500 mt-2 italic">
            {t('productForm.categoryLockedNotice')}
          </p>
        )}
      </div>

      {/* Common Details */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
          {t('productForm.generalInfoStep')}
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {category === 'tool' ? t('productForm.equipmentName') : category === 'crop' ? t('productForm.cropName') : t('productForm.productName')}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleFieldChange}
            placeholder={
              category === 'tool'
                ? t('productForm.titlePlaceholderTool')
                : category === 'crop'
                ? t('productForm.titlePlaceholderCrop')
                : t('productForm.titlePlaceholderSeed')
            }
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('productForm.description')} <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            rows="3"
            value={formData.description}
            onChange={handleFieldChange}
            placeholder={t('productForm.descPlaceholder')}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('productForm.location')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleFieldChange}
              placeholder={t('productForm.locationPlaceholder')}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('productForm.listingStatus')}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleFieldChange}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              disabled={submitting}
            >
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Specific Fields */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
          {t('productForm.categorySpecsStep')}
        </h3>

        {category === 'seed' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.variety')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleFieldChange}
                placeholder="e.g. Roma VF / F1 Hybrid"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.cropType')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cropType"
                value={formData.cropType}
                onChange={handleFieldChange}
                placeholder="e.g. Tomato, Corn, Wheat"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.price')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleFieldChange}
                placeholder="e.g. 85"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.quantity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="quantity"
                value={formData.quantity}
                onChange={handleFieldChange}
                placeholder="e.g. 50 kg or 200 packets"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {category === 'tool' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productForm.equipmentType')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="equipmentType"
                  value={formData.equipmentType}
                  onChange={handleFieldChange}
                  placeholder="e.g. Harvester, Rotary Tiller, Drip Pump"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productForm.condition')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleFieldChange}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  disabled={submitting}
                >
                  <option value="Good">{t('productForm.conditionGood')}</option>
                  <option value="Like New">{t('productForm.conditionLikeNew')}</option>
                  <option value="Fair">{t('productForm.conditionFair')}</option>
                  <option value="Needs Maintenance">{t('productForm.conditionNeedsMaintenance')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productForm.pricePerHour')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="pricePerHour"
                  value={formData.pricePerHour}
                  onChange={handleFieldChange}
                  placeholder="e.g. 450"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productForm.pricePerDay')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="pricePerDay"
                  value={formData.pricePerDay}
                  onChange={handleFieldChange}
                  placeholder="e.g. 3000"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('productForm.availability')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="availability"
                  value={formData.availability}
                  onChange={handleFieldChange}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  disabled={submitting}
                >
                  <option value="Available">{t('productForm.availAvailable')}</option>
                  <option value="Rented">{t('productForm.availRented')}</option>
                  <option value="Maintenance">{t('productForm.availMaintenance')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {category === 'crop' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.quantity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="quantity"
                value={formData.quantity}
                onChange={handleFieldChange}
                placeholder="e.g. 500 kg, 20 crates, 2 tons"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.quality')} <span className="text-red-500">*</span>
              </label>
              <select
                name="quality"
                value={formData.quality}
                onChange={handleFieldChange}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                disabled={submitting}
              >
                <option value="Grade A">{t('productForm.qualityGradeA')}</option>
                <option value="Grade B">{t('productForm.qualityGradeB')}</option>
                <option value="Organic Certified">{t('productForm.qualityOrganic')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.price')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleFieldChange}
                placeholder="e.g. 28"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('productForm.harvestDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleFieldChange}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Images */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            {t('productForm.imagesStep')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add image URLs or select local image files for preview. No Firebase Storage required.
          </p>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t('productForm.imageUrlPlaceholder')}
            className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            disabled={submitting || processingImage}
          />
          <button
            type="button"
            onClick={handleAddImageUrl}
            disabled={submitting || processingImage || !urlInput.trim()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t('productForm.addImageUrl')}
          </button>
        </div>

        {/* File upload picker */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium cursor-pointer transition-colors">
            <span>📷</span>
            <span>{processingImage ? t('common.loading') : t('productForm.orUploadFile')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={submitting || processingImage}
            />
          </label>
          <span className="text-xs text-gray-400">
            PNG, JPG, WebP supported (converts to instant local preview)
          </span>
        </div>

        {/* Image Previews */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {images.map((imgUrl, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square"
              >
                <img
                  src={imgUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow-md cursor-pointer transition-opacity"
                  title="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
            No custom images added. The default SmartFarm agricultural image will be assigned.
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/my-products')}
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{isEditing ? t('productForm.updatingProduct') : t('productForm.savingProduct')}</span>
            </>
          ) : (
            <span>{isEditing ? t('productForm.updateProduct') : t('productForm.saveProduct')}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
