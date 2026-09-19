import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import ProductForm from '../components/ProductForm';
import { createProduct } from '../services/productService';

function AddProduct() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleCreateProduct = async (productData) => {
    if (!user) {
      throw new Error('You must be logged in to create a product.');
    }

    const ownerName = userProfile?.fullName || user.displayName || user.email?.split('@')[0] || 'SmartFarm Member';
    await createProduct(productData, user.uid, ownerName);

    navigate('/my-products', {
      replace: true,
      state: { message: `"${productData.title}" listing has been created successfully!` },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold mb-2">
            {t('products.createNewListing')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{t('products.addAgriProduct')}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('products.addAgriSubtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm
        onSubmit={handleCreateProduct}
        isEditing={false}
        initialData={{
          location: userProfile?.location || '',
        }}
      />
    </div>
  );
}

export default AddProduct;
