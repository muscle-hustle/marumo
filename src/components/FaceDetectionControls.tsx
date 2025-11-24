import type { FC } from 'react'
import type { DetectionMode, ManualModeType } from '../types'

export interface FaceDetectionControlsProps {
  detectionMode: DetectionMode
  manualMode: ManualModeType
  onDetectionModeChange: (mode: DetectionMode) => void
  onManualModeChange: (mode: ManualModeType) => void
  onDetect?: () => void
}

const FaceDetectionControls: FC<FaceDetectionControlsProps> = ({
  detectionMode,
  manualMode,
  onDetectionModeChange,
  onManualModeChange,
  onDetect,
}) => {
  const detectionButtons: Array<{ value: DetectionMode; label: string }> = [
    { value: 'auto', label: '自動モード' },
    { value: 'manual', label: '手動モード' },
  ]

  const manualButtons: Array<{ value: ManualModeType; label: string }> = [
    { value: 'include', label: '囲った顔を加工' },
    { value: 'exclude', label: '囲った顔を除外' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-primary-100">検出モード</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {detectionButtons.map((button) => (
            <button
              key={button.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm transition ${
                detectionMode === button.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
              aria-pressed={detectionMode === button.value}
              onClick={() => onDetectionModeChange(button.value)}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      {detectionMode === 'manual' && (
        <div>
          <p className="text-sm font-semibold text-primary-100">投げ縄範囲の扱い</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {manualButtons.map((button) => (
              <button
                key={button.value}
                type="button"
                className={`rounded-full px-4 py-2 text-sm transition ${
                  manualMode === button.value
                    ? 'bg-primary-300/20 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
                aria-pressed={manualMode === button.value}
                onClick={() => onManualModeChange(button.value)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
        <p>
          顔検出エンジンの実装はSTEP3で追加予定です。それまではUIのみで動作確認できます。
        </p>
        <button
          type="button"
          className="w-full rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70"
          disabled
          onClick={onDetect}
        >
          顔を検出（準備中）
        </button>
      </div>
    </div>
  )
}

export default FaceDetectionControls
