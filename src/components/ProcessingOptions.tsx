import type { FC } from 'react'
import type { ProcessingOption, ProcessingType } from '../types'

export interface ProcessingOptionsProps {
  options: ProcessingOption[]
  selected: ProcessingType
  onProcessingChange: (type: ProcessingType) => void
  intensity?: number
  onIntensityChange?: (intensity: number) => void
  intensityMin?: number
  intensityMax?: number
}

const ProcessingOptions: FC<ProcessingOptionsProps> = ({
  options,
  selected,
  onProcessingChange,
  intensity = 5,
  onIntensityChange,
  intensityMin = 1,
  intensityMax = 10,
}) => {
  // モザイクまたはぼかしが選択されている場合のみ強度スライダーを表示
  const showIntensitySlider = selected === 'mosaic' || selected === 'blur'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${selected === option.value
              ? 'border-primary-400 bg-primary-400/10 text-white'
              : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20'
              }`}
            aria-pressed={selected === option.value}
            onClick={() => onProcessingChange(option.value)}
          >
            {option.emoji && <span className="text-lg">{option.emoji}</span>}
            <span className="text-sm font-semibold text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {showIntensitySlider && onIntensityChange && (
        <div className="border-t border-white/10 pt-6">
          <label htmlFor="intensity-slider" className="block text-sm font-medium text-white/90 mb-3">
            {selected === 'mosaic' ? 'モザイクの細かさ' : 'ぼかしの強さ'}: {intensity}
          </label>
          <input
            id="intensity-slider"
            type="range"
            min={intensityMin}
            max={intensityMax}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface-dark"
            aria-label={selected === 'mosaic' ? 'モザイクの細かさ調整' : 'ぼかしの強さ調整'}
            aria-valuemin={intensityMin}
            aria-valuemax={intensityMax}
            aria-valuenow={intensity}
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            {selected === 'mosaic' ? (
              <>
                <span>粗い ({intensityMin})</span>
                <span>細かい ({intensityMax})</span>
              </>
            ) : (
              <>
                <span>弱い ({intensityMin})</span>
                <span>強い ({intensityMax})</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProcessingOptions
