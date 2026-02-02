# Sprint 5 & 6 Implementation Plan

## Overview

This document provides a detailed implementation plan for:
- **Sprint 5:** QR System
- **Sprint 6:** Enhanced Search, Voice-to-Text, PWA Finalization

---

## Sprint 5: QR System

### Goals
1. Generate QR codes for containers
2. Scan QR codes to navigate directly to containers
3. Print QR labels (single and batch)

---

### Task 5.1: Install QR Generation Package

**File:** `package.json`

```bash
npm install qrcode @types/qrcode
```

**Rationale:** `html5-qrcode` is for scanning only. We need `qrcode` package to generate QR codes as data URLs or canvas elements.

---

### Task 5.2: Create QR Code Generation Utility

**File:** `src/utils/qrCode.ts`

```typescript
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
  const url = `${window.location.origin}/container/${containerId}`

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
  const url = `${window.location.origin}/container/${containerId}`

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
    const match = parsed.pathname.match(/\/container\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
```

---

### Task 5.3: Create QR Code Display Component

**File:** `src/components/QRCodeDisplay.tsx`

```typescript
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
```

---

### Task 5.4: Create QR Scanner Component

**File:** `src/components/QRScanner.tsx`

```typescript
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
          variant="ghost"
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
```

---

### Task 5.5: Create QR Label Modal

**File:** `src/components/QRLabelModal.tsx`

```typescript
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
```

---

### Task 5.6: Add Batch Label Generation

**File:** `src/utils/qrLabelPdf.ts`

```typescript
import jsPDF from 'jspdf'
import { generateQRCodeDataURL } from './qrCode'
import { Container, Place } from '@/types'

interface LabelData {
  container: Container
  place: Place
}

/**
 * Generate Avery 5160 compatible label sheet (30 labels per page)
 * Label size: 1" x 2.625" (25.4mm x 66.7mm)
 * 3 columns, 10 rows
 */
export async function generateAvery5160Sheet(
  labels: LabelData[]
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9mm x 279.4mm
  })

  const labelWidth = 66.7
  const labelHeight = 25.4
  const marginLeft = 4.8
  const marginTop = 12.7
  const gapX = 3.2
  const gapY = 0

  const cols = 3
  const rows = 10
  const labelsPerPage = cols * rows

  for (let i = 0; i < labels.length; i++) {
    const pageIndex = Math.floor(i / labelsPerPage)
    const positionOnPage = i % labelsPerPage
    const col = positionOnPage % cols
    const row = Math.floor(positionOnPage / cols)

    // Add new page if needed
    if (positionOnPage === 0 && pageIndex > 0) {
      pdf.addPage()
    }

    const x = marginLeft + col * (labelWidth + gapX)
    const y = marginTop + row * (labelHeight + gapY)

    const { container, place } = labels[i]

    // Generate QR code
    const qrDataUrl = await generateQRCodeDataURL(container.id, { width: 150 })

    // Draw QR code (left side of label)
    const qrSize = 20
    pdf.addImage(qrDataUrl, 'PNG', x + 2, y + 2.7, qrSize, qrSize)

    // Draw container name (right side)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    const maxNameWidth = labelWidth - qrSize - 8
    const containerName = truncateText(container.name, 20)
    pdf.text(containerName, x + qrSize + 6, y + 10)

    // Draw place name
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100)
    const placeName = truncateText(place.name, 25)
    pdf.text(placeName, x + qrSize + 6, y + 16)
    pdf.setTextColor(0)
  }

  pdf.save('stowaway_labels.pdf')
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength
    ? text.substring(0, maxLength - 3) + '...'
    : text
}
```

---

### Task 5.7: Integrate QR Scanner into Dashboard

**File:** `src/pages/Dashboard.tsx`

**Changes:**
1. Add state for scanner visibility
2. Wire up "Scan QR" button
3. Handle scan result navigation

```typescript
// Add imports
import { QRScanner } from '@/components/QRScanner'
import { useNavigate } from 'react-router-dom'

// Add state
const [showScanner, setShowScanner] = useState(false)
const navigate = useNavigate()

// Add handler
const handleQRScan = (containerId: string) => {
  setShowScanner(false)
  navigate(`/container/${containerId}`)
}

// Update button (around line 81-82)
<Button onClick={() => setShowScanner(true)}>
  <QrCode className="w-4 h-4 mr-2" />
  Scan QR
</Button>

// Add scanner modal at end of component
{showScanner && (
  <QRScanner
    onScan={handleQRScan}
    onClose={() => setShowScanner(false)}
  />
)}
```

---

