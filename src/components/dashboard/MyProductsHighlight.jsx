import { Link } from 'react-router-dom';

function MyProductsHighlight() {
  return (
    <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="space-y-2 max-w-xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
          <span>📦</span>
          <span>Inventory & Supply</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          Manage Your Products
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          List your Seeds, Tools, and Crops so other SmartFarm users can discover them.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Link
          to="/my-products"
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 transition-colors shadow-xs"
        >
          View My Products
        </Link>
        <Link
          to="/add-product"
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
        >
          + Add Product
        </Link>
      </div>
    </div>
  );
}

export default MyProductsHighlight;
