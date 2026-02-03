# 🛠️ Stowaway: Advanced Utility Suite

This suite focuses on reducing the manual overhead of inventory management through bulk actions and physical-to-digital synchronization.

---

## 1. Batch Item Creation - Camera Mode

*Designed for the initial "Deep Clean" or when unpacking a new shipment.*

* **Continuous Camera Mode**: A UI that keeps the camera shutter open. Tap to snap an item, type a quick name (optional), and the item is queued.
* **"Ghost" Mode**: For maximum speed, users can just take photos. The app creates "Unnamed Items" that appear in a "Needs Review" inbox on the dashboard, allowing the user to name/tag them later from the comfort of their couch.
* **Auto-Incrementing**: If adding containers, the tool can automatically name them (e.g., *Holiday Bin 01*, *Holiday Bin 02*) so the user only has to worry about the physical labels.


## 2. Batch Container Creation

*Designed for high-volume setup of new containers*

* **Template-Based Creation**: Select a **Place** (e.g., Garage) and quickly create containers through a simple sequence of taking all the container photos consecutively. User can add name after every photo(optional can do later). Once all photos are taken user can preview all the containers, seeing the photo with placeholder names and rename them manually, or replace photos if the photo is not good.
* **Integrated Label Queue**: Before the batch photos are started the user is asked if they want to print QR codes for the containers or not. If yes, as containers are batch-created, QR code are generated for each container. User can print the QR codes individually or in bulk (similar to Batch QR creation functionality). If no, users can manually create QR codes for each container later during the review process.

## 3. The "Stale Item" Auditor

*Designed to keep storage from becoming "Permaclutter."*

* **Interaction Tracking**: The app tracks the "Last Seen" date (the last time an item’s QR was scanned or its record was updated).
* **The "Dust" Filter**: A specialized tool that surfaces items not touched in 12+ months.
* **Action Shortcuts**: From the auditor list, users can quickly mark items as **Donate**, **Sell**, or **Toss**, triggering a "Removal" workflow that clears them from the active inventory.

---

### Technical Note: Offline Queueing

Since these tools are often used in low-connectivity areas like a basement or storage unit, all "Batch" actions should be queued via your **Service Worker** or **IndexedDB**. This ensures that the heavy lifting of uploading photos and syncing to Firestore happens automatically once you're back on your home Wi-Fi.
