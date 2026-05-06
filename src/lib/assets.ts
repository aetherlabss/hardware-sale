/**
 * Asset Utility
 * Helps resolving images.
 * Now acts as a simple pass-through for public assets.
 */

export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.includes('hardwaresaleogo.jpeg') || path.includes('logo.jpg')) return '/hardwaresaleogo.jpeg';
  
  // Provide Unsplash fallbacks for the deleted tech assets
  return 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80';
}
