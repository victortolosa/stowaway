# Source Code Structure

## Directory Organization

```
src/
├── components/         # Reusable UI components
│   ├── Button.tsx     # Example: Button component
│   ├── Card.tsx       # Example: Card component
│   └── index.ts       # Barrel export file
│
├── pages/             # Page components for routes
│   ├── Dashboard.tsx  # Main dashboard view
│   ├── Places.tsx     # Places management
│   ├── Container.tsx  # Container detail view
│   ├── Item.tsx       # Item detail view
│   └── index.ts       # Barrel export file
│
├── hooks/             # Custom React hooks
│   ├── useInventory.ts    # Load inventory data
│   ├── useSearch.ts       # Fuzzy search hook
│   └── index.ts           # Barrel export file
│
├── services/          # API and Firebase operations
│   ├── firebaseService.ts # All Firebase CRUD operations
│   └── index.ts           # Barrel export file
│
├── store/             # Zustand state management
│   ├── auth.ts        # Authentication state
│   └── inventory.ts   # Inventory state (places, containers, items)
│
├── types/             # TypeScript type definitions
│   └── index.ts       # Place, Container, Item, SearchResult interfaces
│
├── lib/               # Utilities and configuration
│   └── firebase.ts    # Firebase initialization
│
├── styles/            # Global styles
│   └── globals.css    # Tailwind CSS imports and global styles
│
├── App.tsx            # Root application component
└── main.tsx           # Application entry point
```

## Data Flow

### State Management
```
useAuthStore (auth.ts)
  ├── user (firebase user)
  └── loading state

useInventoryStore (inventory.ts)
  ├── places[]
  ├── containers[]
  ├── items[]
  └── selection state (selectedPlace, selectedContainer)
```

### Firebase Service Layer
All database and storage operations go through `services/firebaseService.ts`:
- Place CRUD: `createPlace`, `getUserPlaces`, `updatePlace`, `deletePlace`
- Container CRUD: `createContainer`, `getPlaceContainers`, `updateContainer`, `deleteContainer`
- Item CRUD: `createItem`, `getContainerItems`, `updateItem`, `deleteItem`
- Storage: `uploadImage`, `uploadAudio`, `deleteStorageFile`

### Custom Hooks
- `useInventory()` - Automatically loads all inventory data for the logged-in user
- `useSearch(query)` - Provides fuzzy search across items, containers, and places

## Page Structure

Each page follows a pattern:
1. Gets data from Zustand stores
2. Renders UI with that data
3. Provides buttons/actions that trigger service layer calls
4. Stores update automatically through hooks

### Dashboard
- Stats overview (places, containers, items count)
- List of user's places
- Entry point for the app

### Places
- Grid/list of all places
- Create new place button
- Edit/delete actions (to be implemented)

### Container
- Breadcrumb navigation (Place > Container)
- Container info sidebar
- Grid of items in the container
- Add item button

### Item
- Breadcrumb navigation (Place > Container > Item)
- Full item details with photos
- Voice note player
- Tags display
- Edit/Move/Delete actions

## Next Steps

1. **Create UI Components** (`components/`)
   - Button, Card, SearchBar, ImageUpload, AudioRecorder, etc.

2. **Implement Forms** (using react-hook-form + Zod)
   - Create Place form
   - Create Container form
   - Create Item form

3. **Add Media Features** (Sprint 2-4)
   - Image capture & compression
   - QR code scanning & generation
   - Audio recording

4. **Implement Search** (Sprint 5)
   - Search UI component
   - Integrate with `useSearch` hook

5. **Add PWA Features**
   - Manifest configuration
   - Offline persistence

## Imports

Use barrel exports for cleaner imports:

```typescript
// Instead of:
import { Dashboard } from '../pages/Dashboard'

// Use:
import { Dashboard } from '@/pages'

// Or individual:
import { useInventory, useSearch } from '@/hooks'
import { createPlace, getUserPlaces } from '@/services'
```

## Development Tips

- Always load inventory with `useInventory()` hook when you need the data
- Use the Firebase service layer for all database operations
- Keep components pure - they should receive data via props or hooks
- Types are defined in `@/types` - import them as needed
- Use `@/` path alias for imports (configured in tsconfig.json and vite.config.ts)
