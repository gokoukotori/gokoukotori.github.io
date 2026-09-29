export function outfitPhotoIds(outfit) {
  return [...new Set([outfit.photo, ...(outfit.additionalPhotoIds ?? [])])];
}
