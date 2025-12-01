export type ProcessingType = 'mosaic' | 'blur' | 'stamp'
export type DetectionMode = 'auto' | 'manual'
export type ManualModeType = 'include' | 'exclude'

export interface FaceDetectionResult {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface FileValidationConfig {
  maxFileSizeMB: number
  maxWidth: number
  maxHeight: number
  allowedMimeTypes: string[]
}

export interface ToastMessage {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  duration?: number
}

export interface ProcessingOption {
  label: string
  value: ProcessingType
  description: string
  emoji?: string
}
