import { useEffect, useState } from 'react'
import { generateQRCodeDataURL } from '@/utils/qrCode'
import { Loader2 } from 'lucide-react'

interface QRCodeDisplayProps {
  containerId: string
  size?: number
  className?: string
}

export function QRCodeDisplay({
  containerId,
  size = 200,
  className = ''
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateQRCodeDataURL(containerId, { width: size })
      .then(setDataUrl)
      .catch(() => setError('Failed to generate QR code'))
  }, [containerId, size])

  if (error) {
    return (
      <div className="flex items-center justify-center bg-zinc-100 rounded-lg p-4">
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-100 rounded-lg"
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  )
}
