import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { parseQRCodeURL } from '@/utils/qrCode'
import { Button } from '@/components/ui/Button'
import { Camera, X, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (containerId: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  // Keep onScanRef up to date
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const scannerId = 'qr-scanner-region'
    // Use a ref to track if the specific instance is mounted and active
    let isMounted = true
    let scanner: Html5Qrcode | null = null

    const initScanner = async () => {
      try {
        // cleanup previous instance if it exists (safety check)
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop()
          } catch (e) {
            // ignore stop errors on cleanup
          }
          scannerRef.current = null
        }

        scanner = new Html5Qrcode(scannerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!isMounted) return

            console.log('QR Code scanned:', decodedText)
            const containerId = parseQRCodeURL(decodedText)
            if (containerId) {
              console.log('Container ID extracted:', containerId)

              // Prevent multiple calls
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  if (isMounted) onScanRef.current(containerId)
                }).catch(console.error)
              }
            } else {
              // Show feedback for invalid QR codes
              console.warn('Invalid Stowaway QR code:', decodedText)
              setScanMessage('Not a valid Stowaway QR code. Keep scanning...')
              setTimeout(() => {
                if (isMounted) setScanMessage(null)
              }, 2000)
            }
          },
          () => {
            // Ignore scan failures (no QR detected)
          }
        )

        if (isMounted) {
          setIsStarting(false)
        } else {
          // If unmounted during start, stop immediately
          scanner.stop().catch(console.error)
        }
      } catch (err) {
        if (!isMounted) return

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

    // Small delay to ensure DOM is ready
    const timerId = setTimeout(initScanner, 100)

    return () => {
      isMounted = false
      clearTimeout(timerId)

      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          // Use console.warn for cleanup errors to avoid polluting logs with expected interruptions
          console.warn('Failed to stop scanner during cleanup:', err)
        })
        scannerRef.current = null
      }
    }
  }, [])

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

      {/* Instructions and Scan Messages */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center bg-gradient-to-t from-black/80 to-transparent">
          {scanMessage ? (
            <p className="text-yellow-400 text-sm font-medium animate-pulse">
              {scanMessage}
            </p>
          ) : (
            <p className="text-white/80 text-sm">
              Point your camera at a Stowaway QR code
            </p>
          )}
        </div>
      )}
    </div>
  )
}
