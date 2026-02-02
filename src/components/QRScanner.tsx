import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { parseQRCodeURL } from '@/utils/qrCode'
import { Button } from '@/components/ui/Button'
import { Camera, X, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (containerId: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)

  useEffect(() => {
    const scannerId = 'qr-scanner-region'
    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            const containerId = parseQRCodeURL(decodedText)
            if (containerId) {
              // Stop scanner before navigating
              scanner.stop().then(() => {
                onScan(containerId)
              })
            }
          },
          () => {
            // Ignore scan failures (no QR detected)
          }
        )
        setIsStarting(false)
      } catch (err) {
        console.error('QR Scanner error:', err)
        if (err instanceof Error) {
          if (err.message.includes('Permission')) {
            setError('Camera permission denied. Please allow camera access.')
          } else if (err.message.includes('NotFoundError')) {
            setError('No camera found on this device.')
          } else {
            setError('Failed to start camera. Please try again.')
          }
        }
        setIsStarting(false)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          scannerRef.current.stop().catch(console.error)
        }
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-semibold">Scan QR Code</h2>
        <Button
          variant="secondary"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Scanner Region */}
      <div className="flex items-center justify-center h-full">
        {error ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white">{error}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="relative">
            <div
              id="qr-scanner-region"
              className="w-[300px] h-[300px] overflow-hidden rounded-2xl"
            />
            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 rounded-2xl">
                <Camera className="w-12 h-12 text-zinc-500 animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white/80 text-sm">
            Point your camera at a Stowaway QR code
          </p>
        </div>
      )}
    </div>
  )
}
