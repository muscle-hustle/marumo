import type { FC } from 'react'
import type { ProcessingOption, ProcessingType } from '../types'

export interface ProcessingOptionsProps {
  options: ProcessingOption[]
  selected: ProcessingType
  intensity: number
  onProcessingChange: (type: ProcessingType) => void
  onIntensityChange: (value: number) => void
}

const ProcessingOptions: FC<ProcessingOptionsProps> = ({
  options,
  selected,
  intensity,
  onProcessingChange,
  onIntensityChange,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition ${
              selected === option.value
                ? 'border-primary-400 bg-primary-400/10 text-white'
                : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20'
            }`}
            aria-pressed={selected === option.value}
            onClick={() => onProcessingChange(option.value)}
          >
            <span className="text-sm font-semibold text-white">{option.label}</span>
            <span className="text-xs text-white/70">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-white">
          <span>加工強度（仮）</span>
          <span className="text-white/70">{intensity}</span>
        </div>
        <input
          className="mt-3 w-full accent-primary-400"
          type="range"
          min={1}
          max={10}
          step={1}
          value={intensity}
          onChange={(event) => onIntensityChange(Number(event.target.value))}
        />
        <p className="mt-2 text-xs text-white/60">高度な設定はSTEP5で実際の処理に連動します。</p>
      </div>
    </div>
  )
}

export default ProcessingOptions
