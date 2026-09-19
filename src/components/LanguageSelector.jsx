import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/useLanguage';

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, availableLanguages, currentLanguageMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Language / மொழியைத் தேர்ந்தெடுக்கவும் / भाषा चुनें"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all cursor-pointer select-none"
      >
        <span className="text-sm">🌐</span>
        <span>{currentLanguageMeta.nativeName}</span>
        <span className="text-[10px] text-gray-400 ml-0.5 transition-transform duration-200">
          {isOpen ? '▲' : '▾'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available Languages"
          className="absolute right-0 mt-1.5 w-40 rounded-2xl bg-white border border-gray-100 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
            Language / மொழி / भाषा
          </div>

          {availableLanguages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <div className="flex flex-col">
                  <span>{lang.nativeName}</span>
                  {lang.code !== 'en' && (
                    <span className="text-[10px] text-gray-400 font-normal">{lang.name}</span>
                  )}
                </div>
                {isSelected && <span className="text-emerald-600 font-bold text-sm">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
