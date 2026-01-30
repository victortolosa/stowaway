import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'

/**
 * Container Detail - View and manage items in a container
 * Shows:
 * - Container info (name, photo)
 * - Grid of items with photos
 * - Add item button
 * - QR code for the container
 */
export function Container() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const { containers, items, places } = useInventoryStore()

  if (!user || !id) {
    return <div>Loading...</div>
  }

  const container = containers.find((c) => c.id === id)
  const place = container ? places.find((p) => p.id === container.placeId) : null
  const containerItems = container ? items.filter((i) => i.containerId === container.id) : []

  if (!container) {
    return <div>Container not found</div>
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <span>{place?.name}</span>
        <span className="mx-2">/</span>
        <span className="font-medium">{container.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Container Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">{container.name}</h1>
            {container.photoUrl && (
              <img
                src={container.photoUrl}
                alt={container.name}
                className="w-full rounded mb-4"
              />
            )}
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2">
              Add Item
            </button>
            <button className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              Edit Container
            </button>
          </div>
        </div>

        {/* Items Grid */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Items ({containerItems.length})</h2>
          </div>

          {containerItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No items in this container yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {containerItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                  {item.photos[0] && (
                    <img
                      src={item.photos[0]}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold mb-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    )}
                    <div className="flex gap-2">
                      <button className="flex-1 text-blue-600 text-sm hover:underline">
                        View
                      </button>
                      <button className="flex-1 text-gray-600 text-sm hover:underline">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
