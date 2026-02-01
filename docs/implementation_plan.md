# Project Implementation Plan: "Stowaway"

**Personal Storage & Inventory Tracking Application**

## 1. Executive Summary

* **Goal:** Create a mobile-first application that solves the "Where did I put that?" problem for long-term storage (attics, basements, off-site units).
* **Core Hierarchy:** `Place (Location)` → `Container (Box/Bin)` → `Item (Object)`.
* **Key Differentiators:** Media-rich inventory (Voice, Photo) and offline capability.

---

## 2. UX & Product Design

### 2.1. User Personas

* **The Mover:** Recently moved, has 50+ boxes in a garage. Needs to find "Winter Coats" without opening every box.
* **The Collector:** Has specific items (comics, coins, gear) and needs to know exactly which bin contains a specific issue.
* **The Homeowner:** Uses the attic for seasonal decor. Needs to remember where the "Halloween Skeleton" was put last year.

### 2.2. Core User Flows

#### A. The "Stow" Flow (Input)

*Crucial for adoption. Must be fast.*

1. **Select Location:** User selects "Attic".
2. **Select/Create Container:** User scans a QR code on a box OR selects "Green Bin 1".
3. **Add Item:**
* **Quick Snap:** Take a photo of the item inside the box.
* **Voice Tag:** User holds a button and says, *"Grandma's vintage lamp, needs rewiring."* (App auto-transcribes this for search).


4. **Save:** Item is logged with timestamp.

#### B. The "Fetch" Flow (Retrieval)

1. **Search:** User types "Lamp" or "Grandma".
2. **Result:** App shows the item, the photo, and the breadcrumbs: **Attic > North Corner > Green Bin 1**.

### 2.3. Wireframe Concepts

* **Dashboard:** High-level view of "Places" with utilization stats (e.g., "Garage: 12 Containers"). Global Search bar at the top.
* **Container View:** A visual grid. Show a "Master Photo" of the open box with individual item tags overlaying it.
* **Item Detail:** Large Hero Image, Audio Player for the voice note, and a "Move Item" button.

---

## 3. Technical Design

### 3.1. Data Architecture (NoSQL Schema)

Using **Cloud Firestore** for a document-based structure.

| Collection | Key Fields |
| --- | --- |
| **places** | `id`, `name`, `type` (Home, Office, etc.) |
| **containers** | `id`, `place_id`, `name`, `qr_code_id`, `photo_url`, `last_accessed` |
| **items** | `id`, `container_id`, `name`, `description` (STT), `photos[]`, `voice_note_url`, `tags[]` |

### 3.2. Detailed Technology Stack

We will utilize a **Progressive Web App (PWA)** architecture for cross-platform compatibility and offline functionality.

#### Frontend Core

* **Framework:** React 18+ (via Vite)
* **Language:** TypeScript (Strict typing for data models)
* **Offline Engine:** `vite-plugin-pwa` (Workbox) using `StaleWhileRevalidate` strategy.
* **State Management:** Zustand (Lightweight for ephemeral state).
* **Routing:** React Router v6.

#### UI & Interaction Layer

* **Styling:** Tailwind CSS.
* **Components:** Shadcn/UI (Radix UI primitives).
* **Animations:** Framer Motion (Page transitions and "zoom" effects).
* **Form Handling:** React Hook Form + Zod.

#### Backend & Infrastructure

* **Platform:** Google Firebase.
* **Database:** Cloud Firestore with `enableIndexedDbPersistence()` enabled for the "Basement Problem."
* **File Storage:** Firebase Storage (Images and `.webm` audio).
* **Authentication:** Google Sign-In ONLY (SSO).
* **Serverless Logic:** Cloud Functions (Triggering Speech-to-Text on upload).

---

## 4. Specific Feature Implementation

### 1. Image Capture & Optimization ✅ COMPLETED (Sprint 3)

* ✅ **Capture:** Native `<input type="file" capture="environment" />` to use OS-native camera features.
* ✅ **Cropping:** `react-easy-crop` - Full cropping UI with zoom/rotate controls.
* ✅ **Compression:** `browser-image-compression` (Max size 1MB, 1920px width) to save bandwidth.
* ✅ **Cache Control:** 1-year browser caching for uploaded images.
* ✅ **Orphan Cleanup:** Automatic storage cleanup on failed database writes.

**Implementation Files:**
- `src/components/ImageCropper.tsx` - Cropping component
- `src/hooks/useImageCompression.ts` - Compression hook
- `src/services/firebaseService.ts` - Enhanced with cache control & cleanup
- `src/components/CreateItemModal.tsx` - Updated with full image pipeline
- `src/components/CreateContainerModal.tsx` - Updated with full image pipeline

**Status:** ✅ COMPLETE - Both item and container photos implemented

### 2. Audio Recording ⏳ PENDING (Sprint 4)

