import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';

function Footer() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-600">
              <span>🌾</span>
              <span>{t('common.appName')}</span>
            </Link>
            <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
              {t('footer.brandDesc')}
            </p>
            <p className="text-xs text-gray-400">
              {t('footer.builtWith')}
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <a href="#top" className="hover:text-emerald-600 transition-colors">
                  {t('nav.home')}
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-emerald-600 transition-colors">
                  {t('nav.about')}
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-emerald-600 transition-colors">
                  {t('nav.services')}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-600 transition-colors">
                  {t('nav.features')}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">
                  {t('nav.howItWorks')}
                </a>
              </li>
            </ul>
          </div>

          {/* Account Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">
              {t('footer.account')}
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/dashboard" className="hover:text-emerald-600 transition-colors">
                      {t('nav.dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/my-products" className="hover:text-emerald-600 transition-colors">
                      {t('nav.myProducts')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile" className="hover:text-emerald-600 transition-colors">
                      {t('nav.profile')}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-emerald-600 transition-colors">
                      {t('nav.signIn')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-emerald-600 transition-colors">
                      {t('nav.register')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/forgot-password" className="hover:text-emerald-600 transition-colors">
                      {t('auth.forgotPassword')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>{t('footer.copyright', { year: currentYear })}</p>
          <p>{t('footer.tagline')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
