import type { FC } from 'react'

export type StampType = 'emoji1' | 'emoji2' | 'emoji3' | 'emoji4' | 'emoji5'

export interface StampOption {
  value: StampType
  emoji: string
  label: string
}

export interface StampSelectorProps {
  selected: StampType
  onStampChange: (stamp: StampType) => void
}

const stampOptions: StampOption[] = [
  { value: 'emoji1', emoji: '😀', label: 'にっこり' },
  { value: 'emoji2', emoji: '😊', label: '笑顔' },
  { value: 'emoji3', emoji: '😎', label: 'サングラス' },
  { value: 'emoji4', emoji: '😴', label: '眠い' },
  { value: 'emoji5', emoji: '🤔', label: '考える' },
]

const StampSelector: FC<StampSelectorProps> = ({ selected, onStampChange }) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">スタンプの種類を選択してください</p>
      <div className="grid grid-cols-5 gap-2">
        {stampOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex flex-col items-center justify-center rounded-xl border p-3 transition focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${selected === option.value
                ? 'border-primary-400 bg-primary-400/20 text-white'
                : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10'
              }`}
            aria-pressed={selected === option.value}
            onClick={() => onStampChange(option.value)}
            title={option.label}
            aria-label={`${option.label}スタンプを選択`}
          >
            <span className="text-3xl">{option.emoji}</span>
            <span className="mt-1 hidden text-xs sm:block">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default StampSelector

