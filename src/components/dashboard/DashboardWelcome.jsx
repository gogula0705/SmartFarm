import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/useLanguage';

function DashboardWelcome({ fullName }) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const greeting = fullName
    ? t('dashboard.welcomeBack', { name: fullName })
    : t('dashboard.welcomeGeneric');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/marketplace');
  };

  return (
    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-10 text-white shadow-sm space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Greeting & Description */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
            {t('dashboard.title')}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {greeting}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/marketplace"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-950 bg-white hover:bg-emerald-50 transition-all shadow-xs"
          >
            {t('dashboard.exploreMarketplace')}
          </Link>
          <Link
            to="/add-product"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all shadow-xs"
          >
            {t('dashboard.addProduct')}
          </Link>
        </div>
      </div>

      {/* Prominent Search Input */}
      <form onSubmit={handleSearchSubmit} className="pt-2">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            className="w-full pl-11 pr-28 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 placeholder-emerald-100/70 focus:placeholder-gray-400 rounded-2xl text-sm outline-hidden border border-white/20 focus:border-white transition-all shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-white text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            {t('dashboard.searchButton')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DashboardWelcome;
