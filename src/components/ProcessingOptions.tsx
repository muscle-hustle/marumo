import type { FC } from 'react'
import type { ProcessingOption, ProcessingType } from '../types'

export interface ProcessingOptionsProps {
  options: ProcessingOption[]
  selected: ProcessingType
  onProcessingChange: (type: ProcessingType) => void
}

const ProcessingOptions: FC<ProcessingOptionsProps> = ({
  options,
  selected,
  onProcessingChange,
}) => {
  return (
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
  )
}

export default ProcessingOptions
