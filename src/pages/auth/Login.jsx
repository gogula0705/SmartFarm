import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';
import { formatAuthError } from '../../services/authService';
import LanguageSelector from '../../components/LanguageSelector';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();

  // Pick up prefilled email or success notice if redirected from Register
  const registrationNotice = location.state?.message;
  const initialEmail = location.state?.email || '';

  const [formData, setFormData] = useState({
    email: initialEmail,
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      // Redirect to intended destination or directly to /dashboard
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      setError(formatAuthError(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Top Bar: Back to Home + Language Selector */}
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
          {t('auth.welcomeBack')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('auth.signInSubtitle')}
        </p>
      </div>

      {/* Standalone Authentication Card */}
      <div className="bg-white p-7 sm:p-9 rounded-2xl shadow-sm border border-gray-200">
        {/* Registration Success Notice */}
        {registrationNotice && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <span>{registrationNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
            <span className="text-red-600 font-bold mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.email')}
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

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">
                {t('auth.password')}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? t('auth.hidePasswords') : t('auth.showPasswords')}
              >
                {showPassword ? t('auth.hidePasswords') : t('auth.showPasswords')}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{t('auth.signingIn')}</span>
              </>
            ) : (
              <span>{t('auth.signInButton')}</span>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-600">
          {t('auth.dontHaveAccount')}{' '}
          <Link
            to="/register"
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {t('auth.registerNow')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