* **Library:** `react-media-recorder`.
* **Codec:** `audio/webm;codecs=opus`. Highly efficient; 30 seconds  100KB.

**Next Steps:**
- Create `AudioRecorder` component
- Create `AudioPlayer` component
- Integrate into `CreateItemModal`
- Update Item detail page for playback

### 3. QR Code System ⏳ PENDING (Sprint 5)

This feature enables QR code generation for container labels and printing to physical printers, plus scanning for quick container lookup.

#### 3.1 Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `jspdf` | ^4.0.0 | PDF generation for printable labels | ✅ Installed |
| `html5-qrcode` | ^2.3.8 | QR code scanning | ✅ Installed |
| `html2canvas` | ^1.4.1 | Render DOM to canvas for PDF embedding | ✅ Installed |
| `qrcode` | latest | Pure QR code generation (data URLs/canvas) | ❌ Need to install |

#### 3.2 QR Code ID Strategy

- Use the container's Firestore document `id` as the `qrCodeId`
- QR payload format: `stowaway://container/{containerId}`
- Enables deep linking when scanned
- The `Container` interface already has `qrCodeId?: string` field

#### 3.3 Components to Create

**A. `QRCodeGenerator.tsx`**

Generate QR code as canvas/data URL for a given container, display preview, and include container name and place as human-readable text below QR.

```typescript
interface QRCodeGeneratorProps {
  containerId: string
  containerName: string
  placeName: string
  size?: number // default 200px
  onGenerated?: (dataUrl: string) => void
}
```

**B. `PrintableLabelSheet.tsx`**

Render a printable sheet with QR labels. Support multiple formats:
- **Single Label:** One large label per page (4" x 6")
- **Sheet of Labels:** Multiple labels per page (e.g., Avery 5160 - 30 labels/sheet)

```typescript
interface PrintableLabelSheetProps {
  containers: Array<{ id: string; name: string; placeName: string }>
  format: 'single' | 'sheet-30' | 'sheet-10'
}
```

**Label Layout:**
```
┌─────────────────────────┐
│      [QR CODE]          │
│                         │
│   Container Name        │
│   Place Name            │
│   ─────────────────     │
│   stowaway              │
└─────────────────────────┘
```

**C. `QRLabelModal.tsx`**

Modal for generating and printing QR labels:
- Preview the QR label
- Select label format (single/sheet)
- "Print" button → sends to browser print dialog
- "Download PDF" button → saves as PDF file

**D. `QRScanner.tsx`**

- Use `html5-qrcode` for camera-based scanning
- Parse scanned URL and redirect to container page
- Handle invalid/unknown QR codes gracefully

#### 3.4 Printing Implementation

**Method 1: Browser Print API (Primary)**

```typescript
// src/utils/printLabel.ts
export async function printLabel(containerId: string): Promise<void> {
  // 1. Generate QR code as data URL
  const qrDataUrl = await generateQRCode(`stowaway://container/${containerId}`)

  // 2. Create print-optimized HTML
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <style>
          @media print {
            body { margin: 0; }
            .label { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <img src="${qrDataUrl}" />
          <p>${containerName}</p>
        </div>
      </body>
    </html>
  `)

  // 3. Trigger print dialog
  printWindow.print()
  printWindow.close()
}
```

**Pros:** Native OS printer selection, works with any connected printer, no additional setup.

**Method 2: PDF Generation with jsPDF (Secondary)**

```typescript
// src/utils/generateLabelPDF.ts
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export async function generateLabelPDF(
  containers: Container[],
  format: 'single' | 'sheet-30'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: format === 'single' ? [4, 6] : 'letter'
  })

  for (const container of containers) {
    const qrDataUrl = await QRCode.toDataURL(
      `stowaway://container/${container.id}`,
      { width: 200, margin: 1 }
    )
    doc.addImage(qrDataUrl, 'PNG', x, y, 1.5, 1.5)
    doc.text(container.name, x, y + 1.7)
  }

  return doc.output('blob')
}
```

**Pros:** User can save and print later, consistent output across devices, better for batch printing.

#### 3.5 Print Label Specifications

| Format | Dimensions | Use Case |
|--------|------------|----------|
| Single Large | 4" × 6" | Shipping labels, large bins |
| Avery 5160 | 1" × 2.625" | Standard address labels |
| Avery 5163 | 2" × 4" | Shipping labels |

**QR Code Size Guidelines:**
- Minimum: 1" × 1" for reliable scanning
- Recommended: 1.5" × 1.5" for easy mobile scanning
- Include 4-module quiet zone around QR

#### 3.6 Integration Points

1. **Container Detail Page** (`src/pages/Container.tsx`) - Add "Print QR Label" button
2. **Place Detail Page** (`src/pages/PlaceDetail.tsx`) - Add "Print All Labels" for batch printing
3. **Container Creation Flow** - Prompt "Would you like to print a QR label?"
4. **Dashboard** - Wire up existing "Scan QR" button to `/scan` route

#### 3.7 File Structure

```
src/
├── components/
│   ├── QRCodeGenerator.tsx      # QR code generation component
│   ├── QRLabelModal.tsx         # Print/download modal
│   ├── QRScanner.tsx            # Camera-based scanner
│   └── PrintableLabelSheet.tsx  # Printable label layout
├── utils/
│   ├── qrCode.ts                # QR generation helpers
│   └── printLabel.ts            # Print & PDF functions
└── pages/
    └── Scan.tsx                 # QR scanner page
