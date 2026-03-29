import NodeCache from 'node-cache';

// Create a new cache instance with a standard TTL of 60 seconds.
// checkperiod: 120 means it cleans up expired keys every 2 minutes.
export const AppCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Helper to generate consistent cache keys
export const generateCacheKey = (prefix: string, identifiers: Record<string, string | undefined>) => {
  const queryPart = Object.entries(identifiers)
    .filter(([_, val]) => val !== undefined)
    .map(([key, val]) => `${key}:${val}`)
    .join('|');
  return `${prefix}[${queryPart}]`;
};
