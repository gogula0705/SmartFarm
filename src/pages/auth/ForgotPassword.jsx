import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';
import { formatAuthError } from '../../services/authService';
import LanguageSelector from '../../components/LanguageSelector';

function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await resetPassword(email);
      setMessage(
        'Password reset email sent! Please check your inbox for instructions to reset your password.'
      );
    } catch (err) {
      console.error('Password reset failed:', err);
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
          {t('auth.resetPassword')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('auth.resetSubtitle')}
        </p>
      </div>

      {/* Standalone Authentication Card */}
      <div className="bg-white p-7 sm:p-9 rounded-2xl shadow-sm border border-gray-200">
        {message && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <div>
              <p className="font-semibold">{t('auth.checkEmail')}</p>
              <p className="mt-0.5">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5">
            <span className="text-red-600 font-bold mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{t('auth.sendingLink')}</span>
              </>
            ) : (
              <span>{t('auth.sendResetLink')}</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-600">
          <Link
            to="/login"
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>{t('common.backToLogin')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
