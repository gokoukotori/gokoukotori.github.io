export function mediaLibrary(content, originalPhotos) {
  return [...originalPhotos, ...content.media].map(photo => ({
    ...photo, listed: !photo.id.startsWith('cms-'),
    ...content.photoSettings[photo.id],
  })).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt) || a.id.localeCompare(b.id));
}

export function publicGallery(content, originalPhotos) {
  return mediaLibrary(content, originalPhotos).filter(photo => photo.listed)
    .map((photo, index) => ({ ...photo, featured: index === 0 }));
}
