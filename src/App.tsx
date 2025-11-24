import type { FC } from 'react'
import type {
    DetectionMode,
    ManualModeType,
    ProcessingOption,
} from './types'

const detectionModes: Array<{ value: DetectionMode; label: string; desc: string }> = [
    {
        value: 'auto',
        label: '自動モード',
        desc: '画像内のすべての顔を検出して自動的にマスクします。',
    },
    {
        value: 'manual',
        label: '手動モード',
        desc: '投げ縄ツールで範囲を指定して検出対象を絞り込みます。',
    },
]

const manualModes: Array<{ value: ManualModeType; label: string; desc: string }> = [
    {
        value: 'include',
        label: '囲った顔を加工',
        desc: '選択範囲内の顔のみ加工します。',
    },
    {
        value: 'exclude',
        label: '囲った顔を除外',
        desc: '選択範囲外の顔を一括で加工します。',
    },
]

const processingOptions: ProcessingOption[] = [
    {
        label: 'モザイク',
        value: 'mosaic',
        description: 'ピクセルを粗くして顔の輪郭をぼかします。',
    },
    {
        label: 'ぼかし',
        value: 'blur',
        description: 'ガウシアンブラーで柔らかくぼかします。',
    },
    {
        label: 'スタンプ',
        value: 'stamp',
        description: '絵文字スタンプで遊び心のあるマスクを適用します。',
    },
]

const App: FC = () => {
    return (
        <div className="bg-surface-dark text-white min-h-screen">
            <header className="relative isolate overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 opacity-80" />
                <div className="relative px-6 py-16 sm:px-12 lg:px-20">
                    <p className="font-display text-primary-200 text-sm tracking-[0.3em] uppercase">
                        marumo
                    </p>
                    <h1 className="mt-4 text-3xl font-display font-bold sm:text-4xl lg:text-5xl">
                        まるっと囲んで、すぐモザイク
                    </h1>
                    <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
                        marumo（まるも）は、写真をサーバーに送信せずブラウザだけで安全にモザイク加工できるツールです。
                    </p>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8 lg:px-12">
                <section className="glass-panel p-6 sm:p-8">
                    <h2 className="text-xl font-display font-semibold text-primary-100">
                        実装予定の主要機能
                    </h2>
                    <div className="mt-6 grid gap-6 lg:grid-cols-3">
                        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-base font-semibold text-white">顔検出モード</h3>
                            <ul className="mt-4 space-y-4">
                                {detectionModes.map((mode) => (
                                    <li key={mode.value} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-sm font-semibold text-primary-100">{mode.label}</p>
                                        <p className="mt-2 text-xs text-white/70">{mode.desc}</p>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-base font-semibold text-white">投げ縄モード</h3>
                            <ul className="mt-4 space-y-4">
                                {manualModes.map((mode) => (
                                    <li key={mode.value} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-sm font-semibold text-primary-100">{mode.label}</p>
                                        <p className="mt-2 text-xs text-white/70">{mode.desc}</p>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-base font-semibold text-white">加工オプション</h3>
                            <ul className="mt-4 space-y-4">
                                {processingOptions.map((option) => (
                                    <li
                                        key={option.value}
                                        className="rounded-xl border border-white/10 bg-black/20 p-4"
                                    >
                                        <p className="text-sm font-semibold text-primary-100">{option.label}</p>
                                        <p className="mt-2 text-xs text-white/70">{option.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default App
