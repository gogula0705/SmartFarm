import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/useLanguage';

function MyActivity() {
  const { t } = useLanguage();

  const activities = [
    {
      id: 'products',
      icon: '📦',
      title: t('nav.myProducts'),
      description: 'Manage the seeds, tools and crops you have listed.',
      buttonText: t('dashboard.viewAll'),
      to: '/my-products',
    },
    {
      id: 'orders',
      icon: '🛒',
      title: t('nav.myOrders'),
      description: 'View the seeds and crops you have purchased.',
      buttonText: t('dashboard.viewAll'),
      to: '/orders',
    },
    {
      id: 'bookings',
      icon: '🚜',
      title: t('nav.myBookings'),
      description: 'View your farming equipment rental bookings.',
      buttonText: t('dashboard.viewAll'),
      to: '/bookings',
    },
    {
      id: 'community',
      icon: '💬',
      title: t('nav.community'),
      description: 'Exchange advice, ask questions, and share experiences.',
      buttonText: t('dashboard.viewAll'),
      to: '/community',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.myActivityTitle')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('dashboard.myActivitySubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activities.map((act) => (
          <div
            key={act.id}
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl p-2 rounded-xl bg-gray-50 border border-gray-100">
                  {act.icon}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t('common.active')}
                </span>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {act.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                {act.description}
              </p>
            </div>

            <Link
              to={act.to}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-center text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-colors block cursor-pointer"
            >
              {act.buttonText}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyActivity;
