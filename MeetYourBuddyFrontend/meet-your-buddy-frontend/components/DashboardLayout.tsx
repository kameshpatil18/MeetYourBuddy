'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

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
  { icon: '⊞', label: 'Discover', href: '/dashboard' },
  { icon: '💬', label: 'Messages', href: '#' },
  { icon: '👥', label: 'Find Buddies', href: '/usersfilters' },
  { icon: '🔔', label: 'Activity', href: '#', badge: 12 },
  { icon: '🗺️', label: 'Explore', href: '#' },
  { icon: '⚙️', label: 'Settings', href: '#' },
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
    if (!href || href === '#') return
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
        cursor: href === '#' ? 'default' : 'pointer',
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
          : hovered && href !== '#'
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
              : hovered && href !== '#'
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
    if (href === '#') return false

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
            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          🤝
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
function TopBar() {
  const router = useRouter()

  const [searchFocused, setSearchFocused] = useState(false)
  const [userName, setUserName] = useState('Kamesh Patil')
  const [userInitial, setUserInitial] = useState('K')
  const [profileOpen, setProfileOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const handleProfileClick = () => {
    setProfileOpen(false)
    router.push('/dashboard')
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
    router.push('/login')
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return ''

      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)

      if (parts.length === 2) {
        return decodeURIComponent(parts.pop()!.split(';').shift()!)
      }

      return ''
    }

    try {
      const rawCookieUser = getCookie('user')
      const rawLocalUser =
        typeof window !== 'undefined' ? localStorage.getItem('user') : null

      const rawUser = rawCookieUser || rawLocalUser

      if (!rawUser) return

      const user = JSON.parse(rawUser)

      const firstName = user.firstName || user.first_name || ''
      const lastName = user.lastName || user.last_name || ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ')

      if (fullName) {
        setUserName(fullName)
        setUserInitial(
          firstName?.[0]?.toUpperCase() || fullName?.[0]?.toUpperCase() || 'K'
        )
      }
    } catch {
      // ignore invalid user data
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
      {/* Search */}
      <div style={{ position: 'relative', width: '260px' }}>
        <span
          style={{
            position: 'absolute',
            left: '11px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.8rem',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>

        <input
          type="text"
          placeholder="Search buddies, chats…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            padding: '8px 14px 8px 34px',
            background: searchFocused
              ? 'rgba(99,102,241,0.07)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${
              searchFocused
                ? 'rgba(99,102,241,0.4)'
                : 'rgba(255,255,255,0.07)'
            }`,
            borderRadius: '10px',
            color: '#e2e8f0',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.82rem',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: searchFocused
              ? '0 0 0 3px rgba(99,102,241,0.1)'
              : 'none',
          }}
        />
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(148,163,184,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            position: 'relative',
            transition: 'all 0.2s',
          }}
        >
          🔔
          <div
            style={{
              position: 'absolute',
              top: '7px',
              right: '7px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#6366f1',
              border: '1.5px solid #060912',
            }}
          />
        </button>

        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255,255,255,0.07)',
          }}
        />

        {/* Profile Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 10px 5px 5px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: profileOpen
                ? '1px solid rgba(255,255,255,0.07)'
                : '1px solid transparent',
              background: profileOpen
                ? 'rgba(255,255,255,0.04)'
                : 'transparent',
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
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#fff',
                fontFamily: "'Outfit', sans-serif",
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              {userInitial}
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  lineHeight: 1.2,
                }}
              >
                {userName}
              </div>

              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.7rem',
                  color: 'rgba(148,163,184,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                  }}
                />
                Online
              </div>
            </div>

            <span
              style={{
                color: 'rgba(148,163,184,0.35)',
                fontSize: '0.72rem',
                marginLeft: '2px',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ▾
            </span>
          </div>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '170px',
                borderRadius: '14px',
                background: '#0b1020',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                padding: '6px',
                zIndex: 999,
              }}
            >
              <button
                type="button"
                onClick={handleProfileClick}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: '#e2e8f0',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                👤 Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: '#f87171',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(248,113,113,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}
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
          color: rgba(100,116,139,0.4);
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