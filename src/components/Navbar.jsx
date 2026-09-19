import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import LanguageSelector from './LanguageSelector';

function Navbar() {
  const { user, userProfile, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  // Welcome greeting format based on user's Firestore profile
  const displayName = userProfile?.fullName || user?.displayName || 'Farmer';
  const greeting = t('nav.welcome', { name: displayName });

  const isHomePage = location.pathname === '/';

  // Helper for public anchor links
  const getAnchorHref = (sectionId) => {
    return isHomePage ? `#${sectionId}` : `/#${sectionId}`;
  };

  const publicNavLinks = [
    { label: t('nav.home'), href: isHomePage ? '#top' : '/' },
    { label: t('nav.about'), href: getAnchorHref('about') },
    { label: t('nav.services'), href: getAnchorHref('services') },
    { label: t('nav.features'), href: getAnchorHref('features') },
    { label: t('nav.howItWorks'), href: getAnchorHref('how-it-works') },
  ];

  const authenticatedNavLinks = [
    { label: t('nav.dashboard'), to: '/dashboard' },
    { label: t('nav.marketplace'), to: '/marketplace' },
    { label: t('nav.myProducts'), to: '/my-products' },
    { label: t('nav.myOrders'), to: '/orders' },
    { label: t('nav.myBookings'), to: '/bookings' },
    { label: t('nav.community'), to: '/community' },
  ];

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 font-semibold'
        : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
    }`;

  return (
    <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left: Brand & Tagline */}
          <div className="flex items-center gap-6">
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center gap-2 text-xl font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <span>🌾</span>
              <div>
                <span className="block leading-tight">{t('common.appName')}</span>
                <span className="hidden sm:block text-[10px] font-normal text-gray-500 uppercase tracking-widest leading-none">
                  {t('common.tagline')}
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation */}
            <div className="hidden lg:flex items-center space-x-1 pl-4">
              {isAuthenticated ? (
                authenticatedNavLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navLinkClass}>
                    {link.label}
                  </NavLink>
                ))
              ) : (
                publicNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/60 transition-colors"
                  >
                    {link.label}
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Selector */}
            <LanguageSelector />

            {isAuthenticated ? (
              <>
                {/* User Greeting */}
                <span className="text-xs font-medium text-gray-600 max-w-[180px] truncate" title={greeting}>
                  {greeting}
                </span>

                <Link
                  to="/profile"
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  {t('nav.profile')}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50 transition-colors"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Bar: Language Selector + Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSelector />

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-hidden cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-5 space-y-2 shadow-lg">
          {isAuthenticated ? (
            <>
              <div className="py-2 px-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                <p className="text-xs text-emerald-800 font-semibold">{greeting}</p>
                <p className="text-[11px] text-emerald-600 truncate">{user?.email}</p>
              </div>

              <div className="space-y-1 pt-1">
                {authenticatedNavLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200"
                >
                  {t('nav.profile')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-center px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  {t('nav.signOut')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                {publicNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {t('nav.register')}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
