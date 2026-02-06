import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import { Place, PlaceRole, UserProfile } from '@/types'
import { addPlaceMember, removePlaceMember, updatePlaceMemberRole, getUserByEmail, getUserProfilesByIds, getPlaceOwnerId } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

interface SharePlaceModalProps {
  isOpen: boolean
  onClose: () => void
  place: Place
  onUpdated?: () => void
}

const ROLE_LABELS: Record<PlaceRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

export function SharePlaceModal({ isOpen, onClose, place, onUpdated }: SharePlaceModalProps) {
  const user = useAuthStore((state) => state.user)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PlaceRole>('viewer')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [memberRoles, setMemberRoles] = useState<Record<string, PlaceRole>>({})
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})

  const ownerId = useMemo(() => getPlaceOwnerId(place), [place])
  const isOwner = user?.uid === ownerId

  useEffect(() => {
    if (!isOpen) return
    const nextMemberIds = place.memberIds && place.memberIds.length > 0
      ? place.memberIds
      : [ownerId]
    const nextMemberRoles = {
      ...(place.memberRoles || {}),
      [ownerId]: 'owner' as PlaceRole,
    }
    setMemberIds(Array.from(new Set(nextMemberIds)))
    setMemberRoles(nextMemberRoles)
    setEmail('')
    setRole('viewer')
    setError(null)

    getUserProfilesByIds(nextMemberIds)
      .then((profilesList) => {
        const nextProfiles: Record<string, UserProfile> = {}
        profilesList.forEach((profile) => {
          nextProfiles[profile.uid] = profile
        })
        setProfiles(nextProfiles)
      })
      .catch((err) => {
        console.error('Failed to load member profiles:', err)
      })
  }, [isOpen, place, ownerId])

  const handleAddMember = async () => {
    if (!email.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const profile = await getUserByEmail(email)
      if (!profile) {
        setError('No user found with that email. They must sign in once first.')
        return
      }
      if (profile.uid === ownerId) {
        setError('Owner is already a member.')
        return
      }
      await addPlaceMember(place.id, profile.uid, role)
      const nextMemberIds = Array.from(new Set([...memberIds, profile.uid]))
      const nextMemberRoles = { ...memberRoles, [profile.uid]: role, [ownerId]: 'owner' as PlaceRole }
      setMemberIds(nextMemberIds)
      setMemberRoles(nextMemberRoles)
      setProfiles((prev) => ({ ...prev, [profile.uid]: profile }))
      setEmail('')
      setRole('viewer')
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = async (memberId: string, nextRole: PlaceRole) => {
    if (memberId === ownerId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await updatePlaceMemberRole(place.id, memberId, nextRole)
      setMemberRoles((prev) => ({ ...prev, [memberId]: nextRole, [ownerId]: 'owner' as PlaceRole }))
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === ownerId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await removePlaceMember(place.id, memberId)
      setMemberIds((prev) => prev.filter((id) => id !== memberId))
      setMemberRoles((prev) => {
        const next = { ...prev }
        delete next[memberId]
        next[ownerId] = 'owner' as PlaceRole
        return next
      })
      onUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Place"
      description={isOwner ? 'Invite people by email and assign roles.' : 'This place is shared with you.'}
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="font-body text-sm text-text-secondary">Invite by email</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isOwner || isSubmitting}
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as PlaceRole)}
              disabled={!isOwner || isSubmitting}
              className="md:w-40"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </Select>
            <Button
              variant="primary"
              onClick={handleAddMember}
              disabled={!isOwner || isSubmitting || !email.trim()}
              className="md:w-32"
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-body text-sm text-text-secondary">Members</div>
          <div className="space-y-2">
            {memberIds.map((memberId) => {
              const profile = profiles[memberId]
              const roleValue = memberRoles[memberId] || (memberId === ownerId ? 'owner' : 'viewer')
              const label = profile?.email || memberId
              const isMemberOwner = memberId === ownerId
              const isSelf = memberId === user?.uid

              return (
                <div
                  key={memberId}
                  className="flex flex-col gap-2 rounded-xl border border-border-light bg-bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-body text-sm text-text-primary">
                      {label} {isSelf ? '(you)' : ''}
                    </span>
                    <span className="font-body text-xs text-text-tertiary">
                      {ROLE_LABELS[roleValue]}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Select
                      value={roleValue}
                      onChange={(e) => handleRoleChange(memberId, e.target.value as PlaceRole)}
                      disabled={!isOwner || isMemberOwner || isSubmitting}
                      className="md:w-32"
                    >
                      {isMemberOwner ? (
                        <option value="owner">Owner</option>
                      ) : (
                        <>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </>
                      )}
                    </Select>
                    <Button
                      variant="secondary"
                      onClick={() => handleRemoveMember(memberId)}
                      disabled={!isOwner || isMemberOwner || isSubmitting}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )
            })}
            {memberIds.length === 0 && (
              <div className="text-sm text-text-tertiary">No members yet.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
