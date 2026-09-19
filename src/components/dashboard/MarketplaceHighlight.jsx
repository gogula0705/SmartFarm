import { Link } from 'react-router-dom';

function MarketplaceHighlight() {
  const categories = [
    {
      key: 'seed',
      name: 'Seeds',
      icon: '🌱',
      color: 'hover:border-emerald-400 bg-emerald-50/50',
      textColor: 'text-emerald-800',
    },
    {
      key: 'tool',
      name: 'Tools',
      icon: '🚜',
      color: 'hover:border-blue-400 bg-blue-50/50',
      textColor: 'text-blue-800',
    },
    {
      key: 'crop',
      name: 'Crops',
      icon: '🌾',
      color: 'hover:border-amber-400 bg-amber-50/50',
      textColor: 'text-amber-800',
    },
  ];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Explore the SmartFarm Marketplace
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Discover seeds, farming tools, and crops listed by users.
          </p>
        </div>
        <Link
          to="/marketplace"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 self-start sm:self-center inline-flex items-center gap-1"
        >
          <span>Open Full Marketplace</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            to={`/marketplace?category=${cat.key}`}
            className={`p-4 rounded-2xl border border-gray-200 transition-all flex items-center justify-between group ${cat.color}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-xl bg-white border border-gray-100 shadow-xs">
                {cat.icon}
              </span>
              <span className={`font-bold text-sm ${cat.textColor}`}>
                {cat.name}
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all text-sm font-bold">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default MarketplaceHighlight;
