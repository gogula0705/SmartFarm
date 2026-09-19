import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-lg text-gray-600 mb-6">Page not found.</p>
      <Link
        to="/"
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
      >
        Go back home
      </Link>
    </div>
  );
}

export default NotFound;
