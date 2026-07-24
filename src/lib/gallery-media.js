export const DEFAULT_GALLERY_IMAGE_BASE_URL =
  'https://media.gokoukotori.com/media';

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

export function normalizeGalleryImageKey(key) {
  if (
    typeof key !== 'string'
    || key.length === 0
    || key.startsWith('/')
    || key.includes('\\')
  ) {
    throw new Error(`Invalid gallery image key: ${key}`);
  }

  const segments = key.split('/');
  if (segments.some((segment) =>
    segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`Invalid gallery image key: ${key}`);
  }

  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function galleryImageUrl(
  key,
  baseUrl = import.meta.env?.VITE_GALLERY_IMAGE_BASE_URL
    ?? DEFAULT_GALLERY_IMAGE_BASE_URL,
) {
  return `${normalizeBaseUrl(baseUrl)}/${normalizeGalleryImageKey(key)}`;
}
