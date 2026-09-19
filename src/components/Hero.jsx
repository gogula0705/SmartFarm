import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';

function Hero() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-white py-16 sm:py-24">
      {/* Subtle background decorative shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 right-10 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-amber-100/40 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Calls to Action */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span>🌾</span>
              <span>{t('home.heroBadge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              {t('home.heroTitle')}
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md text-center"
                >
                  {t('home.goToDashboard')}
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md text-center"
                >
                  {t('home.getStarted')}
                </Link>
              )}

              <a
                href="#services"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-semibold text-gray-700 hover:text-emerald-700 bg-white hover:bg-gray-50 border border-gray-200 transition-all shadow-xs text-center"
              >
                {t('home.learnMore')}
              </a>
            </div>

            {/* Key Micro Metrics / Trust Badges */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t('common.seeds')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>{t('common.tools')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{t('common.crops')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive CSS/SVG Agricultural Graphic */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-3xl transform rotate-2 scale-105 -z-10"></div>

              {/* Main Showcase Panel */}
              <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌾</span>
                    <span className="font-bold text-sm text-gray-900">{t('common.appName')}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t('common.active')}
                  </span>
                </div>

                {/* Card 1: Seed Buying */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                      🌱
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{t('common.seeds')}</div>
                      <div className="text-[11px] text-gray-500">Paddy, Millets, Pulses</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-700">₹85</span>
                    <span className="text-[10px] text-gray-400 block">/ kg</span>
                  </div>
                </div>

                {/* Card 2: Tool Renting */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
                      🚜
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{t('common.tools')}</div>
                      <div className="text-[11px] text-gray-500">Tractor & Harvester</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-blue-700">₹1,200</span>
                    <span className="text-[10px] text-gray-400 block">/ day</span>
                  </div>
                </div>

                {/* Card 3: Crop Selling */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
                      🌾
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{t('common.crops')}</div>
                      <div className="text-[11px] text-gray-500">Fresh Farm Harvest</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-amber-700">₹45</span>
                    <span className="text-[10px] text-gray-400 block">/ kg</span>
                  </div>
                </div>

                {/* Cooperative Network Status Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Direct Farmer Trade</span>
                  </span>
                  <span className="font-semibold text-emerald-600">Zero Middlemen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