### Task 5.8: Add QR Button to Container Detail Page

**File:** `src/pages/ContainerDetail.tsx`

Add a "QR Code" button that opens `QRLabelModal` to view/download the label.

```typescript
// Add imports
import { QRLabelModal } from '@/components/QRLabelModal'
import { QrCode } from 'lucide-react'

// Add state
const [showQRModal, setShowQRModal] = useState(false)

// Add button in header actions
<Button variant="secondary" onClick={() => setShowQRModal(true)}>
  <QrCode className="w-4 h-4 mr-2" />
  QR Label
</Button>

// Add modal
{container && place && (
  <QRLabelModal
    isOpen={showQRModal}
    onClose={() => setShowQRModal(false)}
    container={container}
    place={place}
  />
)}
```

---

### Task 5.9: Update Firebase Service for QR Code ID

**File:** `src/services/firebaseService.ts`

Update `createContainer` to auto-generate qrCodeId:

```typescript
export async function createContainer(
  placeId: string,
  data: Omit<Container, 'id' | 'placeId' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'qrCodeId'>
): Promise<string> {
  const containerRef = doc(collection(db, 'containers'))
  const now = Timestamp.now()

  await setDoc(containerRef, {
    ...data,
    id: containerRef.id,
    placeId,
    qrCodeId: containerRef.id, // Use document ID as QR code ID
    lastAccessed: now,
    createdAt: now,
    updatedAt: now,
  })

  return containerRef.id
}
```

---

### Sprint 5 Testing Checklist

- [ ] QR code generates correctly with container URL
- [ ] QR scanner opens camera and detects codes
- [ ] Scanning navigates to correct container
- [ ] PNG download works
- [ ] PDF label generates correctly
- [ ] Batch label generation works for multiple containers
- [ ] Scanner handles permission denial gracefully
- [ ] Scanner handles no-camera devices gracefully
- [ ] QR codes work when printed and re-scanned

---

## Sprint 6: Enhanced Search

### Goals
1. Integrate fuzzy search with fuse.js
2. Optional: Voice-to-Text transcription
3. PWA finalization and offline testing

---

### Task 6.1: Integrate Fuzzy Search Hook

**File:** `src/pages/Search.tsx`

Replace basic string matching with the existing `useSearch` hook.

**Current code (lines 35-45):**
```typescript
// OLD - Basic filtering
const filteredItems = items.filter(item => {
  const query = searchQuery.toLowerCase()
  return (
    item.name.toLowerCase().includes(query) ||
    item.description?.toLowerCase().includes(query) ||
    item.tags.some(tag => tag.toLowerCase().includes(query))
  )
})
```

**New code:**
```typescript
import { useSearch } from '@/hooks/useSearch'

// In component:
const { results, search, isSearching } = useSearch()

// Replace filteredItems mapping with:
useEffect(() => {
  if (searchQuery.trim()) {
    search(searchQuery)
  }
}, [searchQuery, search])

// Use results instead of filteredItems
const displayResults = searchQuery.trim() ? results : []
```

**Full updated Search.tsx:**

```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/hooks/useSearch'
import { useInventoryStore } from '@/store/inventory'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search as SearchIcon, Package, MapPin, Loader2 } from 'lucide-react'

export default function Search() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { results, search, isSearching } = useSearch()
  const { places, containers } = useInventoryStore()

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        search(searchQuery)
      }
    }, 150) // Debounce for better UX

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, search])

  const getLocationBreadcrumb = (containerId: string): string => {
    const container = containers.find(c => c.id === containerId)
    if (!container) return ''
    const place = places.find(p => p.id === container.placeId)
    return place ? `${place.name} › ${container.name}` : container.name
  }

  const showResults = searchQuery.trim().length >= 2

  return (
    <div className="p-4 pb-24 max-w-md mx-auto md:max-w-5xl">
      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search items, tags, descriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-4"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 animate-spin" />
        )}
      </div>

      {/* Results */}
      {!showResults ? (
        <EmptyState
          icon={SearchIcon}
          title="Search your inventory"
          description="Type at least 2 characters to search across all items"
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No results found"
          description={`No items match "${searchQuery}"`}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          {results.map((result) => (
            <Card
              key={result.item.id}
              interactive
              onClick={() => navigate(`/item/${result.item.id}`)}
              className="flex items-center gap-4"
            >
              {result.item.photos[0] ? (
                <img
                  src={result.item.photos[0]}
                  alt={result.item.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{result.item.name}</h3>
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {getLocationBreadcrumb(result.item.containerId)}
                </p>
                {result.item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {result.item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Task 6.2: Enhance Search Hook with Loading State

**File:** `src/hooks/useSearch.ts`

Add loading state and debouncing:

```typescript
import { useState, useCallback, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useInventoryStore } from '@/store/inventory'
import { SearchResult } from '@/types'

