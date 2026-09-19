import { en } from './en.js';
import { ta } from './ta.js';
import { hi } from './hi.js';

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export const translations = {
  en,
  ta,
  hi,
};

/**
 * Traverse an object with a dot-notated key (e.g. 'nav.dashboard')
 */
function getNestedValue(obj, keyPath) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Resolve a translation key for a given language code.
 * Falls back to English if the translation is missing or not a string.
 *
 * @param {string} lang - 'en' | 'ta' | 'hi'
 * @param {string} key - e.g. 'nav.dashboard'
 * @param {Object} [params] - interpolation parameters e.g. { name: 'Ravi' }
 * @returns {string}
 */
export function resolveTranslation(lang, key, params = {}) {
  if (!key || typeof key !== 'string') return '';

  const activeLang = translations[lang] ? lang : 'en';
  let value = getNestedValue(translations[activeLang], key);

  // Fall back to English if key is missing in active language
  if (value === undefined && activeLang !== 'en') {
    value = getNestedValue(translations.en, key);
  }

  // If still missing, return the key as last resort
  if (value === undefined || typeof value !== 'string') {
    return key;
  }

  // Interpolate parameters: {name} -> params.name
  if (params && typeof params === 'object') {
    return value.replace(/\{(\w+)\}/g, (match, paramName) => {
      return params[paramName] !== undefined ? String(params[paramName]) : match;
    });
  }

  return value;
}
