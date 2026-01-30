import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'

/**
 * Item Detail - View full item information and metadata
 * Shows:
 * - Item photos (carousel or grid)
 * - Voice notes (if any)
 * - Description and tags
 * - Breadcrumb navigation
 * - Move/Edit/Delete actions
 */
export function Item() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const { items, containers, places } = useInventoryStore()

  if (!user || !id) {
    return <div>Loading...</div>
  }

  const item = items.find((i) => i.id === id)
  const container = item ? containers.find((c) => c.id === item.containerId) : null
  const place = container ? places.find((p) => p.id === container.placeId) : null

  if (!item) {
    return <div>Item not found</div>
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <span>{place?.name}</span>
        <span className="mx-2">/</span>
        <span>{container?.name}</span>
        <span className="mx-2">/</span>
        <span className="font-medium">{item.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Section */}
        <div className="lg:col-span-1">
          {item.photos.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <img
                src={item.photos[0]}
                alt={item.name}
                className="w-full aspect-square object-cover"
              />
              {item.photos.length > 1 && (
                <div className="p-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    +{item.photos.length - 1} more photo{item.photos.length > 2 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {item.photos.slice(1).map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`${item.name} ${idx + 2}`}
                        className="w-full h-20 object-cover rounded cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-600">No photos</p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold mb-4">{item.name}</h1>
            {item.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            )}
          </div>

          {/* Voice Note Section */}
          {item.voiceNoteUrl && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Voice Note</h3>
              <audio controls className="w-full">
                <source src={item.voiceNoteUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Edit
            </button>
            <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              Move
            </button>
            <button className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
