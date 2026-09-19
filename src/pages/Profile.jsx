import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import {
  updateUserProfile,
  changeUserPassword,
  formatIndianPhone,
} from '../services/authService';

/**
 * Generate 1 or 2 letter uppercase initials from full name
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format timestamp into readable Indian date
 */
function formatMemberSince(dateVal) {
  if (!dateVal) return 'Registered recently';
  try {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Registered recently';
  }
}

/**
 * Extract 10-digit number without +91 prefix
 */
function extractTenDigitPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean.slice(2);
  }
  return clean.slice(0, 10);
}

export default function Profile() {
  const { t } = useLanguage();
  const { user, userProfile, loading, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Edit Profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessNotice, setProfileSuccessNotice] = useState(null);
  const [profileErrorNotice, setProfileErrorNotice] = useState(null);

  // Change Password form state
  const [isPasswordCardOpen, setIsPasswordCardOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessNotice, setPasswordSuccessNotice] = useState(null);
  const [passwordErrorNotice, setPasswordErrorNotice] = useState(null);

  // Sign out state
  const [signingOut, setSigningOut] = useState(false);

  // Accessible IDs
  const fullNameId = useId();
  const phoneId = useId();
  const locationId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Handle entering edit mode
  const handleStartEdit = () => {
    setEditFullName(userProfile?.fullName || user?.displayName || '');
    setEditPhone(extractTenDigitPhone(userProfile?.phone || ''));
    setEditLocation(userProfile?.location || '');
    setProfileErrorNotice(null);
    setProfileSuccessNotice(null);
    setIsEditing(true);
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileErrorNotice(null);
  };

  // Handle saving profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileErrorNotice(null);
    setProfileSuccessNotice(null);

    const trimmedName = editFullName.trim();
    const cleanPhone = editPhone.trim();
    const trimmedLocation = editLocation.trim();

    if (!trimmedName) {
      setProfileErrorNotice('Please enter your full name.');
      return;
    }
    if (trimmedName.length < 2) {
      setProfileErrorNotice('Full name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 100) {
      setProfileErrorNotice('Full name cannot exceed 100 characters.');
      return;
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!cleanPhone || !indianMobileRegex.test(cleanPhone)) {
      setProfileErrorNotice(
        'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).'
      );
      return;
    }

    if (!trimmedLocation) {
      setProfileErrorNotice('Location is required. Please specify your City, District, State.');
      return;
    }
    if (trimmedLocation.length < 3) {
      setProfileErrorNotice('Location must be at least 3 characters.');
      return;
    }

    try {
      setSavingProfile(true);
      await updateUserProfile(user.uid, {
        fullName: trimmedName,
        phone: cleanPhone,
        location: trimmedLocation,
      });

      // Synchronize AuthContext immediately
      await refreshProfile();

      setProfileSuccessNotice(t('profile.successUpdated'));
      setIsEditing(false);
      setTimeout(() => setProfileSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setProfileErrorNotice(
        err.message || 'Unable to update your profile. Please check your connection and try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordErrorNotice(null);
    setPasswordSuccessNotice(null);

    if (!newPassword) {
      setPasswordErrorNotice('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorNotice('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorNotice('Passwords do not match. Please verify.');
      return;
    }

    try {
      setSavingPassword(true);
      await changeUserPassword(newPassword);
      setPasswordSuccessNotice(t('profile.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordCardOpen(false);
      setTimeout(() => setPasswordSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordErrorNotice(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
      alert('Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6 animate-pulse">
        <div className="h-44 bg-gray-200 rounded-3xl"></div>
        <div className="h-64 bg-gray-200 rounded-2xl"></div>
        <div className="h-32 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  // 2. Error state if user profile could not be loaded
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load your profile</h2>
        <p className="text-sm text-gray-500 mb-6">
          We could not authenticate your session or connect to the profile service.
        </p>
        <button
          type="button"
          onClick={() => refreshProfile()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const currentFullName = userProfile?.fullName || user?.displayName || 'SmartFarm Member';
  const currentEmail = userProfile?.email || user?.email || 'Not specified';
  const currentPhone = userProfile?.phone ? formatIndianPhone(userProfile.phone) : 'Not specified';
  const currentLocation = userProfile?.location || 'Not specified';
  const memberSince = formatMemberSince(userProfile?.createdAt);
  const initials = getInitials(currentFullName);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-14">
      {/* 1. Profile Header Hero */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 text-8xl opacity-10 select-none pointer-events-none">
          🌾
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Generated Initials Avatar */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-200 text-emerald-950 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md shrink-0 ring-4 ring-white/20">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {currentFullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-[10px] font-semibold uppercase tracking-wider border border-emerald-500/30">
                  {t('profile.verifiedFarmer')}
                </span>
              </div>
              <p className="text-emerald-100/90 text-xs sm:text-sm">{currentEmail}</p>
              <div className="flex items-center gap-1.5 text-emerald-200/80 text-xs pt-0.5">
                <span>🗓️</span>
                <span>{t('profile.memberSince', { date: memberSince })}</span>
              </div>
            </div>
          </div>

          {/* Quick Sign Out from Hero Header */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 self-start sm:self-center"
          >
            <span>🚪</span>
            <span>{signingOut ? t('nav.signingOut') : t('nav.signOut')}</span>
          </button>
        </div>
      </div>

      {/* Global Action Notices */}
      {profileSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{profileSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setProfileSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {passwordSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{passwordSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPasswordSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Personal Information Section */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>👤</span>
                <span>{t('profile.personalInfo')}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('profile.personalInfoDesc')}
              </p>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer self-start sm:self-center flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>{t('profile.editProfile')}</span>
              </button>
            )}
          </div>

          {/* VIEW MODE */}
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  {t('profile.fullName')}
                </span>
                <span className="text-sm font-bold text-gray-900 block">{currentFullName}</span>
              </div>

              {/* Email Address (Read-only) */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    {t('profile.email')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600">
                    {t('common.readOnly')}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-800 block truncate">{currentEmail}</span>
              </div>

              {/* Mobile Number */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  {t('profile.mobileNumber')}
                </span>
                <span className="text-sm font-bold text-gray-900 block font-mono">{currentPhone}</span>
              </div>

              {/* Location */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  {t('profile.location')}
                </span>
                <span className="text-sm font-semibold text-gray-900 block flex items-center gap-1">
                  <span>📍</span>
                  <span>{currentLocation}</span>
                </span>
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileErrorNotice && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
                  <span>⚠️</span>
                  <div className="flex-1">{profileErrorNotice}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name Input */}
                <div>
                  <label htmlFor={fullNameId} className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('profile.fullName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={fullNameId}
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    disabled={savingProfile}
                    maxLength={100}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Email Address (Read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                      {t('profile.email')}
                    </label>
                    <span className="text-[10px] text-gray-400">{t('auth.managedByAuth')}</span>
                  </div>
                  <input
                    type="email"
                    value={currentEmail}
                    disabled
                    aria-label="Email address (read-only)"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 cursor-not-allowed select-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Your email identity is fixed for account security.
                  </p>
                </div>

                {/* Mobile Number with Fixed +91 Prefix */}
                <div>
                  <label htmlFor={phoneId} className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('profile.mobileNumber')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden bg-white">
                    <span className="inline-flex items-center px-3.5 bg-gray-50 border-r border-gray-300 text-sm font-bold text-gray-700 select-none">
                      🇮🇳 +91
                    </span>
                    <input
                      id={phoneId}
                      type="tel"
                      value={editPhone}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEditPhone(digitsOnly);
                      }}
                      disabled={savingProfile}
                      maxLength={10}
                      placeholder={t('auth.mobilePlaceholder')}
                      className="w-full px-3.5 py-2.5 text-sm text-gray-900 outline-none bg-transparent font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter 10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210).
                  </p>
                </div>

                {/* Location Input */}
                <div>
                  <label htmlFor={locationId} className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('profile.location')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={locationId}
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    disabled={savingProfile}
                    maxLength={150}
                    placeholder={t('auth.locationPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Example: Thanjavur, Thanjavur, Tamil Nadu
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{t('profile.savingChanges')}</span>
                    </>
                  ) : (
                    <span>{t('profile.saveChanges')}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 3. Security & Password Section */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>🔒</span>
                <span>{t('profile.securityPassword')}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('profile.securityDesc')}
              </p>
            </div>

            {!isPasswordCardOpen && (
              <button
                type="button"
                onClick={() => {
                  setPasswordErrorNotice(null);
                  setIsPasswordCardOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
              >
                {t('profile.changePassword')}
              </button>
            )}
          </div>

          {!isPasswordCardOpen ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Current Password
                </span>
                <span className="text-sm font-mono text-gray-700 select-none">••••••••••••••••</span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                Encrypted & Secure
              </span>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
              {passwordErrorNotice && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
                  <span>⚠️</span>
                  <div className="flex-1">{passwordErrorNotice}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div>
                  <label htmlFor={newPasswordId} className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('profile.newPassword')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={newPasswordId}
                    type={showPasswordText ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    placeholder={t('auth.passwordMinLength')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor={confirmPasswordId} className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    {t('profile.confirmNewPassword')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={confirmPasswordId}
                    type={showPasswordText ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPasswordText}
                    onChange={(e) => setShowPasswordText(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('profile.showPasswordCharacters')}</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordCardOpen(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordErrorNotice(null);
                    }}
                    disabled={savingPassword}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingPassword ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{t('profile.updatingPassword')}</span>
                      </>
                    ) : (
                      <span>{t('profile.updatePassword')}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 4. Account Actions / Sign Out Section */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">{t('profile.accountSession')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Signing out will conclude your current authenticated session on this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-center flex items-center gap-2 disabled:opacity-50"
        >
          <span>🚪</span>
          <span>{signingOut ? t('nav.signingOut') : t('profile.signOutButton')}</span>
        </button>
      </section>
    </div>
  );
}
