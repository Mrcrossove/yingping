export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  targetSize?: number
  minQuality?: number
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  targetSize: 900 * 1024,
  minQuality: 0.58,
}

const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function compressImageFile(file: File, options: CompressImageOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file
  if (file.size <= config.targetSize && file.type !== 'image/png') return file

  const bitmap = await createImageBitmap(file)
  const { width, height } = fitSize(bitmap.width, bitmap.height, config.maxWidth, config.maxHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = config.quality
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  while (blob.size > config.targetSize && quality > config.minQuality) {
    quality = Math.max(config.minQuality, quality - 0.08)
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  if (blob.size >= file.size) return file
  const filename = replaceExt(file.name, '.jpg')
  return new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() })
}

function fitSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片压缩失败'))
    }, type, quality)
  })
}

function replaceExt(name: string, ext: string) {
  return name.replace(/\.[^.]+$/, '') + ext
}
