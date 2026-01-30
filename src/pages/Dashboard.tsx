import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'

/**
 * Dashboard - Overview of all places and recent activity
 * Shows:
 * - Quick stats (total places, containers, items)
 * - List of places with container counts
 * - Global search
 * - Quick actions (add place, add item)
 */
export function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, items } = useInventory()

  if (!user) {
    return <div>Please log in</div>
  }

  const totalContainers = containers.length
  const totalItems = items.length

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Places</h3>
          <p className="text-3xl font-bold mt-2">{places.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Containers</h3>
          <p className="text-3xl font-bold mt-2">{totalContainers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Items</h3>
          <p className="text-3xl font-bold mt-2">{totalItems}</p>
        </div>
      </div>

      {/* Places List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Your Places</h2>
        {places.length === 0 ? (
          <p className="text-gray-500">No places yet. Create one to get started!</p>
        ) : (
          <div className="space-y-2">
            {places.map((place) => (
              <div key={place.id} className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">{place.name}</h3>
                <p className="text-sm text-gray-600">
                  {containers.filter((c) => c.placeId === place.id).length} containers
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
