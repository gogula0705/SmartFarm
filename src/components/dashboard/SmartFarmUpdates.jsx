import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/useLanguage';

function SmartFarmUpdates() {
  const { t } = useLanguage();

  const updates = [
    {
      title: t('dashboard.communityActive'),
      icon: '👥',
      status: t('common.active'),
      description: 'Exchange cultivation tips, soil insights, and advice with local farmers.',
      link: '/community',
      isComingSoon: false,
    },
    {
      title: t('dashboard.newsWeather'),
      icon: '🌦️',
      status: t('dashboard.comingSoon'),
      description: 'Precipitation forecasts, frost warnings, and seasonal rain patterns.',
      link: null,
      isComingSoon: true,
    },
    {
      title: t('dashboard.cropPrices'),
      icon: '💰',
      status: t('dashboard.comingSoon'),
      description: 'Benchmark wholesale market rates and commodity price trackers.',
      link: null,
      isComingSoon: true,
    },
    {
      title: t('dashboard.govSchemes'),
      icon: '🏛️',
      status: t('dashboard.comingSoon'),
      description: 'Subsidy guidelines, PM-Kisan announcements, and equipment grant assistance.',
      link: null,
      isComingSoon: true,
    },
    {
      title: t('dashboard.seasonalAdvice'),
      icon: '🌱',
      status: t('dashboard.comingSoon'),
      description: 'Sowing calendar recommendations, organic pest control, and harvest guides.',
      link: null,
      isComingSoon: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.platformUpdates')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('dashboard.upcomingModules')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {updates.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 rounded-xl bg-gray-50 border border-gray-100">
                  {item.icon}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.isComingSoon
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <h4 className="text-sm font-bold text-gray-900 mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                {item.description}
              </p>
            </div>

            <div>
              {item.link ? (
                <Link
                  to={item.link}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('common.view')}</span>
                  <span>→</span>
                </Link>
              ) : (
                <span className="text-[11px] text-gray-400 italic">
                  {t('dashboard.comingSoon')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SmartFarmUpdates;
