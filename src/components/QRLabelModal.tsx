import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { QRCodeDisplay } from '@/components/QRCodeDisplay'
import { Container, Place } from '@/types'
import { Download, Printer } from 'lucide-react'
import { generateQRCodeDataURL } from '@/utils/qrCode'
import jsPDF from 'jspdf'

interface QRLabelModalProps {
  isOpen: boolean
  onClose: () => void
  container: Container
  place: Place
}

export function QRLabelModal({
  isOpen,
  onClose,
  container,
  place
}: QRLabelModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPNG = async () => {
    setIsGenerating(true)
    try {
      const dataUrl = await generateQRCodeDataURL(container.id, { width: 400 })
      const link = document.createElement('a')
      link.download = `${container.name.replace(/\s+/g, '_')}_qr.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to download QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    try {
      const dataUrl = await generateQRCodeDataURL(container.id, { width: 300 })

      // Create 4"x6" label PDF (in mm: 101.6 x 152.4)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [101.6, 152.4],
      })

      // Add QR code (centered, 60mm x 60mm)
      const qrSize = 60
      const qrX = (101.6 - qrSize) / 2
      pdf.addImage(dataUrl, 'PNG', qrX, 20, qrSize, qrSize)

      // Add container name
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      const containerName = container.name.length > 25
        ? container.name.substring(0, 22) + '...'
        : container.name
      pdf.text(containerName, 101.6 / 2, 90, { align: 'center' })

      // Add place name
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100)
      pdf.text(place.name, 101.6 / 2, 100, { align: 'center' })

      // Add "Scan with Stowaway" footer
      pdf.setFontSize(10)
      pdf.setTextColor(150)
      pdf.text('Scan with Stowaway', 101.6 / 2, 140, { align: 'center' })

      pdf.save(`${container.name.replace(/\s+/g, '_')}_label.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code Label">
      <div className="flex flex-col items-center gap-6 py-4">
        {/* QR Code Preview */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
          <QRCodeDisplay containerId={container.id} size={180} />
        </div>

        {/* Container Info */}
        <div className="text-center">
          <h3 className="font-semibold text-lg">{container.name}</h3>
          <p className="text-sm text-zinc-500">{place.name}</p>
        </div>

        {/* Download Options */}
        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleDownloadPNG}
            disabled={isGenerating}
          >
            <Download className="w-4 h-4 mr-2" />
            PNG
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Label
          </Button>
        </div>
      </div>
    </Modal>
  )
}
