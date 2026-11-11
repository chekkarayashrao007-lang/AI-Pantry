/**
 * Calculate the expiry status of a pantry item.
 */
export type ExpiryStatus = 'expired' | 'expiring-soon' | 'fresh' | 'unknown';

export function getExpiryStatus(expiresAt?: string | Date | null): ExpiryStatus {
  if (!expiresAt) return 'unknown';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 3) return 'expiring-soon';
  return 'fresh';
}

/**
 * Returns a human-readable string for the expiry (e.g., "2 days left", "Expired")
 */
export function formatExpiryLabel(expiresAt?: string | Date | null): string {
  if (!expiresAt) return 'No expiry set';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) return 'Expired';
  if (daysUntilExpiry === 1) return '1 day left';
  if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days left`;
  if (daysUntilExpiry <= 30) return `${Math.ceil(daysUntilExpiry / 7)} weeks left`;
  return `${Math.ceil(daysUntilExpiry / 30)} months left`;
}

/**
 * Convert image to base64 string.
 */
export async function imageToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Format a number with appropriate unit (e.g., 1000g -> 1kg)
 */
export function formatQuantity(quantity: number, unit: string): string {
  if (unit === 'g' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}kg`;
  }
  if (unit === 'ml' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}L`;
  }
  return `${quantity % 1 === 0 ? quantity : quantity.toFixed(1)} ${unit}`;
}

/**
 * API base URL
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Fetch wrapper with auth header
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
