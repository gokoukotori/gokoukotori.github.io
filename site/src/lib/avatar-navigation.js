export function avatarHref(...ids) {
  return ids.length ? `#/` + ids.map(encodeURIComponent).join('/') : '#/';
}

export function resolveAvatarRoute(hash, avatars) {
  let ids;
  try {
    ids = hash.replace(/^#\/?/, '').replace(/\/$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { notFound: true };
  }
  if (!ids.length) return { notFound: false };
  const avatar = avatars.find((item) => item.id === ids[0]);
  const theme = avatar?.themes.find((item) => item.id === ids[1]);
  const outfit = ids[2]
    ? theme?.outfits.find((item) => item.id === ids[2])
    : theme?.outfits[0];
  return {
    avatar, theme, outfit,
    notFound: ids.length > 3 || !avatar || (ids.length > 1 && !theme) || (ids.length > 2 && !outfit),
  };
}
