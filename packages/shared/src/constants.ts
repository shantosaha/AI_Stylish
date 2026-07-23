// API Base URLs
export const API_ENDPOINTS = {
  // Auth
  AUTH_SIGNUP: '/auth/signup',
  AUTH_LOGIN: '/auth/login',
  AUTH_RECOVER: '/auth/recover',

  // Profile
  PROFILE_GET: '/profile',
  PROFILE_UPDATE: '/profile',

  // Wardrobe
  WARDROBE_ITEMS: '/wardrobe/items',
  WARDROBE_ITEM_GET: (id: string) => `/wardrobe/items/${id}`,
  WARDROBE_ITEM_UPDATE: (id: string) => `/wardrobe/items/${id}`,
  WARDROBE_ITEM_DELETE: (id: string) => `/wardrobe/items/${id}`,
  WARDROBE_ITEM_ANALYZE: (id: string) => `/wardrobe/items/${id}/analyze`,

  // Body Analysis
  BODY_IMAGES: '/body-images',
  BODY_ANALYSIS_RUN: '/body-analysis/run',

  // Context
  CONTEXT_TODAY: '/context/today',

  // Recommendations
  RECOMMENDATIONS_TODAY: '/recommendations/today',
  RECOMMENDATIONS_GET: (id: string) => `/recommendations/${id}`,
  RECOMMENDATIONS_FEEDBACK: (id: string) => `/recommendations/${id}/feedback`,

  // Preview
  PREVIEW_GENERATE: '/preview/generate',

  // History
  HISTORY: '/history',
};

export const PROCESSING_MODE_LABELS = {
  auto: 'Automatic',
  local_preferred: 'Local Preferred',
  cloud_preferred: 'Cloud Preferred',
};

export const WARDROBE_CATEGORY_LABELS = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  bags: 'Bags',
  jewelry: 'Jewelry',
};

export const OUTFIT_FEEDBACK_LABELS = {
  liked: 'Liked',
  worn: 'Worn',
  skipped: 'Skipped',
  neutral: 'Neutral',
};

// UI Constants
export const COLORS = {
  PRIMARY: '#2563eb',
  SECONDARY: '#64748b',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  BACKGROUND: '#f8fafc',
  TEXT_PRIMARY: '#1e293b',
  TEXT_SECONDARY: '#64748b',
};

export const SIZES = {
  SPACING_XS: 4,
  SPACING_SM: 8,
  SPACING_MD: 16,
  SPACING_LG: 24,
  SPACING_XL: 32,
};
