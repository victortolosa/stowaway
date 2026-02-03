import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useInventory } from '@/hooks'
import { Download, Plus, Minus, X } from 'lucide-react'
import { generateQRCodeDataURL } from '@/utils/qrCode'

interface BatchPrintModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SelectedContainer {
  id: string
  name: string
  quantity: number
}

export function BatchPrintModal({ isOpen, onClose }: BatchPrintModalProps) {
  const { containers, places } = useInventory()
  const [selectedContainers, setSelectedContainers] = useState<SelectedContainer[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const toggleContainer = (containerId: string, containerName: string) => {
    setSelectedContainers(prev => {
      const exists = prev.find(c => c.id === containerId)
      if (exists) {
        return prev.filter(c => c.id !== containerId)
      } else {
        return [...prev, { id: containerId, name: containerName, quantity: 1 }]
      }
    })
  }

  const updateQuantity = (containerId: string, delta: number) => {
    setSelectedContainers(prev =>
      prev.map(c =>
        c.id === containerId
          ? { ...c, quantity: Math.max(1, Math.min(10, c.quantity + delta)) }
          : c
      )
    )
  }

  const handleGenerateBatchPNG = async () => {
    if (selectedContainers.length === 0) return

    setIsGenerating(true)
    try {
      // Generate all QR codes
      const qrCodes: string[] = []
      for (const container of selectedContainers) {
        for (let i = 0; i < container.quantity; i++) {
          const dataUrl = await generateQRCodeDataURL(container.id, { width: 400 })
          qrCodes.push(dataUrl)
        }
      }

      // Create a long canvas with all QR codes
      const qrSize = 400
      const padding = 40
      const labelHeight = 80
      const itemHeight = qrSize + labelHeight + padding
      const canvas = document.createElement('canvas')
      canvas.width = qrSize + (padding * 2)
      canvas.height = (itemHeight * qrCodes.length) + padding

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw each QR code
      let yOffset = padding
      let containerIndex = 0
      let quantityIndex = 0

      for (let i = 0; i < qrCodes.length; i++) {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = qrCodes[i]
        })

        // Draw QR code
        ctx.drawImage(img, padding, yOffset, qrSize, qrSize)

        // Draw container name
        const container = selectedContainers[containerIndex]
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(
          container.name,
          canvas.width / 2,
          yOffset + qrSize + 35
        )

        // Draw copy number if quantity > 1
        if (container.quantity > 1) {
          ctx.font = '18px Arial'
          ctx.fillStyle = '#666666'
          ctx.fillText(
            `Copy ${quantityIndex + 1} of ${container.quantity}`,
            canvas.width / 2,
            yOffset + qrSize + 60
          )
        }

        yOffset += itemHeight

        // Move to next container if all quantities are done
        quantityIndex++
        if (quantityIndex >= container.quantity) {
          containerIndex++
          quantityIndex = 0
        }
      }

      // Convert canvas to blob and download/share
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Failed to generate image')

        const fileName = `batch_qr_codes_${Date.now()}.png`

        // Try Web Share API (for iOS)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: 'image/png' })

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Batch QR Codes',
              text: `${selectedContainers.length} QR codes`
            })
            return
          }
        }

        // Fallback download
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = fileName
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }, 'image/png')

      onClose()
    } catch (error) {
      console.error('Failed to generate batch QR codes:', error)
      alert('Failed to generate QR codes. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batch Print QR Codes">
      <div className="flex flex-col gap-6">
        {/* Selected containers summary */}
        {selectedContainers.length > 0 && (
          <div className="bg-accent-aqua/10 rounded-lg p-4">
            <p className="font-body text-sm text-text-secondary mb-3">
              Selected: {selectedContainers.length} containers, {selectedContainers.reduce((sum, c) => sum + c.quantity, 0)} total QR codes
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedContainers.map(container => (
                <div
                  key={container.id}
                  className="bg-white rounded-full px-3 py-2 flex items-center gap-2 shadow-sm"
                >
                  <span className="font-body text-sm font-medium text-text-primary">
                    {container.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(container.id, -1)}
                      className="w-6 h-6 rounded-full bg-bg-surface hover:bg-bg-elevated flex items-center justify-center transition-colors"
                      disabled={container.quantity <= 1}
                    >
                      <Minus size={12} className="text-text-secondary" />
                    </button>
                    <span className="font-display text-sm font-semibold text-text-primary w-6 text-center">
                      {container.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(container.id, 1)}
                      className="w-6 h-6 rounded-full bg-bg-surface hover:bg-bg-elevated flex items-center justify-center transition-colors"
                      disabled={container.quantity >= 10}
                    >
                      <Plus size={12} className="text-text-secondary" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleContainer(container.id, container.name)}
                    className="w-5 h-5 rounded-full hover:bg-red-100 flex items-center justify-center transition-colors"
                  >
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Container list */}
        <div className="max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {containers.map(container => {
              const place = places.find(p => p.id === container.placeId)
              const isSelected = selectedContainers.some(c => c.id === container.id)

              return (
                <button
                  key={container.id}
                  onClick={() => toggleContainer(container.id, container.name)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                      ? 'border-accent-aqua bg-accent-aqua/5'
                      : 'border-border-standard hover:border-accent-aqua/50 bg-bg-surface'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-[15px] font-semibold text-text-primary">
                        {container.name}
                      </h4>
                      <p className="font-body text-[13px] text-text-secondary">
                        {place?.name || 'Unknown place'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-accent-aqua flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerateBatchPNG}
          disabled={selectedContainers.length === 0 || isGenerating}
          className="w-full"
        >
          <Download className="w-5 h-5 mr-2" />
          {isGenerating ? 'Generating...' : `Generate ${selectedContainers.reduce((sum, c) => sum + c.quantity, 0)} QR Codes`}
        </Button>
      </div>
    </Modal>
  )
}