```

#### 3.8 Implementation Tasks

| # | Task | Size |
|---|------|------|
| 1 | Install `qrcode` package | - |
| 2 | Create `src/utils/qrCode.ts` utility with generation function | S |
| 3 | Create `QRCodeGenerator.tsx` component | S |
| 4 | Create `src/utils/printLabel.ts` with browser print function | S |
| 5 | Create `src/utils/generateLabelPDF.ts` for PDF export | M |
| 6 | Create `QRLabelModal.tsx` with preview + actions | M |
| 7 | Add print button to Container page | S |
| 8 | Add batch print to PlaceDetail page | S |
| 9 | Add print prompt after container creation | S |
| 10 | Create `QRScanner.tsx` component | M |
| 11 | Create `/scan` route and `Scan.tsx` page | S |
| 12 | Wire up Dashboard "Scan QR" button | S |

#### 3.9 Testing Checklist

- [ ] QR code generates correctly for container ID
- [ ] QR code scans correctly with phone camera
- [ ] Browser print dialog opens with correct layout
- [ ] PDF generates with correct dimensions
- [ ] PDF downloads successfully
- [ ] Labels print correctly on standard printer paper
- [ ] QR code remains scannable after printing
- [ ] Scanner redirects to correct container page
- [ ] Scanner handles invalid QR codes gracefully

---

# Roadmap & Progress

## ✅ Epic 1: Foundation (COMPLETE)

* ✅ **Sprint 1:** Firebase setup, Google Auth, and "Places" dashboard. Enable offline persistence.
* ✅ **Sprint 2:** Container creation and Item logging. Implement image compression and breadcrumb navigation.

**Status:** All CRUD operations working. Dashboard, places, containers, and items fully functional.

---

## 🔄 Epic 2: The Sensory Layer (IN PROGRESS)

### ✅ Sprint 3: Image Optimization - COMPLETE

**Completed:**
- ImageCropper component with zoom/rotate
- useImageCompression hook with progress tracking  
- Firebase cache control headers (1-year caching)
- Orphan cleanup for failed uploads
- CreateItemModal updated with native camera support
- CreateContainerModal updated with native camera support

---

### ⏳ Sprint 4: Audio Recording - PENDING

**Next Steps:**
- Create AudioRecorder component using `react-media-recorder`
- Create AudioPlayer component
- Integrate voice notes into CreateItemModal
- Add playback to Item detail page

**Library to install:** `react-media-recorder`

---

### ⏳ Sprint 6: Production Stabilization - IN PROGRESS

**Goal:** Resolve production white screen issues and improve error resilience.

#### 1. Environment Variable Validation
Add a check in `src/lib/firebase.ts` to ensure all required VITE_ variables are present. If missing, throw a descriptive error or log a warning that persists even if console is dropped (e.g., using a global variable).

#### 2. Root Error Boundary
Implement a global `ErrorBoundary` component in `src/App.tsx` to catch initialization errors and display a helpful message instead of a blank white screen.

#### 3. Diagnostic Page (Optional/Secret)
Add a `/debug` route that shows the status of critical services (Firebase, Auth, Storage) without exposing actual keys.

#### 4. GitHub Secrets Verification
Inform the user that the following secrets MUST be defined in **GitHub Settings > Secrets and Variables > Actions**:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

---

### ⏳ Sprint 5: QR System - PENDING

## ⏳ Epic 3: Search & Launch (PENDING)

### Sprint 6: Enhanced Search

* **Fuzzy search:** Implement `fuse.js` for typo-tolerant search
* **Voice-to-Text:** (Optional) Cloud Functions for STT transcription
* **PWA:** Final manifest configuration and offline testing

**Library already installed:** `fuse.js`

---

## 🔴 CURRENT POSITION

**Last Completed:** Sprint 3 - Image Capture & Optimization (FULLY COMPLETE)  
**Pick Up Here:** Start Sprint 4 (Audio Recording) OR Sprint 5 (QR Codes) OR Sprint 6 (Search)

**Detailed plan available at:**  
`/Users/victortolosa/.gemini/antigravity/brain/70a56811-1e71-474c-bb5f-b8f98c32cd3d/implementation_plan.md`

