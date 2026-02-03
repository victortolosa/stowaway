# 📦 Stowaway

**The ultimate personal storage & inventory tracking companion.**

Stowaway is a mobile-first Progressive Web App (PWA) designed to solve the "Where did I put that?" problem. Whether it's seasonal decor in the attic, collectibles in the basement, or business inventory in a storage unit, Stowaway helps you organize, find, and manage your belongings with ease.

---

## ✨ Core Value Propositions

- **Never Lose Track Again**: A clear hierarchy of **Places → Containers → Items** ensures you know exactly where everything is.
- **Media-Rich Inventory**: Don't just list items; see them. Use photos and voice notes to document your belongings in seconds.
- **QR-Powered Efficiency**: Generate and print QR labels for your boxes. Scan a box to instantly see what's inside or add new items.
- **Built for the "Basement Problem"**: Fully offline-capable (PWA) and optimized for low-connectivity environments like attics or storage lockers.
- **Find it Instantly**: Advanced fuzzy search finds your items even if you don't remember the exact name.

---

## 🚀 Key Functionality

### 🏗️ Hierarchical Organization
Organize your world into **Places** (Home, Garage, Office), **Containers** (Boxes, Bins, Shelves), and **Items**. Group related items within containers for even better organization.

### 📸 Media Capture
- **Photo Documentation**: Take quick snaps of items or the contents of a box. Built-in cropping ensures your inventory looks clean.
- **Voice Notes**: Add context quickly. Record a voice note instead of typing long descriptions.

### 🏷️ Smart QR System
- **Dynamic Generation**: Every container gets a unique QR code automatically.
- **Label Printing**: Generate PDF labels (including batch printing on Avery 5160) directly from the app.
- **Instant Scan**: Use the built-in scanner to jump directly to a container's page or identify its contents.

### 🔍 Advanced Search
- **Fuzzy Matching**: Powered by Fuse.js, search through item names, descriptions, and tags.
- **Contextual Search**: Filter your search results based on your current location or container.

---

## 🛠️ Technical Stack

Stowaway is built with a modern, high-performance stack:

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict typing)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database**: [Google Firebase](https://firebase.google.com/) (Firestore & Storage)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Offline/PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) (Workbox)
- **Search Engine**: [Fuse.js](https://www.fusejs.io/)
- **UI Components**: [Lucide React](https://lucide.dev/) icons & Custom Design System

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18+)
- A Firebase project (for full functionality)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/stowaway.git
   cd stowaway
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
