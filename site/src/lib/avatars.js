import content from '../data/content.json' with { type: 'json' };
import originalPhotos from '../data/gallery.json' with { type: 'json' };
import { mediaLibrary } from './media-library.js';
import { galleryImageUrl } from './gallery-media.js';

const photosById = new Map(mediaLibrary(content, originalPhotos).map(photo => [photo.id, photo]));

export function avatarPhotoUrl(id, thumbnail = false) {
  const photo = photosById.get(id);
  return photo ? galleryImageUrl(thumbnail ? photo.thumbnailKey : photo.displayKey) : undefined;
}

export const isSampleContent = content.isSampleContent;
export const avatars = content.avatars;
