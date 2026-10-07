'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import buddyIcon from '../app/Buddy-icon.png'

type NavItemDef = {
  icon: string
  label: string
  href: string
}

type PendingRequest = {
  id: string
  senderName: string
  senderInitial: string
  message: string
}

const NAV_ITEMS: NavItemDef[] = [
  { icon: '⌂', label: 'Discover', href: '/dashboard' },
  { icon: '💬', label: 'Messages', href: '/chatting' },

  // NEW
  { icon: '🎮', label: 'Buddy Games', href: '/buddygames' },

  { icon: '👥', label: 'Find Buddies', href: '/usersfilters' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
]

const MATCHING_API_BASE = (
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL || 'https://localhost:7169'
).replace(/\/+$/, '')

const MATCH_REQUEST_ID_BODY_KEY = 'RequestId'

function getCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length !== 2) return ''

  try {
    return decodeURIComponent(parts.pop()!.split(';').shift() || '')
  } catch {
    return ''
  }
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
    getCookie('token') ||
    getCookie('accessToken') ||
    getCookie('authToken') ||
    ''
  )
}

function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onCloseMobile: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(`${href}/`)

  const go = (href: string) => {
    router.push(href)
    onCloseMobile()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className={`db-backdrop ${mobileOpen ? 'show' : ''}`}
        onClick={onCloseMobile}
      />

      <aside
        className={[
          'db-sidebar',
          collapsed ? 'collapsed' : '',
          mobileOpen ? 'mobile-open' : '',
        ].join(' ')}
      >
        <div className="db-brand">
          <button
            type="button"
            className="db-brand-link"
            onClick={() => go('/dashboard')}
          >
            <span className="db-logo">
              <Image
                src={buddyIcon}
                alt="MeetYourBuddy"
                width={36}
                height={36}
                priority
              />
            </span>

            {!collapsed && (
              <span className="db-brand-name">meetyourbuddy</span>
            )}
          </button>

          <button
            type="button"
            className="db-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="db-nav" aria-label="Dashboard navigation">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)

            return (
              <button
                key={item.href}
                type="button"
                className={`db-nav-item ${active ? 'active' : ''}`}
                onClick={() => go(item.href)}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span className="db-nav-icon">{item.icon}</span>

                {!collapsed && (
                  <span className="db-nav-label">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="db-sidebar-footer">
          <button
            type="button"
            className="db-collapse"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="db-collapse-arrow">
              {collapsed ? '›' : '‹'}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

function TopBar({
  onOpenMobile,
}: {
  onOpenMobile: () => void
}) {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('Buddy')
  const [userInitial, setUserInitial] = useState('B')

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [requestActionId, setRequestActionId] = useState<string | null>(null)
  const [requestActionError, setRequestActionError] = useState('')

  const profileRef = useRef<HTMLDivElement | null>(null)
  const notificationRef = useRef<HTMLDivElement | null>(null)

  const loadPendingRequests = useCallback(async () => {
    const token = getToken()

    if (!token) {
      setPendingRequests([])
      setNotificationError('Please sign in again to load requests.')
      return
    }

    try {
      setNotificationsLoading(true)
      setNotificationError('')

      const response = await fetch(
        `${MATCHING_API_BASE}/api/matching/get-pending-request`,
        {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Unable to load requests (${response.status}).`)
      }

      const result: unknown = await response.json()
      const obj = result as Record<string, unknown>

      const list = Array.isArray(result)
        ? result
        : Array.isArray(obj?.data)
          ? obj.data
          : Array.isArray(obj?.requests)
            ? obj.requests
            : Array.isArray(obj?.items)
              ? obj.items
              : []

      const mapped = list.map((value: unknown, index: number) => {
        const item = value as Record<string, unknown>

        const firstName = String(
          item.firstName ??
            item.senderFirstName ??
            item.fromUserFirstName ??
            '',
        )

        const lastName = String(
          item.lastName ??
            item.senderLastName ??
            item.fromUserLastName ??
            '',
        )

        const fallbackName = [firstName, lastName]
          .filter(Boolean)
          .join(' ')

        const senderName = String(
          item.senderName ??
            item.fullName ??
            item.requestedByName ??
            item.userName ??
            fallbackName ??
            'New buddy request',
        )

        return {
          id: String(
            item.id ??
              item.requestId ??
              item.matchingId ??
              item.senderId ??
              index + 1,
          ),
          senderName: senderName || 'New buddy request',
          senderInitial: (senderName || 'B').charAt(0).toUpperCase(),
          message: String(
            item.message ??
              item.bio ??
              'Sent you a buddy request.',
          ),
        }
      })

      setPendingRequests(mapped)
    } catch (error) {
      console.error('Pending-request API error:', error)
      setPendingRequests([])
      setNotificationError('Could not load notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  const handleRequestAction = async (
    action: 'accept' | 'reject',
    request: PendingRequest,
  ) => {
    const token = getToken()

    if (!token) {
      setRequestActionError('Your session has expired.')
      return
    }

    try {
      setRequestActionId(request.id)
      setRequestActionError('')

      const response = await fetch(
        `${MATCHING_API_BASE}/api/matching/${action}`,
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
        },
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Unable to ${action} request.`)
      }

      setPendingRequests(current =>
        current.filter(item => item.id !== request.id),
      )

      if (action === 'accept') {
        setNotificationOpen(false)
        router.push('/chatting')
      }
    } catch (error) {
      setRequestActionError(
        error instanceof Error
          ? error.message
          : `Could not ${action} request.`,
      )
    } finally {
      setRequestActionId(null)
    }
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchQuery.trim()

    router.push(
      query
        ? `/usersfilters?q=${encodeURIComponent(query)}`
        : '/usersfilters',
    )
  }

  const logout = () => {
    ;['token', 'accessToken', 'authToken', 'user'].forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`
    })

    router.replace('/login')
  }

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOutside)

    return () => {
      document.removeEventListener('mousedown', closeOutside)
    }
  }, [])

  useEffect(() => {
    void loadPendingRequests()

    const id = window.setInterval(
      () => void loadPendingRequests(),
      30000,
    )

    return () => window.clearInterval(id)
  }, [loadPendingRequests])

  useEffect(() => {
    try {
      const raw =
        getCookie('user') ||
        localStorage.getItem('user') ||
        sessionStorage.getItem('user') ||
        ''

      if (!raw) return

      const user = JSON.parse(raw) as Record<string, unknown>
      const firstName = String(
        user.firstName ?? user.first_name ?? '',
      )
      const lastName = String(
        user.lastName ?? user.last_name ?? '',
      )

      const fullName =
        String(user.fullName ?? '').trim() ||
        [firstName, lastName].filter(Boolean).join(' ')

      if (fullName) {
        setUserName(fullName)
        setUserInitial(
          firstName?.[0]?.toUpperCase() ||
            fullName[0]?.toUpperCase() ||
            'B',
        )
      }
    } catch {
      // Ignore invalid saved user data.
    }
  }, [])

  return (
    <header className="db-topbar">
      <button
        type="button"
        className="db-mobile-menu"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        ☰
      </button>

      <form className="db-search" onSubmit={handleSearch}>
        <span>⌕</span>
        <input
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search buddies, city, interests…"
          aria-label="Search buddies"
        />
        <button type="submit" aria-label="Search">→</button>
      </form>

      <div className="db-top-actions">
        <button
          type="button"
          className="db-profile-cta"
          onClick={() => router.push('/profileform')}
        >
          <span>👤</span>
          <span className="db-profile-cta-text">Create / Edit Profile</span>
        </button>

        <button
          type="button"
          className="db-icon-btn db-message-btn"
          onClick={() => router.push('/chatting')}
          aria-label="Messages"
        >
          💬
        </button>

        <div ref={notificationRef} className="db-anchor">
          <button
            type="button"
            className={`db-icon-btn ${notificationOpen ? 'active' : ''}`}
            onClick={async () => {
              const next = !notificationOpen
              setNotificationOpen(next)
              setProfileOpen(false)

              if (next) {
                await loadPendingRequests()
              }
            }}
            aria-label="Pending requests"
          >
            🔔
            {pendingRequests.length > 0 && (
              <span className="db-badge">
                {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="db-notification-menu">
              <div className="db-popover-head">
                <div>
                  <strong>Pending Requests</strong>
                  <small>Buddy requests waiting for you</small>
                </div>
                <button
                  type="button"
                  onClick={() => void loadPendingRequests()}
                  disabled={notificationsLoading}
                >
                  Refresh
                </button>
              </div>

              <div className="db-request-list">
                {notificationsLoading && (
                  <div className="db-empty">Loading requests…</div>
                )}

                {!notificationsLoading && notificationError && (
                  <div className="db-error">{notificationError}</div>
                )}

                {!notificationsLoading &&
                  !notificationError &&
                  pendingRequests.length === 0 && (
                    <div className="db-empty">
                      ✨ No pending buddy requests.
                    </div>
                  )}

                {!!requestActionError && (
                  <div className="db-inline-error">
                    {requestActionError}
                  </div>
                )}

                {!notificationsLoading &&
                  pendingRequests.map(request => {
                    const busy = requestActionId === request.id

                    return (
                      <div className="db-request" key={request.id}>
                        <div className="db-request-avatar">
                          {request.senderInitial}
                        </div>

                        <div className="db-request-copy">
                          <strong>{request.senderName}</strong>
                          <span>{request.message}</span>

                          <div>
                            <button
                              type="button"
                              className="accept"
                              disabled={busy}
                              onClick={() =>
                                void handleRequestAction('accept', request)
                              }
                            >
                              {busy ? 'Saving…' : 'Accept'}
                            </button>

                            <button
                              type="button"
                              className="reject"
                              disabled={busy}
                              onClick={() =>
                                void handleRequestAction('reject', request)
                              }
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

        <div ref={profileRef} className="db-anchor">
          <button
            type="button"
            className={`db-user-btn ${profileOpen ? 'active' : ''}`}
            onClick={() => {
              setProfileOpen(current => !current)
              setNotificationOpen(false)
            }}
          >
            <span className="db-user-avatar">{userInitial}</span>

            <span className="db-user-copy">
              <strong>{userName}</strong>
              <small><i /> Online</small>
            </span>

            <span className="db-chevron">▾</span>
          </button>

          {profileOpen && (
            <div className="db-profile-menu">
              <button
                type="button"
                onClick={() => router.push('/profileform')}
              >
                👤 Profile
              </button>

              <button
                type="button"
                onClick={() => router.push('/chatting')}
              >
                💬 Messages
              </button>

              <button
                type="button"
                onClick={() => router.push('/settings')}
              >
                ⚙️ Settings
              </button>

              <div />

              <button
                type="button"
                className="danger"
                onClick={logout}
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

export default function DashboardLayout({
  children,
}: {
  children?: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem('myb-sidebar-collapsed') === 'true',
      )
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(current => {
      const next = !current

      try {
        localStorage.setItem(
          'myb-sidebar-collapsed',
          String(next),
        )
      } catch {
        // Ignore storage errors.
      }

      return next
    })
  }

  return (
    <>
      <style>{`
        :root {
          --db-bg: #060912;
          --db-border: rgba(255,255,255,.07);
          --db-muted: rgba(148,163,184,.66);
        }

        * { box-sizing: border-box; }
        html, body { margin: 0; background: var(--db-bg); }
        body { overflow-x: hidden; }
        button, input { font: inherit; }

        .db-shell {
          display: flex;
          min-height: 100svh;
          color: #e2e8f0;
          background:
            radial-gradient(circle at 80% -5%, rgba(99,102,241,.10), transparent 28rem),
            radial-gradient(circle at 20% 105%, rgba(34,211,238,.06), transparent 25rem),
            var(--db-bg);
        }

        .db-sidebar {
          width: 232px;
          height: 100svh;
          flex: 0 0 auto;
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          background: rgba(5,8,17,.98);
          border-right: 1px solid var(--db-border);
          transition: width .25s ease, transform .25s ease;
        }

        .db-sidebar.collapsed { width: 72px; }

        .db-brand {
          min-height: 68px;
          padding: 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .db-brand-link {
          min-width: 0;
          padding: 0;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .db-logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          overflow: hidden;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          box-shadow: 0 8px 24px rgba(99,102,241,.25);
        }

        .db-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .db-brand-name {
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
          background: linear-gradient(90deg,#c7d2fe,#67e8f9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .db-mobile-close { display: none; }

        .db-nav {
          flex: 1;
          min-height: 0;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          overflow-y: auto;
        }

        .db-nav-item {
          width: 100%;
          min-height: 44px;
          padding: 0 13px;
          border-radius: 13px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--db-muted);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: .18s ease;
          position: relative;
        }

        .db-sidebar.collapsed .db-nav-item {
          justify-content: center;
          padding: 0;
        }

        .db-nav-item:hover {
          color: #dbeafe;
          background: rgba(255,255,255,.045);
        }

        .db-nav-item.active {
          color: #eef2ff;
          border-color: rgba(99,102,241,.22);
          background: linear-gradient(135deg,rgba(99,102,241,.18),rgba(34,211,238,.07));
        }

        .db-nav-item.active::before {
          content: "";
          position: absolute;
          left: -1px;
          top: 10px;
          bottom: 10px;
          width: 3px;
          border-radius: 99px;
          background: linear-gradient(#818cf8,#22d3ee);
        }

        .db-nav-icon {
          width: 20px;
          flex: 0 0 auto;
          text-align: center;
          font-size: 16px;
        }

        .db-nav-label {
          min-width: 0;
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 600;
        }

        .db-sidebar-footer {
          padding: 12px 10px;
          border-top: 1px solid rgba(255,255,255,.05);
        }

        .db-collapse {
          width: 100%;
          min-height: 40px;
          border-radius: 12px;
          border: 1px solid var(--db-border);
          background: rgba(255,255,255,.03);
          color: rgba(203,213,225,.64);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .db-collapse:hover {
          color: #c7d2fe;
          background: rgba(99,102,241,.10);
        }

        .db-collapse-arrow {
          font-size: 20px;
          line-height: 1;
        }

        .db-backdrop { display: none; }

        .db-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .db-topbar {
          min-height: 64px;
          padding: 10px 22px;
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: rgba(6,9,18,.88);
          border-bottom: 1px solid rgba(255,255,255,.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .db-mobile-menu {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--db-border);
          background: rgba(255,255,255,.035);
          color: #cbd5e1;
          cursor: pointer;
        }

        .db-search {
          width: min(420px,38vw);
          flex: 0 1 420px;
          position: relative;
        }

        .db-search > span {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(148,163,184,.5);
          pointer-events: none;
        }

        .db-search input {
          width: 100%;
          height: 42px;
          padding: 0 44px 0 38px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.07);
          outline: 0;
          background: rgba(255,255,255,.035);
          color: #e2e8f0;
          font-size: 13px;
        }

        .db-search input:focus {
          border-color: rgba(129,140,248,.42);
          background: rgba(99,102,241,.07);
          box-shadow: 0 0 0 3px rgba(99,102,241,.09);
        }

        .db-search input::placeholder {
          color: rgba(100,116,139,.6);
        }

        .db-search button {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(99,102,241,.2);
          background: linear-gradient(135deg,rgba(99,102,241,.9),rgba(34,211,238,.7));
          color: white;
          cursor: pointer;
        }

        .db-top-actions {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .db-profile-cta,
        .db-icon-btn,
        .db-user-btn {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.035);
          color: #dbeafe;
          cursor: pointer;
        }

        .db-profile-cta {
          height: 40px;
          padding: 0 13px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
        }

        .db-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          position: relative;
        }

        .db-icon-btn:hover,
        .db-icon-btn.active {
          border-color: rgba(129,140,248,.30);
          background: rgba(99,102,241,.10);
        }

        .db-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 99px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#6366f1,#22d3ee);
          color: white;
          font-size: 10px;
          font-weight: 800;
          border: 2px solid #060912;
        }

        .db-anchor { position: relative; }

        .db-user-btn {
          min-width: 0;
          height: 44px;
          padding: 4px 8px 4px 4px;
          border-radius: 13px;
          background: transparent;
          border-color: transparent;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .db-user-btn:hover,
        .db-user-btn.active {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.07);
        }

        .db-user-avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#6366f1,#22d3ee);
          color: white;
          font-size: 13px;
          font-weight: 800;
        }

        .db-user-copy {
          min-width: 0;
          max-width: 130px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .db-user-copy strong {
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #e2e8f0;
          font-size: 12px;
        }

        .db-user-copy small {
          color: rgba(148,163,184,.55);
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .db-user-copy i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #4ade80;
        }

        .db-chevron {
          color: rgba(148,163,184,.45);
          font-size: 11px;
        }

        .db-profile-menu,
        .db-notification-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          z-index: 80;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(9,14,28,.98);
          box-shadow: 0 22px 60px rgba(0,0,0,.45);
          backdrop-filter: blur(20px);
        }

        .db-profile-menu {
          width: 220px;
          padding: 6px;
          border-radius: 15px;
        }

        .db-profile-menu button {
          width: 100%;
          min-height: 40px;
          padding: 0 11px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #dbeafe;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .db-profile-menu button:hover {
          background: rgba(255,255,255,.055);
        }

        .db-profile-menu button.danger { color: #fca5a5; }

        .db-profile-menu > div {
          height: 1px;
          margin: 5px 6px;
          background: rgba(255,255,255,.07);
        }

        .db-notification-menu {
          width: min(350px,calc(100vw - 24px));
          border-radius: 16px;
          overflow: hidden;
        }

        .db-popover-head {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .db-popover-head > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .db-popover-head strong {
          color: #f8fafc;
          font-size: 13px;
        }

        .db-popover-head small {
          margin-top: 2px;
          color: rgba(148,163,184,.62);
          font-size: 10px;
        }

        .db-popover-head button {
          border: 0;
          background: transparent;
          color: #67e8f9;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
        }

        .db-request-list {
          max-height: min(390px,60vh);
          overflow-y: auto;
        }

        .db-empty,
        .db-error {
          padding: 26px 14px;
          text-align: center;
          color: rgba(148,163,184,.7);
          font-size: 12px;
        }

        .db-error { color: #fca5a5; }

        .db-inline-error {
          margin: 10px;
          padding: 9px 10px;
          border-radius: 10px;
          border: 1px solid rgba(239,68,68,.2);
          background: rgba(239,68,68,.08);
          color: #fca5a5;
          font-size: 11px;
        }

        .db-request {
          display: flex;
          gap: 10px;
          padding: 13px 14px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .db-request-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#6366f1,#22d3ee);
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .db-request-copy {
          min-width: 0;
          flex: 1;
        }

        .db-request-copy > strong,
        .db-request-copy > span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .db-request-copy > strong {
          color: #e2e8f0;
          font-size: 12px;
        }

        .db-request-copy > span {
          margin-top: 3px;
          color: rgba(148,163,184,.62);
          font-size: 10px;
        }

        .db-request-copy > div {
          display: flex;
          gap: 7px;
          margin-top: 9px;
        }

        .db-request-copy button {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .db-request-copy .accept {
          border: 1px solid rgba(34,197,94,.35);
          background: rgba(34,197,94,.10);
          color: #86efac;
        }

        .db-request-copy .reject {
          border: 1px solid rgba(248,113,113,.30);
          background: rgba(248,113,113,.08);
          color: #fca5a5;
        }

        .db-main {
          flex: 1;
          min-width: 0;
          padding: 22px;
        }

        .db-main-surface {
          min-height: calc(100svh - 108px);
          padding: 24px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.055);
          background: rgba(10,15,29,.58);
          box-shadow: 0 24px 64px rgba(0,0,0,.20);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }

        .db-empty-content {
          min-height: 55vh;
          display: grid;
          place-items: center;
          text-align: center;
          color: rgba(148,163,184,.58);
        }

        button:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(103,232,249,.72);
          outline-offset: 2px;
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,.22);
          border-radius: 99px;
        }

        @media (max-width: 1100px) {
          .db-profile-cta-text { display: none; }
          .db-profile-cta {
            width: 40px;
            padding: 0;
            justify-content: center;
          }
        }

        @media (max-width: 900px) {
          .db-sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            width: min(82vw,300px) !important;
            transform: translateX(-105%);
            z-index: 100;
            box-shadow: 24px 0 70px rgba(0,0,0,.55);
          }

          .db-sidebar.mobile-open {
            transform: translateX(0);
          }

          .db-sidebar .db-brand-name,
          .db-sidebar .db-nav-label {
            display: inline;
          }

          .db-sidebar .db-nav-item {
            justify-content: flex-start;
            padding: 0 13px;
          }

          .db-sidebar-footer { display: none; }

          .db-mobile-close {
            display: grid;
            place-items: center;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.07);
            background: rgba(255,255,255,.035);
            color: #cbd5e1;
            cursor: pointer;
          }

          .db-backdrop {
            position: fixed;
            inset: 0;
            z-index: 90;
            border: 0;
            background: rgba(2,6,23,.68);
            backdrop-filter: blur(3px);
          }

          .db-backdrop.show { display: block; }

          .db-mobile-menu {
            display: grid;
            place-items: center;
            flex: 0 0 auto;
          }

          .db-search {
            flex: 1;
            width: auto;
          }

          .db-main { padding: 16px; }

          .db-main-surface {
            min-height: calc(100svh - 96px);
            padding: 18px;
            border-radius: 18px;
          }
        }

        @media (max-width: 700px) {
          .db-topbar {
            min-height: auto;
            padding: 10px 12px;
            gap: 9px;
            flex-wrap: wrap;
          }

          .db-mobile-menu { order: 1; }

          .db-top-actions {
            order: 2;
            margin-left: auto;
          }

          .db-search {
            order: 3;
            flex-basis: 100%;
            width: 100%;
          }

          .db-profile-cta,
          .db-user-copy,
          .db-chevron {
            display: none;
          }

          .db-user-btn {
            width: 40px;
            height: 40px;
            padding: 3px;
            justify-content: center;
          }

          .db-user-avatar {
            width: 32px;
            height: 32px;
          }

          .db-profile-menu {
            position: fixed;
            top: 66px;
            right: 12px;
          }

          .db-notification-menu {
            position: fixed;
            top: 66px;
            left: 12px;
            right: 12px;
            width: auto;
          }

          .db-main { padding: 10px; }

          .db-main-surface {
            min-height: calc(100svh - 118px);
            padding: 12px;
            border-radius: 16px;
          }
        }

        @media (max-width: 420px) {
          .db-message-btn { display: none; }
          .db-top-actions { gap: 5px; }

          .db-main { padding: 0; }

          .db-main-surface {
            padding: 10px;
            border-left: 0;
            border-right: 0;
            border-radius: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <div className="db-shell">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="db-content">
          <TopBar onOpenMobile={() => setMobileOpen(true)} />

          <main className="db-main">
            <section className="db-main-surface">
              {children ?? (
                <div className="db-empty-content">
                  <div>🤝<br />Your content goes here</div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </>
  )
}
