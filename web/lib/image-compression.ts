const targetPhotoMaxSizeMb = 0.8
const targetPhotoMaxWidthOrHeight = 1600

export async function compressProfilePhoto(file: File): Promise<File> {
  // Skip compression for already-small files.
  if (file.size <= 400 * 1024) return file

  const { default: imageCompression } = await import("browser-image-compression")

  return imageCompression(file, {
    maxSizeMB: targetPhotoMaxSizeMb,
    maxWidthOrHeight: targetPhotoMaxWidthOrHeight,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  })
}
