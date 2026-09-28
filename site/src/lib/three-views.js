// Existing single-image settings remain readable without rewriting saved content.
export function threeViews(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}
