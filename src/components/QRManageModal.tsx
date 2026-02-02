import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { QRCodeDisplay } from '@/components/QRCodeDisplay'
import { QrCode, Download, Trash2, Sparkles } from 'lucide-react'
import { Container } from '@/types'
import { generateQRCodeForContainer, removeQRCodeFromContainer } from '@/services/firebaseService'

interface QRManageModalProps {
  isOpen: boolean
  onClose: () => void
  container: Container
  onRefresh: () => void
  onViewLabel: () => void
}

export function QRManageModal({
  isOpen,
  onClose,
  container,
  onRefresh,
  onViewLabel,
}: QRManageModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateQRCodeForContainer(container.id)
      await onRefresh()
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeQRCodeFromContainer(container.id)
      await onRefresh()
      onClose()
    } catch (error) {
      console.error('Failed to remove QR code:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleViewLabel = () => {
    onViewLabel()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code">
      <div className="flex flex-col gap-6">
        {container.qrCodeId ? (
          <>
            {/* QR Code Preview */}
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <QRCodeDisplay containerId={container.id} size={200} />
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode size={18} className="text-accent-aqua" strokeWidth={2} />
                <h3 className="font-display text-[16px] font-semibold text-text-primary">
                  QR Code Active
                </h3>
              </div>
              <p className="font-body text-[14px] text-text-secondary">
                Scan to quickly access <span className="font-semibold">{container.name}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                leftIcon={Download}
                onClick={handleViewLabel}
              >
                Download Label
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={Trash2}
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove QR Code'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* No QR Code State */}
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 bg-gradient-to-br from-accent-aqua/10 to-accent-aqua/20 rounded-2xl flex items-center justify-center">
                <QrCode size={40} className="text-accent-aqua" strokeWidth={2} />
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles size={16} className="text-accent-aqua" strokeWidth={2} />
                  <h3 className="font-display text-[18px] font-semibold text-text-primary">
                    Enable QR Code
                  </h3>
                </div>
                <p className="font-body text-[14px] text-text-secondary max-w-xs">
                  Generate a QR code for quick scanning and physical labeling
                </p>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={QrCode}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
