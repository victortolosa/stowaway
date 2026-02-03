# 🛠️ Stowaway: Advanced Utility Suite

This suite focuses on reducing the manual overhead of inventory management through bulk actions and physical-to-digital synchronization.

---

## 1. The "Rapid Fire" Batch Add

*Designed for the initial "Deep Clean" or when unpacking a new shipment.*

* **Continuous Camera Mode**: A UI that keeps the camera shutter open. Tap to snap an item, type a quick name (optional), and the item is queued.
* **"Ghost" Mode**: For maximum speed, users can just take photos. The app creates "Unnamed Items" that appear in a "Needs Review" inbox on the dashboard, allowing the user to name/tag them later from the comfort of their couch.
* **Auto-Incrementing**: If adding containers, the tool can automatically name them (e.g., *Holiday Bin 01*, *Holiday Bin 02*) so the user only has to worry about the physical labels.

## 2. The "Moving Day" Wizard

*Designed for high-volume setup of new storage supplies.*

* **Template-Based Creation**: Select a **Place** (e.g., Garage) and a container type. Enter a quantity, and the app generates the digital records instantly.
* **Integrated Label Queue**: As containers are batch-created, they are automatically added to a "Print Queue."
* **Batch PDF Generation**: Exports a single PDF optimized for standard label sheets (like Avery 5160) so you can label an entire shelf in one go.

## 3. The "Smart Mover" (Bulk Transfer)

*Designed for reorganizing spaces or seasonal rotations.*

* **Scan-to-Move**: Scan a "Source" QR code to open that container, multi-select items, then scan a "Destination" QR code to "beam" them to the new location.
* **Drag-and-Drop Hierarchy**: A specialized view for tablets/desktop that allows users to move entire containers between **Places** (e.g., moving "Box A" from "Garage" to "Attic") with a single gesture.

## 4. The "Stale Item" Auditor

*Designed to keep storage from becoming "Permaclutter."*

* **Interaction Tracking**: The app tracks the "Last Seen" date (the last time an item’s QR was scanned or its record was updated).
* **The "Dust" Filter**: A specialized tool that surfaces items not touched in 12+ months.
* **Action Shortcuts**: From the auditor list, users can quickly mark items as **Donate**, **Sell**, or **Toss**, triggering a "Removal" workflow that clears them from the active inventory.

---

### Implementation Priority Matrix

| Tool | Dev Effort | Impact on UX | Key Tech |
| --- | --- | --- | --- |
| **Rapid Fire** | Medium | High | Camera API / Local State Management |
| **Moving Day** | Low | Medium | PDF Kit / Batch DB Writes |
| **Smart Mover** | Medium | High | QR Scanner Integration |
| **Stale Auditor** | Low | Medium | Firestore Timestamps |

---

### Technical Note: Offline Queueing

Since these tools are often used in low-connectivity areas like a basement or storage unit, all "Batch" actions should be queued via your **Service Worker** or **IndexedDB**. This ensures that the heavy lifting of uploading photos and syncing to Firestore happens automatically once you're back on your home Wi-Fi.
