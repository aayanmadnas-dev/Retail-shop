
export type Language = 'en' | 'hi';

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    dashboard: 'Dashboard',
    newBill: 'New Bill',
    billing: 'Billing',
    products: 'Products',
    inventory: 'Inventory',
    stock: 'Stock',
    customers: 'Customers',
    reports: 'Reports',
    profile: 'Shop Profile',
    manageProfile: 'Manage Shop Details',

    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    logout: 'Logout',
    settings: 'Settings',

    // General
    welcome: 'Welcome',
    loading: 'Loading...',
    language: 'Language',
    english: 'English',
    hindi: 'Hindi',
  },

  hi: {
    // Navigation
    home: 'होम',
    dashboard: 'डैशबोर्ड',
    newBill: 'नया बिल',
    billing: 'बिलिंग',
    products: 'सामान',
    inventory: 'इन्वेंटरी',
    stock: 'स्टॉक',
    customers: 'ग्राहक',
    reports: 'रिपोर्ट',
    profile: 'दुकान की जानकारी',
    manageProfile: 'दुकान की जानकारी बदलें',

    // Common actions
    save: 'सेव करें',
    cancel: 'रद्द करें',
    edit: 'बदलें',
    delete: 'हटाएं',
    search: 'खोजें',
    logout: 'लॉगआउट',
    settings: 'सेटिंग्स',

    // General
    welcome: 'स्वागत है',
    loading: 'लोड हो रहा है...',
    language: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
  },
} as const;
