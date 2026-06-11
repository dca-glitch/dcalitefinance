const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:4000';

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, '');
