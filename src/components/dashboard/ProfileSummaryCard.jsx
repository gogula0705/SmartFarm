import { Link } from 'react-router-dom';
import { formatIndianPhone } from '../../services/authService';
import { useLanguage } from '../../context/useLanguage';

function ProfileSummaryCard({ userProfile, userEmail }) {
  const { t } = useLanguage();
  const notSpecified = t('common.notSpecified');
  const fullName = userProfile?.fullName || notSpecified;
  const email = userProfile?.email || userEmail || notSpecified;
  const phone = userProfile?.phone ? formatIndianPhone(userProfile.phone) : notSpecified;
  const location = userProfile?.location || notSpecified;

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>👤</span>
            <span>{t('dashboard.verifiedProfile')}</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dashboard.verifiedProfileDesc')}
          </p>
        </div>

        <Link
          to="/profile"
          className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors self-start sm:self-center"
        >
          {t('dashboard.viewFullProfile')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
            {t('auth.fullName')}
          </span>
          <span className="text-sm font-bold text-gray-900 block truncate">
            {fullName}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
            {t('auth.email')}
          </span>
          <span className="text-sm font-bold text-gray-900 block truncate">
            {email}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
            {t('auth.mobileNumber')}
          </span>
          <span className="text-sm font-bold text-gray-900 block truncate">
            {phone}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
            {t('auth.location')}
          </span>
          <span className="text-sm font-bold text-gray-900 block truncate">
            {location}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProfileSummaryCard;
