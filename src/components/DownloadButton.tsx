import type { FC } from 'react'

export interface DownloadButtonProps {
  disabled?: boolean
  onClick?: () => void
}

const DownloadButton: FC<DownloadButtonProps> = ({ disabled = true, onClick }) => {
  return (
    <button
      type="button"
      className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-white/15"
      disabled={disabled}
      onClick={onClick}
    >
      加工済み画像をダウンロード（準備中）
    </button>
  )
}

export default DownloadButton
