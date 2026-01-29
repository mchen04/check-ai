/**
 * SWR Fetcher Utilities
 * Common fetcher functions for use with SWR
 */

/**
 * Default JSON fetcher for SWR
 * Handles error responses by throwing errors that SWR can catch
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as Error & { info?: unknown; status?: number }).info = await response.json().catch(() => ({}));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json();
};

/**
 * Fetcher with custom options (for POST requests, etc.)
 */
export const fetcherWithOptions = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    (error as Error & { info?: unknown; status?: number }).info = await response.json().catch(() => ({}));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json();
};

/**
 * SWR configuration presets
 */
export const swrConfig = {
  // For data that changes frequently (polls, live updates)
  realtime: {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  },
  // For mostly static data
  static: {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  },
  // For paginated lists
  paginated: {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  },
} as const;
