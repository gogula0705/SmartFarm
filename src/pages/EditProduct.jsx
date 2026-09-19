import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import ProductForm from '../components/ProductForm';
import { getProductById, updateProduct } from '../services/productService';

function EditProduct() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      setLoadError('');

      try {
        const data = await getProductById(id);
        if (!data) {
          setLoadError('The requested product could not be found.');
        } else if (data.ownerId !== user?.uid) {
          setLoadError('Permission Denied: You are not authorized to edit this listing.');
        } else {
          setProduct(data);
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        setLoadError(err.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, user?.uid]);

  const handleUpdateProduct = async (updatedData) => {
    if (!user) {
      throw new Error('You must be logged in to update a product.');
    }

    await updateProduct(id, updatedData, user.uid);

    navigate('/my-products', {
      replace: true,
      state: { message: `"${updatedData.title}" has been updated successfully!` },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">{t('products.loadingProduct')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white p-8 rounded-xl border border-red-200 shadow-sm text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('products.cannotEditProduct')}</h2>
        <p className="text-sm text-gray-600 mb-6">{loadError}</p>
        <Link
          to="/my-products"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t('products.returnToMyProducts')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold mb-2">
            {t('products.editListingCategory', { category: product?.category?.toUpperCase() || '' })}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('products.editListingTitle', { title: product?.title || '' })}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('products.editListingSubtitle')}
          </p>
        </div>
        <Link
          to="/my-products"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 self-start sm:self-center"
        >
          {t('products.backToList')}
        </Link>
      </div>

      {/* Form */}
      {product && (
        <ProductForm
          initialData={product}
          onSubmit={handleUpdateProduct}
          isEditing={true}
        />
      )}
    </div>
  );
}

export default EditProduct;
