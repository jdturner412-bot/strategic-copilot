/**
 * Photos come off an iPad camera at several megabytes each. IndexedDB would
 * hold them, but a wall display re-reading a 4 MB avatar on every render is
 * wasteful, so images are downscaled and re-encoded before they are stored.
 */
async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return createImageBitmap(file)
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number,
  square: boolean,
): HTMLCanvasElement {
  const sourceWidth = source.width
  const sourceHeight = source.height
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  if (square) {
    // Centre-crop to a square so avatars are never distributed by aspect ratio.
    const edge = Math.min(sourceWidth, sourceHeight)
    canvas.width = Math.min(edge, maxEdge)
    canvas.height = canvas.width
    context.drawImage(
      source,
      (sourceWidth - edge) / 2, (sourceHeight - edge) / 2, edge, edge,
      0, 0, canvas.width, canvas.height,
    )
    return canvas
  }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  canvas.width = Math.round(sourceWidth * scale)
  canvas.height = Math.round(sourceHeight * scale)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** A square, downscaled data URL — small enough to keep inline on the member record. */
export async function fileToAvatarDataUrl(file: File, maxEdge = 256): Promise<string> {
  const bitmap = await loadBitmap(file)
  const canvas = draw(bitmap, maxEdge, true)
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** A downscaled Blob for the screensaver, where the display is the limit. */
export async function fileToPhotoBlob(file: File, maxEdge = 1920): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const canvas = draw(bitmap, maxEdge, false)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image'))),
      'image/jpeg',
      0.85,
    )
  })
}
