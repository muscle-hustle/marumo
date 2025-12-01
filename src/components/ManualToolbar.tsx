import type { FC } from 'react'
import type { ManualModeType } from '../types'

export interface ManualToolbarProps {
    manualMode: ManualModeType
    onManualModeChange: (mode: ManualModeType) => void
    onReset: () => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
    onAutoSelect?: () => void
}

const ManualToolbar: FC<ManualToolbarProps> = ({
    manualMode,
    onManualModeChange,
    onReset,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onAutoSelect,
}) => {
    return (
        <div className="glass-panel flex flex-wrap items-center gap-3 p-4">
            {onAutoSelect && (
                <>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onAutoSelect}
                            className="rounded-lg border border-primary-400/50 bg-primary-500/50 px-4 py-2 text-xs font-semibold text-primary-100 transition hover:border-primary-400/90 hover:bg-primary-500/90 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
                            aria-label="自動選択"
                        >
                            自動選択
                        </button>
                    </div>
                    <div className="h-6 w-px bg-white/20" />
                </>
            )}

            {/* トグルスイッチ風の範囲選択・除外 */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/80">操作:</span>
                <div className="flex rounded-lg border border-white/20 bg-white/10 p-1">
                    <button
                        type="button"
                        onClick={() => onManualModeChange('include')}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${manualMode === 'include'
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                        aria-pressed={manualMode === 'include'}
                        aria-label="範囲選択モード"
                    >
                        範囲選択
                    </button>
                    <button
                        type="button"
                        onClick={() => onManualModeChange('exclude')}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${manualMode === 'exclude'
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                        aria-pressed={manualMode === 'exclude'}
                        aria-label="範囲除外モード"
                    >
                        範囲除外
                    </button>
                </div>
            </div>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onReset}
                    className="rounded-lg border border-red-400/30 bg-red-500/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/50 hover:bg-red-500/40 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
                    aria-label="リセット"
                >
                    リセット
                </button>
            </div>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex items-center justify-center rounded-lg border border-white/20 bg-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-white/5"
                    aria-label="戻す"
                    title="戻す"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                    >
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="flex items-center justify-center rounded-lg border border-white/20 bg-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-white/5"
                    aria-label="進む"
                    title="進む"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                    >
                        <path d="M21 7v6h-6" />
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default ManualToolbar

