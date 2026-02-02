import QRCode from 'qrcode'

export interface QRCodeOptions {
  width?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Generate QR code as data URL (PNG base64)
 */
export async function generateQRCodeDataURL(
  containerId: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const url = `${window.location.origin}/containers/${containerId}`

  return QRCode.toDataURL(url, {
    width: options.width ?? 200,
    margin: options.margin ?? 2,
    color: {
      dark: options.color?.dark ?? '#000000',
      light: options.color?.light ?? '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Generate QR code to canvas element
 */
export async function generateQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  containerId: string,
  options: QRCodeOptions = {}
): Promise<void> {
  const url = `${window.location.origin}/containers/${containerId}`

  await QRCode.toCanvas(canvas, url, {
    width: options.width ?? 200,
    margin: options.margin ?? 2,
    color: {
      dark: options.color?.dark ?? '#000000',
      light: options.color?.light ?? '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Parse container ID from scanned QR URL
 */
export function parseQRCodeURL(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/containers\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
