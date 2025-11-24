import type { FileValidationConfig } from '../types'

export interface ValidationResult {
  valid: boolean
  error?: 'INVALID_TYPE' | 'FILE_TOO_LARGE'
}

export const defaultValidationConfig: FileValidationConfig = {
  maxFileSizeMB: 10,
  maxWidth: 3840,
  maxHeight: 2160,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
}

export const validateFile = (
  file: File,
  config: FileValidationConfig = defaultValidationConfig,
): ValidationResult => {
  if (!config.allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: 'INVALID_TYPE' }
  }

  const sizeInMB = file.size / (1024 * 1024)
  if (sizeInMB > config.maxFileSizeMB) {
    return { valid: false, error: 'FILE_TOO_LARGE' }
  }

  return { valid: true }
}
