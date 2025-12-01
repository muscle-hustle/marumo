import type { FC } from 'react'
import type { DetectionMode } from '../types'

export interface ModeSelectorProps {
  onModeSelect: (mode: DetectionMode) => void
}

const ModeSelector: FC<ModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold sm:text-3xl">モードを選択してください</h2>
          <p className="mt-2 text-sm text-white/70 sm:text-base">
            自動モードまたは手動モードを選択して、画像の加工を開始します
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onModeSelect('auto')}
            className="group glass-panel flex flex-col items-center gap-4 p-8 text-left transition hover:border-primary-400/50 hover:bg-primary-400/10 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-3xl">
              ⚡
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">自動モード</h3>
              <p className="text-sm text-white/70">
                画像を選択すると、自動で顔を検出してモザイクを適用します。簡単に素早く加工できます。
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onModeSelect('manual')}
            className="group glass-panel flex flex-col items-center gap-4 p-8 text-left transition hover:border-primary-400/50 hover:bg-primary-400/10 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-3xl">
              ✏️
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">手動モード</h3>
              <p className="text-sm text-white/70">
                投げ縄ツールで範囲を選択して、細かく顔の加工を調整できます。範囲選択、除外、履歴操作が可能です。
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModeSelector

