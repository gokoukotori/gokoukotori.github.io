import { avatarHref, resolveAvatarRoute } from './avatar-navigation.js';

export function galleryPhotoHref(photoId, returnTo) {
  const params = new URLSearchParams({ photo: photoId });
  if (returnTo) params.set('returnTo', returnTo);
  return `/gallery/?${params}`;
}

export function galleryReturnHref(search, avatars) {
  const returnTo = new URLSearchParams(search).get('returnTo');
  if (!returnTo?.startsWith('/avatars/#/')) return null;
  const route = resolveAvatarRoute(returnTo.slice('/avatars/'.length), avatars);
  return !route.notFound && route.theme && route.outfit ? returnTo : null;
}

export function galleryPhotoIndex(search, gallery) {
  const id = new URLSearchParams(search).get('photo');
  return gallery.findIndex((photo) => photo.id === id);
}

export function outfitGalleryPhotos(outfit, gallery) {
  const photosById = new Map(gallery.map((photo) => [photo.id, photo]));
  return [...new Set(outfit?.galleryPhotoIds ?? [])]
    .map((id) => photosById.get(id))
    .filter(Boolean);
}

export function galleryNavigationPhotos(search, avatars, gallery) {
  const returnTo = galleryReturnHref(search, avatars);
  if (!returnTo) return gallery;
  const { outfit } = resolveAvatarRoute(returnTo.slice('/avatars/'.length), avatars);
  return outfitGalleryPhotos(outfit, gallery);
}

export function photoOutfitLinks(photoId, avatars) {
  return avatars.flatMap((avatar) => avatar.themes.flatMap((theme) =>
    theme.outfits.filter((outfit) => outfit.galleryPhotoIds?.includes(photoId))
      .map((outfit) => ({
        href: `/avatars/${avatarHref(avatar.id, theme.id, outfit.id)}`,
        label: `${avatar.name} / ${theme.name} / ${outfit.name}`,
      })),
  ));
}
