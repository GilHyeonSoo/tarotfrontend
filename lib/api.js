// Without an explicit backend URL, use the current origin (also valid on phones).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
