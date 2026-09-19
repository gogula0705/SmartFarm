import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/useLanguage';

function QuickServices() {
  const { t } = useLanguage();

  const services = [
    {
      id: 'seeds',
      icon: '🌱',
      title: t('dashboard.buySeedsTitle'),
      description: t('dashboard.buySeedsDesc'),
      buttonText: t('marketplace.buySeeds'),
      accentColor: 'border-emerald-200 hover:border-emerald-500 bg-emerald-50/40',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      badge: t('common.seeds'),
    },
    {
      id: 'tools',
      icon: '🚜',
      title: t('dashboard.rentToolsTitle'),
      description: t('dashboard.rentToolsDesc'),
      buttonText: t('marketplace.rentTool'),
      accentColor: 'border-blue-200 hover:border-blue-500 bg-blue-50/40',
      badgeColor: 'bg-blue-100 text-blue-800',
      badge: t('common.tools'),
    },
    {
      id: 'crops',
      icon: '🌾',
      title: t('dashboard.buyCropsTitle'),
      description: t('dashboard.buyCropsDesc'),
      buttonText: t('marketplace.buyCrop'),
      accentColor: 'border-amber-200 hover:border-amber-500 bg-amber-50/40',
      badgeColor: 'bg-amber-100 text-amber-800',
      badge: t('common.crops'),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.quickServicesTitle')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('dashboard.quickServicesSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className={`p-6 rounded-2xl bg-white border-2 transition-all shadow-xs flex flex-col justify-between ${service.accentColor}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-white shadow-xs border border-gray-100">
                  {service.icon}
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${service.badgeColor}`}>
                  {service.badge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                {service.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-5">
                {service.description}
              </p>
            </div>

            <Link
              to="/marketplace"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center text-gray-800 bg-white hover:bg-emerald-600 hover:text-white border border-gray-200 transition-colors shadow-xs block cursor-pointer"
            >
              {service.buttonText} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuickServices;
