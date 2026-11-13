
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  translations,
  Language,
} from '../i18n/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const getInitialLanguage = (): Language => {
  const savedLanguage = localStorage.getItem('retailflow-language');

  return savedLanguage === 'hi' ? 'hi' : 'en';
};

export const LanguageProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(
    getInitialLanguage
  );

  useEffect(() => {
    localStorage.setItem('retailflow-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key];
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage must be used within a LanguageProvider'
    );
  }

  return context;
};
