import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';
import { formatAuthError } from '../../services/authService';
import LanguageSelector from '../../components/LanguageSelector';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Mobile Number specific formatting: allow only up to 10 digits
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: numericValue }));
      if (error) setError('');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Please enter your full name.';
    if (!formData.email.trim()) return 'Please enter your email address.';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }

    // Indian Mobile Number Validation: exactly 10 digits starting with 6, 7, 8, or 9
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!formData.phone.trim() || !indianMobileRegex.test(formData.phone.trim())) {
      return 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!formData.location.trim()) {
      return 'Please enter your location (City, District, State).';
    }

    if (!formData.password) {
      return 'Please create a password.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match. Please verify.';
    }

    if (!formData.agreeToTerms) {
      return 'You must agree to the Terms & Conditions to register.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        password: formData.password,
      });

      // Redirect to /login with pre-filled email and success message
      navigate('/login', {
        replace: true,
        state: {
          registered: true,
          email: formData.email,
          message: 'Account created successfully! Please sign in with your credentials.',
        },
      });
    } catch (err) {
      console.error('Registration failed:', err);
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Top Bar: Back to Home + Language Selector (Single Back Button) */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors px-2.5 py-1 rounded-lg hover:bg-emerald-50/70"
        >
          <span>{t('common.backToHome')}</span>
        </Link>
        <LanguageSelector />
      </div>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-2xl font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <span>🌾</span>
          <span>{t('common.appName')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-3">
          {t('auth.createAccount')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('auth.registerSubtitle')}
        </p>
      </div>

      {/* Standalone Authentication Card */}
      <div className="bg-white p-7 sm:p-9 rounded-2xl shadow-sm border border-gray-200">
        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
            <span className="text-red-600 font-bold mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.fullName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={t('auth.fullNamePlaceholder')}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {/* Mobile Number with Fixed +91 Prefix */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.mobileNumber')} <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden bg-white">
              <span className="inline-flex items-center px-3.5 bg-gray-50 border-r border-gray-300 text-sm font-bold text-gray-700 select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                name="phone"
                maxLength={10}
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('auth.mobilePlaceholder')}
                className="w-full px-3.5 py-2.5 text-sm outline-none bg-transparent"
                disabled={loading}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Enter 10 digits starting with 6, 7, 8, or 9
            </p>
          </div>

          {/* Location / Town */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.location')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t('auth.locationPlaceholder')}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('auth.password')} <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('auth.confirmPassword')} <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Toggle Password Visibility */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>{t('auth.passwordMinLength')}</span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              {showPassword ? t('auth.hidePasswords') : t('auth.showPasswords')}
            </button>
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                disabled={loading}
              />
              <span className="text-xs text-gray-600">
                {t('auth.termsNotice')}
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{t('auth.creatingAccount')}</span>
              </>
            ) : (
              <span>{t('auth.createAccountButton')}</span>
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-600">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {t('nav.signIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
