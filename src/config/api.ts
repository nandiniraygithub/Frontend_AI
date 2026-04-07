// API Configuration from environment variables
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  isDevelopment: import.meta.env.VITE_ENV === 'development',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
}

// Helper to construct API URLs
export const getApiUrl = (endpoint: string) => {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '') // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

// Debug logger
export const debugLog = (message: string, data?: any) => {
  if (config.enableDebug) {
    console.log(`🔍 ${message}`, data || '')
  }
}
