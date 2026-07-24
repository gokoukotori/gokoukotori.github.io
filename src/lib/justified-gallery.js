function aspectRatio(photo, index) {
  const width = Number(photo?.width);
  const height = Number(photo?.height);

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new RangeError(
      `Photo at index ${index} must have positive finite width and height.`,
    );
  }

  return width / height;
}

function placeRow({
  ratios,
  items,
  start,
  end,
  y,
  height,
  gap,
}) {
  let x = 0;

  for (let index = start; index < end; index += 1) {
    const width = ratios[index] * height;

    items[index] = {
      index,
      x,
      y,
      width,
      height,
    };

    x += width + gap;
  }

  return y + height + gap;
}

export function createJustifiedLayout(
  photos,
  {
    containerWidth,
    gap,
    targetRowHeight,
    singleColumn = false,
  } = {},
) {
  if (!Array.isArray(photos)) {
    throw new TypeError('photos must be an array.');
  }

  if (photos.length === 0 || !Number.isFinite(containerWidth)) {
    return { items: [], height: 0 };
  }

  if (containerWidth <= 0) {
    return { items: [], height: 0 };
  }

  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError('gap must be a non-negative finite number.');
  }

  if (
    !singleColumn &&
    (!Number.isFinite(targetRowHeight) || targetRowHeight <= 0)
  ) {
    throw new RangeError(
      'targetRowHeight must be a positive finite number.',
    );
  }

  const ratios = photos.map(aspectRatio);
  const items = new Array(photos.length);
  let y = 0;

  if (singleColumn) {
    for (let index = 0; index < photos.length; index += 1) {
      const height = containerWidth / ratios[index];
      items[index] = {
        index,
        x: 0,
        y,
        width: containerWidth,
        height,
      };
      y += height + gap;
    }

    return {
      items,
      height: Math.max(0, y - gap),
    };
  }

  const justifiedHeight = (start, end, ratioSum) =>
    (containerWidth - gap * (end - start - 1)) / ratioSum;

  let rowStart = 0;
  let rowEnd = 0;
  let ratioSum = 0;

  while (rowEnd < photos.length) {
    if (rowEnd === rowStart) {
      ratioSum = ratios[rowEnd];
      rowEnd += 1;
      continue;
    }

    const heightBefore = justifiedHeight(rowStart, rowEnd, ratioSum);
    const nextRatioSum = ratioSum + ratios[rowEnd];
    const heightAfter = justifiedHeight(
      rowStart,
      rowEnd + 1,
      nextRatioSum,
    );

    if (heightAfter > targetRowHeight) {
      ratioSum = nextRatioSum;
      rowEnd += 1;
      continue;
    }

    const useCurrentRow =
      Math.abs(heightBefore - targetRowHeight) <=
      Math.abs(heightAfter - targetRowHeight);

    if (!useCurrentRow) {
      ratioSum = nextRatioSum;
      rowEnd += 1;
    }

    const rowHeight = useCurrentRow ? heightBefore : heightAfter;
    y = placeRow({
      ratios,
      items,
      start: rowStart,
      end: rowEnd,
      y,
      height: rowHeight,
      gap,
    });

    rowStart = rowEnd;
    ratioSum = 0;
  }

  if (rowStart < photos.length) {
    y = placeRow({
      ratios,
      items,
      start: rowStart,
      end: photos.length,
      y,
      height: targetRowHeight,
      gap,
    });
  }

  return {
    items,
    height: Math.max(0, y - gap),
  };
}
