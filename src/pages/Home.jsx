import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';

function Home() {
  const { isAuthenticated, userProfile, user } = useAuth();
  const { t } = useLanguage();
  const displayName = userProfile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Farmer';

  return (
    <div id="top" className="space-y-0">
      {/* Logged-in Helper Banner */}
      {isAuthenticated && (
        <div className="bg-emerald-600 text-white px-4 py-3 text-center text-sm font-medium shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>{t('home.welcomeBackBanner', { name: displayName })}</span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 underline font-bold hover:text-emerald-100 transition-colors"
            >
              {t('home.goToDashboard')}
            </Link>
          </div>
        </div>
      )}

      {/* 1. Hero Section */}
      <Hero />

      {/* 2. About SmartFarm Section */}
      <About />

      {/* 3. Our Services Section */}
      <Services />

      {/* 4. Why SmartFarm / Features Section */}
      <Features />

      {/* 5. How It Works Section */}
      <HowItWorks />

      {/* 6. Final Call to Action Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/20 text-xs font-semibold uppercase tracking-wider">
            SmartFarm
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t('home.readyToConnect')}
          </h2>
          <p className="text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            {t('home.readySubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-emerald-900 bg-white hover:bg-emerald-50 transition-all shadow-md text-center"
              >
                {t('home.accessDashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-emerald-900 bg-white hover:bg-emerald-50 transition-all shadow-md text-center"
                >
                  {t('auth.createAccountButton')}
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-center"
                >
                  {t('nav.signIn')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