export function useSearch() {
  const { items, containers, places } = useInventoryStore()
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Build searchable dataset with denormalized data
  const searchableItems = useMemo(() => {
    return items.map((item) => {
      const container = containers.find((c) => c.id === item.containerId)
      const place = container
        ? places.find((p) => p.id === container.placeId)
        : null

      return {
        item,
        container: container ?? null,
        place: place ?? null,
        // Flattened fields for fuse.js
        itemName: item.name,
        itemDescription: item.description ?? '',
        itemTags: item.tags.join(' '),
        containerName: container?.name ?? '',
        placeName: place?.name ?? '',
      }
    })
  }, [items, containers, places])

  // Configure fuse.js
  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: [
        { name: 'itemName', weight: 1.0 },
        { name: 'itemDescription', weight: 0.7 },
        { name: 'itemTags', weight: 0.8 },
        { name: 'containerName', weight: 0.5 },
        { name: 'placeName', weight: 0.3 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    })
  }, [searchableItems])

  const search = useCallback(
    (query: string) => {
      setIsSearching(true)

      if (!query.trim()) {
        setResults([])
        setIsSearching(false)
        return
      }

      const fuseResults = fuse.search(query, { limit: 20 })
      const searchResults: SearchResult[] = fuseResults
        .filter((r) => r.item.container && r.item.place)
        .map((r) => ({
          item: r.item.item,
          container: r.item.container!,
          place: r.item.place!,
        }))

      setResults(searchResults)
      setIsSearching(false)
    },
    [fuse]
  )

  return { results, search, isSearching }
}
```

---

### Task 6.3: Voice-to-Text (Optional)

This feature requires Firebase Cloud Functions for server-side speech recognition.

#### 6.3.1: Create Cloud Function

**File:** `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import speech from '@google-cloud/speech'

admin.initializeApp()

const speechClient = new speech.SpeechClient()

