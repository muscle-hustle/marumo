import type { FileValidationConfig } from '../types'
import { defaultValidationConfig, validateFile, type ValidationResult } from '../utils/imageValidation'

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
  const src = await readFileAsDataURL(file)

  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    image.src = src
  })
}

export const validateImageFile = (
  file: File,
  config: FileValidationConfig = defaultValidationConfig,
): ValidationResult => {
  return validateFile(file, config)
}
