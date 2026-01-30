import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'

/**
 * Places - Management view for all storage locations
 * Shows:
 * - List of all places
 * - Create new place
 * - Edit/delete places
 * - Quick access to containers in each place
 */
export function Places() {
  const user = useAuthStore((state) => state.user)
  const { places, containers } = useInventory()

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Places</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Add Place
        </button>
      </div>

      {places.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">No places yet</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Create Your First Place
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => {
            const placeContainers = containers.filter((c) => c.placeId === place.id)
            return (
              <div key={place.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-2">{place.name}</h3>
                <p className="text-sm text-gray-600 mb-4">Type: {place.type}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {placeContainers.length} container{placeContainers.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm">
                    View
                  </button>
                  <button className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm">
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
