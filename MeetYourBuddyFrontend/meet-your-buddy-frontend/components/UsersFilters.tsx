'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Snackbar } from '@mui/material'

type FilterOption = {
  id?: number
  value?: string
  name?: string
  label?: string
  text?: string
  distance?: number
  city?: string
  fieldValue?: string
  fieldName?: string
}

type MatchUser = {
  id?: number
  userId?: number
  firstName?: string
  lastName?: string
  fullName?: string
  city?: string
  state?: string
  country?: string
  bio?: string
  gender?: string
  age?: number
  distance?: number
  distanceText?: string
  profileImageUrl?: string
  categoryName?: string
}

type FullProfile = {
  userId?: number
  firstName?: string
  lastName?: string
  fullName?: string
  gender?: string
  dateOfBirth?: string
  city?: string
  state?: string
  country?: string
  bio?: string
  profileImage?: string
  latitude?: number
  longitude?: number
  isActive?: boolean
  createdDate?: string
}

type CategorySearchFilter = {
  fieldName: string
  fieldValue: string
}

type CategorySearchRequest = {
  userId: number
  catergoriesId: number[]
  search: string | null
  filters: CategorySearchFilter[]
  pageNumber: number
  pageSize: number
}

type ToastState = {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
}

const PROFILE_API = process.env.NEXT_PUBLIC_PROFILE_API_BASE_URL || 'https://localhost:7235'

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return ''

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || ''
  }

  return ''
}

function getToken() {
  if (typeof window === 'undefined') return ''

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    getCookieValue('token') ||
    getCookieValue('accessToken') ||
    getCookieValue('authToken') ||
    ''
  )
}

function getUserIdFromToken() {
  const token = getToken()

  if (!token) return 0

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))

    return Number(
      payload.sub ||
        payload.userId ||
        payload.UserId ||
        payload.nameid ||
        payload[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ] ||
        0
    )
  } catch {
    return 0
  }
}

function authHeaders(): HeadersInit {
  const token = getToken()

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function safeJson(response: Response) {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractArray(result: any): MatchUser[] {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.result)) return result.result
  if (Array.isArray(result?.users)) return result.users
  if (Array.isArray(result?.items)) return result.items
  if (Array.isArray(result?.data?.data)) return result.data.data
  if (Array.isArray(result?.data?.users)) return result.data.users
  if (Array.isArray(result?.data?.items)) return result.data.items

  return []
}

function extractFilterArray(result: any): FilterOption[] {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.result)) return result.result
  if (Array.isArray(result?.filters)) return result.filters
  if (Array.isArray(result?.items)) return result.items
  if (Array.isArray(result?.data?.data)) return result.data.data
  if (Array.isArray(result?.data?.filters)) return result.data.filters
  if (Array.isArray(result?.data?.items)) return result.data.items

  return []
}

function getUserName(user: MatchUser | FullProfile) {
  if (user.fullName) return user.fullName

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim()

  return name || 'Buddy User'
}

function getUserLocation(user: MatchUser | FullProfile) {
  return [user.city, user.state, user.country].filter(Boolean).join(', ') || 'Location not added'
}

function getInitial(user: MatchUser | FullProfile) {
  return getUserName(user).charAt(0).toUpperCase()
}

function calcAge(dateOfBirth?: string) {
  if (!dateOfBirth) return null

  const dob = new Date(dateOfBirth)
  const today = new Date()

  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }

  return age > 0 && age < 120 ? age : null
}

function getOptionValue(item: FilterOption) {
  return String(
    item.fieldValue ||
      item.value ||
      item.city ||
      item.name ||
      item.label ||
      item.text ||
      item.distance ||
      item.id ||
      ''
  )
}

function getOptionLabel(item: FilterOption) {
  const value =
    item.fieldValue ||
    item.label ||
    item.city ||
    item.name ||
    item.text ||
    item.value ||
    item.distance ||
    item.id ||
    ''

  if (item.distance && !String(value).toLowerCase().includes('km')) {
    return `${value} km`
  }

  return String(value)
}