export const transcribeAudio = functions.https.onCall(
  async (data, context) => {
    // Verify authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      )
    }

    const { audioUrl } = data
    if (!audioUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'audioUrl is required'
      )
    }

    try {
      // Download audio from Firebase Storage
      const bucket = admin.storage().bucket()
      const file = bucket.file(audioUrl.replace(`gs://${bucket.name}/`, ''))
      const [audioBuffer] = await file.download()

      // Transcribe
      const [response] = await speechClient.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          model: 'default',
          enableAutomaticPunctuation: true,
        },
      })

      const transcription = response.results
        ?.map((r) => r.alternatives?.[0]?.transcript)
        .filter(Boolean)
        .join(' ')

      return { transcription: transcription || '' }
    } catch (error) {
      console.error('Transcription error:', error)
      throw new functions.https.HttpsError(
        'internal',
        'Failed to transcribe audio'
      )
    }
  }
)
```

#### 6.3.2: Create Client Hook

**File:** `src/hooks/useVoiceToText.ts`

```typescript
import { useState, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface TranscriptionResult {
  transcription: string
}

export function useVoiceToText() {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribe = useCallback(async (audioUrl: string): Promise<string> => {
    setIsTranscribing(true)
    setError(null)

    try {
      const functions = getFunctions()
      const transcribeAudio = httpsCallable<
        { audioUrl: string },
        TranscriptionResult
      >(functions, 'transcribeAudio')

      const result = await transcribeAudio({ audioUrl })
      return result.data.transcription
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      setError(message)
      throw err
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  return { transcribe, isTranscribing, error }
}
```

#### 6.3.3: Integration Point

Add transcription button to item detail or search page that:
1. Uploads voice recording
2. Calls transcribeAudio function
3. Populates search query with result

---

### Task 6.4: PWA Finalization

#### 6.4.1: Update Manifest for iOS

**File:** `vite.config.ts`

Add iOS-specific manifest options:

```typescript
VitePWA({
  registerType: 'prompt',
  includeAssets: [
    'favicon.ico',
    'apple-touch-icon.png',
    'masked-icon.svg',
  ],
  manifest: {
    name: 'Stowaway',
    short_name: 'Stowaway',
    description: 'Personal Storage & Inventory Tracking Application',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    orientation: 'portrait',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  // ... workbox config
})
```

#### 6.4.2: Add Apple Meta Tags

**File:** `index.html`

```html
<head>
  <!-- Existing tags... -->

  <!-- iOS PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Stowaway" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- Splash screens (optional but recommended) -->
  <link rel="apple-touch-startup-image" href="/splash-640x1136.png"
        media="(device-width: 320px) and (device-height: 568px)" />
  <link rel="apple-touch-startup-image" href="/splash-750x1334.png"
        media="(device-width: 375px) and (device-height: 667px)" />
  <link rel="apple-touch-startup-image" href="/splash-1242x2208.png"
        media="(device-width: 414px) and (device-height: 736px)" />
</head>
```

#### 6.4.3: Enhance Offline Data Caching

**File:** `vite.config.ts`

Update workbox config for better offline support:

```typescript
workbox: {
  // Cache app shell
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

  runtimeCaching: [
    // Firebase Storage (images, audio)
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-storage-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Firestore API
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firestore-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    // Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  ],
}
```

#### 6.4.4: Add Offline Indicator Component

**File:** `src/components/OfflineIndicator.tsx`

```typescript
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      You're offline. Some features may be unavailable.
    </div>
  )
}
```

Add to `App.tsx`:
```typescript
import { OfflineIndicator } from '@/components/OfflineIndicator'

// In JSX:
<OfflineIndicator />
```

---

### Sprint 6 Testing Checklist

**Fuzzy Search:**
- [ ] Search finds items with typos (e.g., "scrwdriver" → "Screwdriver")
- [ ] Search matches partial words
- [ ] Search ranks by relevance (name matches higher than description)
- [ ] Search across container/place names works
- [ ] Performance acceptable with 500+ items
- [ ] Debouncing prevents excessive searches

**Voice-to-Text (if implemented):**
- [ ] Cloud Function deploys successfully
- [ ] Transcription returns accurate text
- [ ] Error handling for failed transcriptions
- [ ] Loading states during transcription

**PWA:**
- [ ] App installs on iOS Safari
- [ ] App installs on Android Chrome
- [ ] Splash screen displays on iOS
- [ ] App works offline (cached data visible)
- [ ] Offline indicator shows when disconnected
- [ ] New version prompt appears after update
- [ ] Images load from cache when offline
- [ ] Service worker updates correctly

---

## File Summary

### Sprint 5 New Files
| File | Purpose |
|------|---------|
| `src/utils/qrCode.ts` | QR generation utilities |
| `src/utils/qrLabelPdf.ts` | Batch PDF label generation |
| `src/components/QRCodeDisplay.tsx` | QR code image component |
| `src/components/QRScanner.tsx` | Camera scanning component |
| `src/components/QRLabelModal.tsx` | Label preview/download modal |

### Sprint 5 Modified Files
| File | Changes |
|------|---------|
| `package.json` | Add `qrcode` package |
| `src/pages/Dashboard.tsx` | Wire up Scan QR button |
| `src/pages/ContainerDetail.tsx` | Add QR Label button |
| `src/services/firebaseService.ts` | Auto-set qrCodeId |

### Sprint 6 New Files
| File | Purpose |
|------|---------|
| `src/components/OfflineIndicator.tsx` | Offline status banner |
| `src/hooks/useVoiceToText.ts` | STT client hook (optional) |
| `functions/src/index.ts` | Cloud Function for STT (optional) |

### Sprint 6 Modified Files
| File | Changes |
|------|---------|
| `src/pages/Search.tsx` | Integrate fuzzy search |
| `src/hooks/useSearch.ts` | Add loading state |
| `vite.config.ts` | Enhance PWA config |
| `index.html` | iOS PWA meta tags |
| `src/App.tsx` | Add OfflineIndicator |

---

## Estimated Effort

| Task | Complexity |
|------|------------|
| **Sprint 5** | |
| QR Generation Utility | Low |
| QR Display Component | Low |
| QR Scanner Component | Medium |
| QR Label Modal | Medium |
| Batch PDF Generation | Medium |
| Dashboard Integration | Low |
| Container Detail Integration | Low |
| **Sprint 6** | |
| Fuzzy Search Integration | Low |
| Search Hook Enhancement | Low |
| Voice-to-Text Cloud Function | High |
| Voice-to-Text Client | Medium |
| PWA Manifest Updates | Low |
| Offline Indicator | Low |
| Workbox Configuration | Medium |
| iOS Meta Tags | Low |

---

## Dependencies

**Sprint 5 requires:**
```bash
npm install qrcode @types/qrcode
```

**Sprint 6 Voice-to-Text requires (optional):**
```bash
# In functions directory
npm install @google-cloud/speech firebase-functions firebase-admin
```

**Enable Google Cloud Speech API** in Firebase Console if using Voice-to-Text.
