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

### 1. Image Capture & Optimization

* **Capture:** Native `<input type="file" capture="environment" />` to use OS-native camera features.
* **Cropping:** `react-easy-crop`.
* **Compression:** `browser-image-compression` (Max size 1MB, 1920px width) to save bandwidth.

### 2. Audio Recording

* **Library:** `react-media-recorder`.
* **Codec:** `audio/webm;codecs=opus`. Highly efficient; 30 seconds  100KB.

### 3. QR Scanning

* **Library:** `react-qr-reader`. Used for instant container redirection.

---

