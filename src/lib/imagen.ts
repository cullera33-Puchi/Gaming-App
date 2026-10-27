/** Reduce una imagen elegida en el móvil a una portada ligera en JPEG. */
export async function imagenAPortada(fichero: File, ancho = 264): Promise<string> {
  const bitmap = await createImageBitmap(fichero)
  const escala = Math.min(1, ancho / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.8)
}