function avatarColor(user: MatchUser | FullProfile) {
  const code = getUserName(user).charCodeAt(0) || 1
  const gradients = [
    'linear-gradient(135deg, #6366f1, #ec4899)',
    'linear-gradient(135deg, #06b6d4, #3b82f6)',
    'linear-gradient(135deg, #22c55e, #14b8a6)',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #8b5cf6, #06b6d4)',
  ]

  return gradients[code % gradients.length]
}

function UserAvatar({
  user,
  size = 46,
}: {
  user: MatchUser | FullProfile
  size?: number
}) {
  const [imageError, setImageError] = useState(false)
  const src = (user as MatchUser).profileImageUrl || (user as FullProfile).profileImage

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={getUserName(user)}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '18px',
          objectFit: 'cover',
          flexShrink: 0,
          border: '3px solid #ffffff',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15)',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '18px',
        background: avatarColor(user),
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: size * 0.42,
        flexShrink: 0,
        border: '3px solid #ffffff',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15)',
      }}
    >
      {getInitial(user)}
    </div>
  )
}

function ProfileModal({
  userId,
  onClose,
}: {
  userId: number
  onClose: () => void
}) {
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${PROFILE_API}/api/profile/me/${userId}`, {
          headers: authHeaders(),
        })

        const result = await safeJson(response)
        const data = result?.data ?? result?.profile ?? result

        if (!response.ok || !data) {
          throw new Error(result?.message || 'Failed to load profile.')
        }

        setProfile(data)
      } catch (err: any) {
        setError(err?.message || 'Could not load profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  const age = profile ? calcAge(profile.dateOfBirth) : null

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="profile-modal">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {loading ? (
          <div className="modal-state">
            <div className="loader" />
            <p>Loading profile...</p>
          </div>
        ) : error ? (
          <div className="modal-state">
            <div className="state-icon">⚠️</div>
            <h3>Profile not loaded</h3>
            <p>{error}</p>
          </div>
        ) : profile ? (
          <>
            <div className="profile-banner" />

            <div className="profile-content">
              <div className="profile-avatar-wrap">
                <UserAvatar user={profile} size={92} />
              </div>

              <h2>{getUserName(profile)}</h2>
              <p className="profile-location">📍 {getUserLocation(profile)}</p>

              <div className="profile-tags">
                {profile.gender && <span>{profile.gender}</span>}
                {age && <span>{age} years old</span>}
                {profile.isActive && <span className="green-tag">● Active</span>}
              </div>

              <div className="profile-section">
                <label>About</label>
                <p>{profile.bio || 'No bio added yet.'}</p>
              </div>

              {profile.createdDate && (
                <div className="joined-text">
                  Joined {new Date(profile.createdDate).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function FilterPanel({
  cityOptions,
  distanceOptions,
  loadingCity,
  loadingDistance,
  selectedCity,
  selectedDistance,
  onFetchCity,
  onFetchDistance,
  onApply,
  onClear,
}: {
  cityOptions: FilterOption[]
  distanceOptions: FilterOption[]
  loadingCity: boolean
  loadingDistance: boolean
  selectedCity: string
  selectedDistance: string
  onFetchCity: () => void
  onFetchDistance: () => void
  onApply: (city: string, distance: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draftCity, setDraftCity] = useState(selectedCity)
  const [draftDistance, setDraftDistance] = useState(selectedDistance)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeCount = [selectedCity, selectedDistance].filter(Boolean).length

  return (
    <div className="filter-wrapper" ref={ref}>
      <button
        className={`filter-main-btn ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
      >
        <span>🎯</span>
        Filters
        {activeCount > 0 && <b>{activeCount}</b>}
      </button>

      {open && (
        <div className="filter-popover">
          <div className="filter-title">
            <strong>Refine Results</strong>
            <small>Choose city or distance</small>
          </div>

          <div className="filter-field">
            <label>City</label>
            <select
              value={draftCity}
              onFocus={onFetchCity}
              onChange={e => setDraftCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {loadingCity ? (
                <option>Loading...</option>
              ) : (
                cityOptions.map((item, index) => {
                  const value = getOptionValue(item)

                  return (
                    <option key={`${value}-${index}`} value={value}>
                      {getOptionLabel(item)}
                    </option>
                  )
                })
              )}
            </select>
          </div>

          <div className="filter-field">
            <label>Distance</label>
            <select
              value={draftDistance}
              onFocus={onFetchDistance}
              onChange={e => setDraftDistance(e.target.value)}
            >
              <option value="">Any Distance</option>
              {loadingDistance ? (
                <option>Loading...</option>
              ) : (
                distanceOptions.map((item, index) => {
                  const value = getOptionValue(item)

                  return (
                    <option key={`${value}-${index}`} value={value}>
                      {getOptionLabel(item)}
                    </option>
                  )
                })
              )}
            </select>
          </div>

          <div className="filter-actions">
            <button
              className="clear-filter-btn"
              onClick={() => {
                setDraftCity('')
                setDraftDistance('')
                onClear()
                setOpen(false)
              }}
            >
              Clear
            </button>

            <button
              className="apply-filter-btn"
              onClick={() => {
                onApply(draftCity, draftDistance)
                setOpen(false)
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserRow({
  user,
  index,
  onSend,
  onViewProfile,
  sent,
  sending,
}: {
  user: MatchUser
  index: number
  onSend: (user: MatchUser) => void
  onViewProfile: (userId: number) => void
  sent: boolean
  sending: boolean
}) {
  const userId = Number(user.userId || user.id || 0)

  return (
    <div className="user-row">
      <div className="col-index">{String(index + 1).padStart(2, '0')}</div>

      <div className="col-user">
        <UserAvatar user={user} />

        <div className="user-main">
          <h3>{getUserName(user)}</h3>
          <p>📍 {getUserLocation(user)}</p>
        </div>
      </div>

      <div className="col-tags">
        {user.categoryName && <span className="tag purple">{user.categoryName}</span>}
        {user.gender && <span className="tag pink">{user.gender}</span>}
        {user.age && <span className="tag blue">{user.age} yrs</span>}
        {(user.distanceText || user.distance) && (
          <span className="tag green">
            {user.distanceText || `${Number(user.distance || 0)} km`}
          </span>
        )}
      </div>

      <div className="col-actions">
        <button className="profile-btn" onClick={() => onViewProfile(userId)}>
          View Profile
        </button>

        {sent ? (
          <button className="sent-btn" disabled>
            ✓ Sent
          </button>
        ) : (
          <button className="send-btn" disabled={sending} onClick={() => onSend(user)}>
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function UsersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState<MatchUser[]>([])
  const [cityOptions, setCityOptions] = useState<FilterOption[]>([])
  const [distanceOptions, setDistanceOptions] = useState<FilterOption[]>([])

  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistance, setSelectedDistance] = useState('')

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingCity, setLoadingCity] = useState(false)
  const [loadingDistance, setLoadingDistance] = useState(false)

  const [sentIds, setSentIds] = useState<Set<number>>(new Set())
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [profileModalUserId, setProfileModalUserId] = useState<number | null>(null)

  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
  })

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7111'
  const matchingApiBaseUrl =
    process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL || 'https://localhost:7169'

  const categoryIds = useMemo(() => {
    const raw = searchParams.get('categoryIds') || ''

    return raw
      .split(',')
      .map(x => Number(x.trim()))
      .filter(x => !Number.isNaN(x) && x > 0)
  }, [searchParams])

  const activeFilters = [selectedCity, selectedDistance].filter(Boolean)

  function showToast(message: string, severity: ToastState['severity'] = 'success') {
    setToast({
      open: true,
      message,
      severity,
    })
  }

  function handleUnauthorized() {
    if (typeof window !== 'undefined') {
      ;['token', 'accessToken', 'authToken'].forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
    }

    router.push('/login')
  }

  async function fetchUsers(city = selectedCity, distance = selectedDistance) {
    if (categoryIds.length === 0) {
      setUsers([])
      setError('No category selected.')
      return
    }

    const token = getToken()
    if (!token) {
      handleUnauthorized()
      return
    }

    const currentUserId = getUserIdFromToken()
    if (!currentUserId) {
      handleUnauthorized()
      return
    }

    try {
      setLoadingUsers(true)
      setError('')

      const filters: CategorySearchFilter[] = []

      if (city) {
        filters.push({
          fieldName: 'city',
          fieldValue: city,
        })
      }

      if (distance) {
        filters.push({
          fieldName: 'distance',
          fieldValue: distance,
        })
      }

      const body: CategorySearchRequest = {
        userId: currentUserId,
        catergoriesId: categoryIds,
        search: null,
        filters,
        pageNumber: 1,
        pageSize: 20,
      }

      const response = await fetch(`${apiBaseUrl}/api/discovery/category-search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      const result = await safeJson(response)

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to load users.')
      }

      const responseUsers = extractArray(result)

      const uniqueUsers = Array.from(
        new Map(
          responseUsers.map(user => [
            user.userId || user.id || `${user.firstName}-${user.lastName}`,
            user,
          ])
        ).values()
      )

      setUsers(uniqueUsers)
    } catch (err: any) {
      setUsers([])
      setError(err?.message || 'Something went wrong while loading users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  async function fetchFilter(name: 'city' | 'distance') {
    const token = getToken()

    if (!token) {
      handleUnauthorized()
      return
    }

    if (name === 'city' && cityOptions.length > 0) return
    if (name === 'distance' && distanceOptions.length > 0) return

    try {
      if (name === 'city') setLoadingCity(true)
      if (name === 'distance') setLoadingDistance(true)

      const response = await fetch(
        `${apiBaseUrl}/api/discovery/filter?filterName=${name}`,
        {
          headers: authHeaders(),
        }
      )

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      const result = await safeJson(response)
      const options = extractFilterArray(result)

      if (name === 'city') {
        setCityOptions(options)
      } else {
        setDistanceOptions(options)
      }
    } catch {
      if (name === 'city') setCityOptions([])
      if (name === 'distance') setDistanceOptions([])
    } finally {
      if (name === 'city') setLoadingCity(false)
      if (name === 'distance') setLoadingDistance(false)
    }
  }

  async function handleSendRequest(user: MatchUser) {
    const targetUserId = Number(user.userId || user.id || 0)

    if (!targetUserId) {
      showToast('Invalid user selected.', 'error')
      return
    }

    const token = getToken()

    if (!token) {
      handleUnauthorized()
      return
    }

    try {
      setSendingId(targetUserId)

      const response = await fetch(`${matchingApiBaseUrl}/api/matching/request`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          targetUserId,
        }),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      const result = await safeJson(response)

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to send request.')
      }

      setSentIds(prev => new Set(prev).add(targetUserId))
      showToast(result?.message || `Request sent to ${getUserName(user)} 🎉`, 'success')
    } catch (err: any) {
      showToast(err?.message || 'Something went wrong while sending request.', 'error')
    } finally {
      setSendingId(null)
    }
  }

  useEffect(() => {
    fetchUsers('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIds.join(',')])

  return (
    <>
      <style>{pageStyles}</style>

      <main className="page-root">
        <section className="hero">
          <div className="hero-bg-one" />
          <div className="hero-bg-two" />

          <div className="hero-content">
            <div>
              <div className="eyebrow">MeetYourBuddy · Discovery</div>

              <h1>
                Find your <span>perfect buddy</span>
              </h1>

              <p>
                Explore people based on your selected categories, filter them by city
                or distance, and send a request instantly.
              </p>

              <div className="hero-pills">
                <span>⚡ Smart Matching</span>
                <span>🎯 Category Based</span>
                <span>💬 Easy Connect</span>
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-count">{users.length}</div>
              <div className="hero-label">Matches Found</div>
              <div className="hero-mini">
                {activeFilters.length > 0 ? activeFilters.join(' + ') : 'All results'}
              </div>
            </div>
          </div>
        </section>

        <section className="content-shell">
          <div className="toolbar">
            <div>
              <h2>Buddy Results</h2>
              <p>
                {users.length} {users.length === 1 ? 'person' : 'people'} available
                {activeFilters.length > 0 && (
                  <span> · filtered by {activeFilters.join(', ')}</span>
                )}
              </p>
            </div>

            <div className="toolbar-actions">
              {activeFilters.length > 0 && (
                <button
                  className="toolbar-clear"
                  onClick={() => {
                    setSelectedCity('')
                    setSelectedDistance('')
                    fetchUsers('', '')
                  }}
                >
                  ✕ Clear
                </button>
              )}

              <FilterPanel
                cityOptions={cityOptions}
                distanceOptions={distanceOptions}
                loadingCity={loadingCity}
                loadingDistance={loadingDistance}
                selectedCity={selectedCity}
                selectedDistance={selectedDistance}
                onFetchCity={() => fetchFilter('city')}
                onFetchDistance={() => fetchFilter('distance')}
                onApply={(city, distance) => {
                  setSelectedCity(city)
                  setSelectedDistance(distance)
                  fetchUsers(city, distance)
                }}
                onClear={() => {
                  setSelectedCity('')
                  setSelectedDistance('')
                  fetchUsers('', '')
                }}
              />
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="th index">No.</div>
              <div className="th user">Buddy Details</div>
              <div className="th tags">Interests / Info</div>
              <div className="th actions">Actions</div>
            </div>

            {loadingUsers ? (
              <div className="loading-list">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="skeleton-row" key={index}>
                    <div className="skel small" />
                    <div className="skel avatar" />
                    <div className="skel text" />
                    <div className="skel chips" />
                    <div className="skel button" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState icon="⚠️" title="Unable to load matches" description={error} />
            ) : users.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No buddies found"
                description="Try changing city, distance, or selected category."
              />
            ) : (
              <div className="table-body">
                {users.map((user, index) => {
                  const userId = Number(user.userId || user.id || 0)

                  return (
                    <UserRow
                      key={userId || index}
                      user={user}
                      index={index}
                      sent={sentIds.has(userId)}
                      sending={sendingId === userId}
                      onSend={handleSendRequest}
                      onViewProfile={id => setProfileModalUserId(id)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {profileModalUserId !== null && (
        <ProfileModal
          userId={profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
        />
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{
            borderRadius: '14px',
            fontWeight: 700,
            boxShadow: '0 18px 45px rgba(15,23,42,0.18)',
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

const pageStyles = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  .page-root {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(99,102,241,0.22), transparent 34%),
      radial-gradient(circle at top right, rgba(236,72,153,0.16), transparent 30%),
      radial-gradient(circle at bottom left, rgba(20,184,166,0.12), transparent 32%),
      linear-gradient(135deg, #050816 0%, #0f172a 48%, #111827 100%);
    color: #f8fafc;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding-bottom: 70px;
    overflow-x: hidden;
  }

  .hero {
    max-width: 1240px;
    margin: 0 auto;
    padding: 34px 22px 24px;
    position: relative;
    z-index: 1;
  }

  .hero-bg-one,
  .hero-bg-two {
    position: absolute;
    border-radius: 999px;
    filter: blur(12px);
    opacity: 0.9;
    pointer-events: none;
  }

  .hero-bg-one {
    width: 220px;
    height: 220px;
    background: rgba(99,102,241,0.24);
    top: 20px;
    left: 20px;
  }

  .hero-bg-two {
    width: 260px;
    height: 260px;
    background: rgba(236,72,153,0.18);
    right: 40px;
    top: 20px;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    border-radius: 34px;
    padding: 34px;
    background:
      linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.76)),
      linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.12));
    border: 1px solid rgba(148,163,184,0.18);
    box-shadow:
      0 28px 90px rgba(0,0,0,0.4),
      inset 0 1px 0 rgba(255,255,255,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 28px;
    overflow: hidden;
    backdrop-filter: blur(18px);
  }

  .eyebrow {
    color: #a5b4fc;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    max-width: 740px;
    font-size: clamp(34px, 5vw, 62px);
    line-height: 1.02;
    letter-spacing: -0.06em;
    color: #f8fafc;
    font-weight: 950;
  }

  .hero h1 span {
    background: linear-gradient(135deg, #a5b4fc, #f472b6, #fb923c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero p {
    margin: 16px 0 0;
    max-width: 660px;
    color: rgba(226,232,240,0.68);
    line-height: 1.7;
    font-size: 15px;
    font-weight: 500;
  }

  .hero-pills {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .hero-pills span {
    padding: 9px 13px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(148,163,184,0.16);
    color: #dbeafe;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  }

  .hero-card {
    min-width: 210px;
    padding: 24px;
    border-radius: 28px;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 34%),
      linear-gradient(135deg, #4f46e5, #7c3aed);
    color: #ffffff;
    box-shadow: 0 24px 56px rgba(79,70,229,0.36);
    text-align: center;
    border: 1px solid rgba(255,255,255,0.16);
  }

  .hero-count {
    font-size: 54px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.08em;
  }

  .hero-label {
    margin-top: 8px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .hero-mini {
    margin-top: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.75);
  }

  .content-shell {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 22px;
    position: relative;
    z-index: 50;
    overflow: visible;
  }

  .toolbar {
    margin: 16px 0;
    padding: 18px 20px;
    border-radius: 24px;
    background: rgba(15,23,42,0.74);
    border: 1px solid rgba(148,163,184,0.15);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    backdrop-filter: blur(16px);
    position: relative;
    z-index: 2000;
    overflow: visible;
  }

  .toolbar h2 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: #f8fafc;
  }

  .toolbar p {
    margin: 4px 0 0;
    color: rgba(203,213,225,0.68);
    font-size: 14px;
    font-weight: 600;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 2200;
    overflow: visible;
  }

  .toolbar-clear {
    border: 1px solid rgba(248,113,113,0.24);
    background: rgba(248,113,113,0.1);
    color: #fecaca;
    border-radius: 14px;
    padding: 11px 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .toolbar-clear:hover {
    background: rgba(248,113,113,0.16);
  }

  .filter-wrapper {
    position: relative;
    z-index: 3000;
    overflow: visible;
  }

  .filter-main-btn {
    border: none;
    border-radius: 16px;
    padding: 12px 18px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    color: #ffffff;
    font-weight: 950;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 9px;
    box-shadow: 0 16px 34px rgba(99,102,241,0.28);
  }

  .filter-main-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 42px rgba(99,102,241,0.36);
  }

  .filter-main-btn.active {
    background: linear-gradient(135deg, #10b981, #06b6d4);
    box-shadow: 0 16px 34px rgba(20,184,166,0.22);
  }

  .filter-main-btn b {
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: rgba(255,255,255,0.24);
    font-size: 11px;
  }

  .filter-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 14px);
    width: 360px;
    z-index: 99999;
    border-radius: 26px;
    padding: 20px;
    background:
      radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 34%),
      linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96));
    border: 1px solid rgba(148,163,184,0.24);
    box-shadow:
      0 34px 95px rgba(0,0,0,0.68),
      0 0 0 1px rgba(99,102,241,0.12);
    backdrop-filter: blur(22px);
  }

  .filter-title {
    margin-bottom: 16px;
  }

  .filter-title strong {
    display: block;
    color: #f8fafc;
    font-size: 18px;
  }

  .filter-title small {
    color: rgba(203,213,225,0.62);
    font-weight: 700;
  }

  .filter-field {
    margin-bottom: 14px;
  }

  .filter-field label {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a5b4fc;
  }

  .filter-field select {
    width: 100%;
    border: 1px solid rgba(148,163,184,0.26);
    border-radius: 16px;
    padding: 13px 14px;
    outline: none;
    color: #f8fafc;
    background: #0f172a;
    font-weight: 900;
    font-size: 15px;
  }

  .filter-field select:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 4px rgba(129,140,248,0.12);
  }

  .filter-field option {
    background: #0f172a;
    color: #f8fafc;
  }

  .filter-actions {
    display: flex;
    gap: 12px;
    margin-top: 18px;
  }

  .clear-filter-btn,
  .apply-filter-btn {
    border: none;
    border-radius: 16px;
    padding: 13px 14px;
    font-weight: 950;
    cursor: pointer;
    font-size: 14px;
  }

  .clear-filter-btn {
    flex: 1;
    background: rgba(255,255,255,0.07);
    color: rgba(226,232,240,0.82);
    border: 1px solid rgba(148,163,184,0.15);
  }

  .clear-filter-btn:hover {
    background: rgba(255,255,255,0.11);
  }

  .apply-filter-btn {
    flex: 2;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    color: #ffffff;
    box-shadow: 0 14px 30px rgba(236,72,153,0.22);
  }

  .apply-filter-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 38px rgba(236,72,153,0.3);
  }

  .table-card {
    border-radius: 28px;
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(148,163,184,0.17);
    box-shadow: 0 28px 80px rgba(0,0,0,0.34);
    backdrop-filter: blur(18px);
    position: relative;
    z-index: 1;
    overflow: visible;
  }

  .table-header {
    display: grid;
    grid-template-columns: 80px minmax(260px, 1.5fr) minmax(240px, 1fr) 260px;
    gap: 14px;
    padding: 17px 22px;
    background:
      linear-gradient(135deg, rgba(99,102,241,0.22), rgba(236,72,153,0.15), rgba(20,184,166,0.12));
    border-bottom: 1px solid rgba(148,163,184,0.16);
    border-radius: 28px 28px 0 0;
  }

  .th {
    color: #e0e7ff;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    text-shadow: 0 1px 12px rgba(0,0,0,0.25);
  }

  .table-body {
    background: rgba(15,23,42,0.54);
    overflow: hidden;
    border-radius: 0 0 28px 28px;
  }

  .user-row {
    display: grid;
    grid-template-columns: 80px minmax(260px, 1.5fr) minmax(240px, 1fr) 260px;
    gap: 14px;
    align-items: center;
    padding: 18px 22px;
    border-bottom: 1px solid rgba(148,163,184,0.1);
    transition: 0.22s ease;
    position: relative;
  }

  .user-row:nth-child(even) {
    background: rgba(255,255,255,0.025);
  }

  .user-row:hover {
    background:
      linear-gradient(90deg, rgba(99,102,241,0.13), rgba(236,72,153,0.09));
    transform: translateY(-1px);
  }

  .user-row:hover::before {
    content: "";
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 4px;
    border-radius: 0 999px 999px 0;
    background: linear-gradient(180deg, #818cf8, #ec4899);
  }

  .col-index {
    width: 44px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(99,102,241,0.12);
    color: #c7d2fe;
    font-weight: 950;
    font-size: 13px;
    border: 1px solid rgba(129,140,248,0.18);
  }

  .col-user {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .user-main {
    min-width: 0;
  }

  .user-main h3 {
    margin: 0;
    color: #f8fafc;
    font-size: 17px;
    font-weight: 950;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-main p {
    margin: 5px 0 0;
    color: rgba(203,213,225,0.66);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 900;
    border: 1px solid transparent;
  }

  .tag.purple {
    background: rgba(99,102,241,0.15);
    color: #c7d2fe;
    border-color: rgba(129,140,248,0.3);
  }

  .tag.pink {
    background: rgba(236,72,153,0.14);
    color: #fbcfe8;
    border-color: rgba(244,114,182,0.28);
  }

  .tag.blue {
    background: rgba(59,130,246,0.14);
    color: #bfdbfe;
    border-color: rgba(96,165,250,0.28);
  }

  .tag.green {
    background: rgba(16,185,129,0.14);
    color: #a7f3d0;
    border-color: rgba(52,211,153,0.28);
  }

  .col-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .profile-btn,
  .send-btn,
  .sent-btn {
    border: none;
    border-radius: 14px;
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    white-space: nowrap;
  }

  .profile-btn {
    background: rgba(255,255,255,0.07);
    color: #e2e8f0;
    border: 1px solid rgba(148,163,184,0.16);
  }

  .profile-btn:hover {
    background: rgba(255,255,255,0.11);
    border-color: rgba(226,232,240,0.22);
  }

  .send-btn {
    color: #ffffff;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    box-shadow: 0 14px 28px rgba(99,102,241,0.24);
  }

  .send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 18px 34px rgba(99,102,241,0.34);
  }

  .send-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .sent-btn {
    background: rgba(34,197,94,0.14);
    color: #86efac;
    border: 1px solid rgba(74,222,128,0.25);
    cursor: default;
  }

  .loading-list {
    background: rgba(15,23,42,0.52);
    overflow: hidden;
    border-radius: 0 0 28px 28px;
  }

  .skeleton-row {
    display: grid;
    grid-template-columns: 80px 60px 1fr 220px 180px;
    gap: 14px;
    align-items: center;
    padding: 18px 22px;
    border-bottom: 1px solid rgba(148,163,184,0.08);
  }

  .skel {
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12), rgba(255,255,255,0.05));
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite linear;
  }

  .skel.small {
    width: 42px;
    height: 32px;
  }

  .skel.avatar {
    width: 46px;
    height: 46px;
    border-radius: 18px;
  }

  .skel.text {
    height: 38px;
  }

  .skel.chips {
    height: 34px;
  }

  .skel.button {
    height: 38px;
  }

  .empty-state {
    padding: 70px 24px;
    text-align: center;
    background: rgba(15,23,42,0.45);
    overflow: hidden;
    border-radius: 0 0 28px 28px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-state h3 {
    margin: 0;
    color: #f8fafc;
    font-size: 24px;
    letter-spacing: -0.03em;
  }

  .empty-state p {
    margin: 8px auto 0;
    max-width: 420px;
    color: rgba(203,213,225,0.64);
    line-height: 1.6;
    font-weight: 600;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    padding: 22px;
    background: rgba(2,6,23,0.72);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .profile-modal {
    width: 100%;
    max-width: 500px;
    position: relative;
    overflow: hidden;
    border-radius: 30px;
    background: #0f172a;
    border: 1px solid rgba(148,163,184,0.18);
    box-shadow: 0 38px 110px rgba(0,0,0,0.55);
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 2;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(15,23,42,0.84);
    color: #f8fafc;
    font-weight: 950;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.12);
  }

  .profile-banner {
    height: 130px;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 30%),
      linear-gradient(135deg, #4f46e5, #ec4899, #f97316);
  }

  .profile-content {
    padding: 0 28px 28px;
  }

  .profile-avatar-wrap {
    margin-top: -46px;
  }

  .profile-content h2 {
    margin: 14px 0 0;
    color: #f8fafc;
    font-size: 28px;
    letter-spacing: -0.05em;
  }

  .profile-location {
    margin: 6px 0 0;
    color: rgba(203,213,225,0.68);
    font-weight: 700;
  }

  .profile-tags {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .profile-tags span {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(99,102,241,0.16);
    color: #c7d2fe;
    font-size: 12px;
    font-weight: 900;
    border: 1px solid rgba(129,140,248,0.22);
  }

  .profile-tags .green-tag {
    background: rgba(34,197,94,0.14);
    color: #86efac;
    border-color: rgba(74,222,128,0.22);
  }

  .profile-section {
    margin-top: 24px;
    padding: 18px;
    border-radius: 20px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(148,163,184,0.14);
  }

  .profile-section label {
    display: block;
    color: #a5b4fc;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 11px;
    font-weight: 950;
    margin-bottom: 8px;
  }

  .profile-section p {
    margin: 0;
    color: rgba(226,232,240,0.78);
    line-height: 1.7;
    font-weight: 600;
  }

  .joined-text {
    margin-top: 14px;
    color: rgba(148,163,184,0.72);
    font-size: 12px;
    font-weight: 800;
  }

  .modal-state {
    padding: 70px 28px;
    text-align: center;
  }

  .modal-state p {
    color: rgba(203,213,225,0.68);
    font-weight: 700;
  }

  .state-icon {
    font-size: 44px;
  }

  .loader {
    width: 38px;
    height: 38px;
    margin: 0 auto 16px;
    border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: #818cf8;
    animation: spin 0.8s linear infinite;
  }

  @keyframes shimmer {
    from {
      background-position: -200% 0;
    }
    to {
      background-position: 200% 0;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 980px) {
    .hero-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .hero-card {
      width: 100%;
    }

    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .toolbar-actions {
      width: 100%;
      justify-content: space-between;
    }

    .table-header {
      display: none;
    }

    .user-row {
      grid-template-columns: 1fr;
      gap: 14px;
      padding: 20px;
    }

    .col-index {
      display: none;
    }

    .col-tags {
      justify-content: flex-start;
    }

    .col-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .filter-popover {
      right: auto;
      left: 0;
      width: min(360px, calc(100vw - 44px));
    }

    .skeleton-row {
      grid-template-columns: 46px 1fr;
    }

    .skel.small,
    .skel.chips,
    .skel.button {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .hero {
      padding: 20px 14px 14px;
    }

    .content-shell {
      padding: 0 14px;
    }

    .hero-content {
      padding: 24px;
      border-radius: 26px;
    }

    .hero h1 {
      font-size: 36px;
    }

    .toolbar-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-wrapper,
    .filter-main-btn,
    .toolbar-clear {
      width: 100%;
      justify-content: center;
    }

    .filter-popover {
      left: 0;
      right: auto;
      width: 100%;
    }

    .profile-btn,
    .send-btn,
    .sent-btn {
      width: 100%;
    }

    .col-actions {
      width: 100%;
    }
  }
`
