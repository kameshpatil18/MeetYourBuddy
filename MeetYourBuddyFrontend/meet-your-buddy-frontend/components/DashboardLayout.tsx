'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import buddyIcon from '../app/Buddy-icon.png' 
import Image from 'next/image'
/* ═══════════════════════════════════════════
   TYPES & CONSTANTS
═══════════════════════════════════════════ */
interface NavItemDef {
  icon: string
  label: string
  href: string
  badge?: number
}

const NAV_ITEMS: NavItemDef[] = [
  { icon: '⌂', label: 'Discover', href: '/dashboard' },
  { icon: '💬', label: 'Messages', href: '/chatting' },
  { icon: '👥', label: 'Find Buddies', href: '/usersfilters' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
]

/* ═══════════════════════════════════════════
   NAV ITEM
═══════════════════════════════════════════ */
function NavItem({
  icon,
  label,
  href,
  badge,
  active,
  collapsed,
}: NavItemDef & {
  active: boolean
  collapsed: boolean
}) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  const lit = active || hovered

  const handleClick = () => {
    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        border: active
          ? '1px solid rgba(99,102,241,0.25)'
          : '1px solid transparent',
        outline: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '12px' : '11px 14px',
        borderRadius: '12px',
        textDecoration: 'none',
        position: 'relative',
        transition: 'all 0.2s ease',
        background: active
          ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(34,211,238,0.08))'
          : hovered
            ? 'rgba(255,255,255,0.04)'
            : 'transparent',
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: '3px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #6366f1, #22d3ee)',
          }}
        />
      )}

      <span
        style={{
          fontSize: '1.05rem',
          flexShrink: 0,
          filter: lit ? 'none' : 'grayscale(0.3) opacity(0.55)',
          transition: 'filter 0.2s',
        }}
      >
        {icon}
      </span>

      {!collapsed && (
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.875rem',
            fontWeight: active ? 600 : 400,
            color: active
              ? '#e2e8f0'
              : hovered
                ? '#cbd5e1'
                : 'rgba(148,163,184,0.6)',
            transition: 'color 0.15s',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left',
          }}
        >
          {label}
        </span>
      )}

      {badge && !collapsed && (
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
            color: '#fff',
            padding: '1px 7px',
            borderRadius: '999px',
            minWidth: '20px',
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}

      {badge && collapsed && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#6366f1',
            border: '1.5px solid #060912',
          }}
        />
      )}

      {collapsed && hovered && (
        <div
          style={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(8,12,24,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '6px 12px',
            whiteSpace: 'nowrap',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.8rem',
            color: '#e2e8f0',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          {label}
          {badge ? ` · ${badge}` : ''}
        </div>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside
      style={{
        width: collapsed ? '68px' : '228px',
        height: '100vh',
        background: 'rgba(6,9,18,0.98)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.28s cubic-bezier(.4,0,.2,1)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '10px',
          flexShrink: 0,
        }}
      >
<div
  style={{
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
  }}
>
  <Image
    src={buddyIcon}
    alt="Buddy"
    width={32}
    height={32}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    }}
  />
</div>

        {!collapsed && (
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #a5b4fc, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            meetyourbuddy
          </span>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          padding: collapsed ? '0 8px' : '0 10px',
        }}
      >
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.label}
            {...item}
            active={isActiveRoute(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Toggle */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '16px 10px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(148,163,184,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(99,102,241,0.12)'
            e.currentTarget.style.color = '#818cf8'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.color = 'rgba(148,163,184,0.5)'
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════
   TOP BAR
═══════════════════════════════════════════ */
interface PendingRequest {
  id: number | string
  senderName: string
  senderInitial: string
  message: string
}

// Change this only if your AcceptMatchRequestCommand / RejectMatchRequestCommand
// uses a different property name, such as requestId or matchingId.
const MATCH_REQUEST_ID_BODY_KEY = 'RequestId'

function TopBar() {
  const router = useRouter()

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('Kamesh Patil')
  const [userInitial, setUserInitial] = useState('K')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [requestActionId, setRequestActionId] = useState<string | null>(null)
  const [requestActionError, setRequestActionError] = useState('')

  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const notificationRef = useRef<HTMLDivElement | null>(null)

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return ''

    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)

    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()!.split(';').shift()!)
    }

    return ''
  }

  const getToken = () => {
    if (typeof window === 'undefined') return ''

    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      getCookie('token') ||
      getCookie('accessToken') ||
      getCookie('authToken') ||
      ''
    )
  }

  const loadPendingRequests = async () => {
    const token = getToken()

    if (!token) {
      setPendingRequests([])
      setNotificationError('Please log in again to load requests.')
      return
    }

    try {
      setNotificationsLoading(true)
      setNotificationError('')

      const response = await fetch(
        'https://localhost:7169/api/matching/get-pending-request',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Unable to load pending requests (${response.status}).`)
      }

      const result: unknown = await response.json()
      const responseObject = result as Record<string, unknown>
      const requestList = Array.isArray(result)
        ? result
        : Array.isArray(responseObject?.data)
          ? responseObject.data
          : Array.isArray(responseObject?.requests)
            ? responseObject.requests
            : Array.isArray(responseObject?.items)
              ? responseObject.items
              : []

      const mappedRequests: PendingRequest[] = requestList.map(
        (request: unknown, index: number) => {
          const item = request as Record<string, unknown>
          const firstName = String(
            item.firstName ??
              item.senderFirstName ??
              item.fromUserFirstName ??
              ''
          )
          const lastName = String(
            item.lastName ??
              item.senderLastName ??
              item.fromUserLastName ??
              ''
          )
          const generatedName = [firstName, lastName].filter(Boolean).join(' ')
          const senderName = String(
            item.senderName ??
              item.fullName ??
              item.requestedByName ??
              item.userName ??
              (generatedName || 'New buddy request')
          )

          return {
            id: String(
              item.id ??
                item.requestId ??
                item.matchingId ??
                item.senderId ??
                index + 1
            ),
            senderName,
            senderInitial: senderName.charAt(0).toUpperCase() || 'B',
            message: String(
              item.message ??
                item.bio ??
                'Sent you a buddy request.'
            ),
          }
        }
      )

      setPendingRequests(mappedRequests)
    } catch (error) {
      console.error('Pending-request API error:', error)
      setPendingRequests([])
      setNotificationError('Could not load notifications. Please try again.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const handleRequestAction = async (
    action: 'accept' | 'reject',
    request: PendingRequest
  ) => {
    const token = getToken()

    if (!token) {
      setRequestActionError('Your session has expired. Please log in again.')
      return
    }

    try {
      setRequestActionId(String(request.id))
      setRequestActionError('')

      const response = await fetch(
        `https://localhost:7169/api/matching/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            [MATCH_REQUEST_ID_BODY_KEY]: request.id,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Unable to ${action} this request.`)
      }

      // Immediately remove it from the badge and notification list.
      setPendingRequests(previous =>
        previous.filter(item => String(item.id) !== String(request.id))
      )

      if (action === 'accept') {
        setNotificationOpen(false)
        router.push('/chatting')
      }
    } catch (error) {
      console.error(`${action} request API error:`, error)
      setRequestActionError(
        error instanceof Error
          ? error.message
          : `Could not ${action} this request. Please try again.`
      )
    } finally {
      setRequestActionId(null)
    }
  }

  const handleNotificationClick = async () => {
    const shouldOpen = !notificationOpen
    setNotificationOpen(shouldOpen)
    setProfileOpen(false)

    if (shouldOpen) {
      await loadPendingRequests()
    }
  }

  const handleProfileClick = () => {
    setProfileOpen(false)
    router.push('/profileform')
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()

    if (!query) {
      router.push('/usersfilters')
      return
    }

    router.push(`/usersfilters?q=${encodeURIComponent(query)}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    sessionStorage.clear()

    document.cookie = 'token=; Max-Age=0; path=/'
    document.cookie = 'accessToken=; Max-Age=0; path=/'
    document.cookie = 'authToken=; Max-Age=0; path=/'
    document.cookie = 'user=; Max-Age=0; path=/'

    setProfileOpen(false)
    setNotificationOpen(false)
    router.push('/login')
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setProfileOpen(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    // Load the badge count as soon as the dashboard opens, then keep it current.
    void loadPendingRequests()

    const intervalId = window.setInterval(() => {
      void loadPendingRequests()
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
    // loadPendingRequests intentionally runs on initial dashboard mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const rawCookieUser = getCookie('user')
      const rawLocalUser =
        typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const rawUser = rawCookieUser || rawLocalUser

      if (!rawUser) return

      const user = JSON.parse(rawUser) as Record<string, unknown>
      const firstName = String(user.firstName ?? user.first_name ?? '')
      const lastName = String(user.lastName ?? user.last_name ?? '')
      const fullName = [firstName, lastName].filter(Boolean).join(' ')

      if (fullName) {
        setUserName(fullName)
        setUserInitial(firstName?.[0]?.toUpperCase() || fullName[0]?.toUpperCase() || 'K')
      }
    } catch {
      // Ignore invalid user data.
    }
  }, [])

  return (
    <header
      style={{
        height: '62px',
        background: 'rgba(6,9,18,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <form
        onSubmit={handleSearchSubmit}
        style={{
          position: 'relative',
          width: 'min(360px, 38vw)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '13px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.82rem',
            opacity: 0.45,
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>

        <input
          type="text"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search buddies by name, city or interest…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            padding: '9px 42px 9px 36px',
            background: searchFocused
              ? 'rgba(99,102,241,0.08)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${
              searchFocused
                ? 'rgba(99,102,241,0.42)'
                : 'rgba(255,255,255,0.07)'
            }`,
            borderRadius: '12px',
            color: '#e2e8f0',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.82rem',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: searchFocused
              ? '0 0 0 3px rgba(99,102,241,0.10)'
              : 'none',
          }}
        />

        <button
          type="submit"
          title="Search buddies"
          style={{
            position: 'absolute',
            right: '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '31px',
            height: '31px',
            borderRadius: '9px',
            border: '1px solid rgba(99,102,241,0.22)',
            background: searchQuery.trim()
              ? 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(34,211,238,0.78))'
              : 'rgba(255,255,255,0.03)',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all .2s ease',
          }}
        >
          →
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => router.push('/profileform')}
          style={{
            height: '38px',
            padding: '0 14px',
            borderRadius: '11px',
            border: '1px solid rgba(99,102,241,0.28)',
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(34,211,238,0.08))',
            color: '#dbeafe',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.78rem',
            fontWeight: 650,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(30,41,59,0.16)',
            transition: 'all .2s ease',
          }}
          onMouseEnter={event => {
            event.currentTarget.style.transform = 'translateY(-1px)'
            event.currentTarget.style.borderColor = 'rgba(103,232,249,0.42)'
          }}
          onMouseLeave={event => {
            event.currentTarget.style.transform = 'translateY(0)'
            event.currentTarget.style.borderColor = 'rgba(99,102,241,0.28)'
          }}
        >
          <span style={{ fontSize: '0.95rem' }}>👤</span>
          Create / Edit Profile
        </button>

        <button
          type="button"
          onClick={() => router.push('/chatting')}
          title="Open messages"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
          }}
        >
          💬
        </button>

        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleNotificationClick}
            title="Pending buddy requests"
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              border: notificationOpen ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.07)',
              background: notificationOpen ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.03)',
              color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.95rem', position: 'relative', transition: 'all 0.2s',
            }}
          >
            🔔
            {pendingRequests.length > 0 && (
              <span
                style={{
                  position: 'absolute', top: '-5px', right: '-5px', minWidth: '17px', height: '17px',
                  borderRadius: '999px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                  color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '0.62rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #060912', padding: '0 4px',
                }}
              >
                {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div
              style={{
                position: 'absolute', top: '46px', right: 0, width: '330px', borderRadius: '14px',
                background: '#0b1020', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 999,
              }}
            >
              <div
                style={{
                  padding: '14px 15px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ color: '#f8fafc', fontFamily: "'Outfit', sans-serif", fontSize: '0.9rem', fontWeight: 700 }}>
                    Pending Requests
                  </div>
                  <div style={{ color: 'rgba(148,163,184,0.65)', fontFamily: "'Outfit', sans-serif", fontSize: '0.72rem', marginTop: '2px' }}>
                    Buddy requests waiting for you
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadPendingRequests}
                  disabled={notificationsLoading}
                  style={{
                    border: 'none', background: 'transparent', color: '#67e8f9', cursor: notificationsLoading ? 'wait' : 'pointer',
                    fontSize: '0.78rem', fontFamily: "'Outfit', sans-serif", opacity: notificationsLoading ? 0.55 : 1,
                  }}
                >
                  Refresh
                </button>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notificationsLoading && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(148,163,184,0.7)', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem' }}>
                    Loading pending requests...
                  </div>
                )}

                {!notificationsLoading && notificationError && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#fca5a5', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem' }}>
                    {notificationError}
                  </div>
                )}

                {!notificationsLoading && !notificationError && pendingRequests.length === 0 && (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(148,163,184,0.7)', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✨</div>
                    No pending buddy requests.
                  </div>
                )}

                {!notificationsLoading && requestActionError && (
                  <div
                    style={{
                      margin: '10px 12px 0',
                      padding: '9px 10px',
                      borderRadius: '9px',
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#fca5a5',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '0.72rem',
                    }}
                  >
                    {requestActionError}
                  </div>
                )}

                {!notificationsLoading && pendingRequests.map(request => {
                  const actionInProgress = requestActionId === String(request.id)

                  return (
                    <div
                      key={request.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        padding: '13px 15px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#fff',
                          fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                        }}
                      >
                        {request.senderInitial}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {request.senderName}
                        </div>
                        <div style={{ color: 'rgba(148,163,184,0.65)', fontFamily: "'Outfit', sans-serif", fontSize: '0.72rem', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {request.message}
                        </div>

                        <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => void handleRequestAction('accept', request)}
                            style={{
                              border: '1px solid rgba(34,197,94,0.45)',
                              background: 'rgba(34,197,94,0.13)',
                              color: '#86efac',
                              borderRadius: '7px',
                              padding: '6px 10px',
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: actionInProgress ? 'wait' : 'pointer',
                              opacity: actionInProgress ? 0.6 : 1,
                            }}
                          >
                            {actionInProgress ? 'Saving…' : 'Accept'}
                          </button>

                          <button
                            type="button"
                            disabled={actionInProgress}
                            onClick={() => void handleRequestAction('reject', request)}
                            style={{
                              border: '1px solid rgba(248,113,113,0.38)',
                              background: 'rgba(248,113,113,0.08)',
                              color: '#fca5a5',
                              borderRadius: '7px',
                              padding: '6px 10px',
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: actionInProgress ? 'wait' : 'pointer',
                              opacity: actionInProgress ? 0.6 : 1,
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.07)' }} />

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => {
              setProfileOpen(prev => !prev)
              setNotificationOpen(false)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 10px 5px 5px',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
              border: profileOpen ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
              background: profileOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
            onMouseLeave={e => {
              if (!profileOpen) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }
            }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              {userInitial}
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.83rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 }}>
                {userName}
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Online
              </div>
            </div>
            <span style={{ color: 'rgba(148,163,184,0.35)', fontSize: '0.72rem', marginLeft: '2px', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
              ▾
            </span>
          </div>

          {profileOpen && (
            <div style={{ position: 'absolute', top: '48px', right: 0, width: '214px', borderRadius: '14px', background: '#0b1020', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.35)', padding: '6px', zIndex: 999 }}>
              <button
                type="button"
                onClick={handleProfileClick}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#e2e8f0', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 500, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                👤 Create / Edit Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  router.push('/chatting')
                }}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#e2e8f0', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 500, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                💬 My Messages
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  router.push('/settings')
                }}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#e2e8f0', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 500, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                ⚙️ Settings
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '5px 6px' }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#f87171', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', fontWeight: 500, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}


/* ═══════════════════════════════════════════
   LAYOUT EXPORT
═══════════════════════════════════════════ */
export default function DashboardLayout({
  children,
}: {
  children?: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          background: #060912;
          margin: 0;
        }

        button {
          font-family: inherit;
        }

        input::placeholder {
          color: rgba(100,116,139,0.48);
        }

        button:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(103,232,249,0.7);
          outline-offset: 2px;
        }

        @media (max-width: 900px) {
          .desktop-profile-cta {
            display: none;
          }
        }

        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.22);
          border-radius: 999px;
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#060912',
          position: 'relative',
        }}
      >
        {/* Background orbs */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              right: '8%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: '18%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 65%)',
            }}
          />
        </div>

        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(current => !current)}
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          <TopBar />

          <main
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <div
              style={{
                minHeight: 'calc(100vh - 62px - 48px)',
                background: 'rgba(12,18,35,0.55)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '28px',
                backdropFilter: 'blur(14px)',
                boxShadow:
                  '0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                animation: 'fadeSlideUp 0.4s ease both',
              }}
            >
              {children ?? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '60vh',
                    gap: '16px',
                    opacity: 0.25,
                  }}
                >
                  <div style={{ fontSize: '3rem' }}>🤝</div>

                  <p
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      margin: 0,
                    }}
                  >
                    Your content goes here
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}