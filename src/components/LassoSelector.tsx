import type { FC } from 'react'

export interface LassoSelectorProps {
  isManualMode: boolean
}

const LassoSelector: FC<LassoSelectorProps> = ({ isManualMode }) => {
  return (
    <div className="space-y-4 text-sm text-white/75">
      <p>
        投げ縄ツールは、手動モードで「囲った顔を加工／除外」を切り替えながら使用します。
        STEP4でCanvasと連動した描画が有効になります。
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>手動モードを選択し、処理対象のモードを切り替える</li>
        <li>ドラッグで自由形状の範囲を描画する</li>
        <li>範囲が閉じると、その中の顔を自動判定します</li>
      </ol>
      {!isManualMode && (
        <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          手動モードを選択すると利用できます。現在は自動モードが選択されています。
        </p>
      )}
    </div>
  )
}

export default LassoSelector
