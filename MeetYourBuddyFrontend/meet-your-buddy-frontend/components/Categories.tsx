'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

type CategoryApiItem = {
  Id?: number
  Name?: string
  Description?: string
  Icon?: string
}

type Category = {
  id?: number
  name: string
  description?: string
  icon?: string
}

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

const GATEWAY_BASE_URL = 'https://localhost:7152'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()!.split(';').shift()!)
  }

  return ''
}

function getAuthHeaders(): HeadersInit {
  const token = getCookie('token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function CategoryCard({
  category,
  selected,
  onToggle,
  index,
}: {
  category: Category
  selected: boolean
  onToggle: () => void
  index: number
}) {
  const [hovered, setHovered] = useState(false)
  const canSelect = typeof category.id === 'number'

  return (
    <div
      onClick={canSelect ? onToggle : undefined}
      onMouseEnter={() => canSelect && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '1.5rem',
        minHeight: '170px',
        cursor: canSelect ? 'pointer' : 'default',
        border: `1.5px solid ${
          selected
            ? 'rgba(99,102,241,0.5)'
            : hovered
            ? 'rgba(99,102,241,0.25)'
            : 'rgba(255,255,255,0.06)'
        }`,
        background: selected
          ? 'linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(34,211,238,0.09) 100%)'
          : hovered
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.025)',
        boxShadow: selected
          ? '0 16px 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.06)'
          : hovered
          ? '0 8px 24px rgba(0,0,0,0.2)'
          : 'none',
        transform: hovered && !selected ? 'translateY(-3px)' : selected ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '1rem',
        animation: `cardIn 0.4s ease both`,
        animationDelay: `${index * 0.045}s`,
        overflow: 'hidden',
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent)',
            borderRadius: '20px',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            background: selected
              ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
              : 'rgba(255,255,255,0.06)',
            boxShadow: selected ? '0 6px 18px rgba(99,102,241,0.35)' : 'none',
            transition: 'all 0.22s ease',
            flexShrink: 0,
          }}
        >
          {category.icon ? category.icon.split('.')[0] : '✨'}
        </div>

        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `2px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
            background: selected ? 'linear-gradient(135deg, #6366f1, #22d3ee)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.22s ease',
            flexShrink: 0,
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5L4 7L8 3"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      <div>
        <p
          style={{
            margin: '0 0 5px',
            fontFamily: "'Syne', 'Outfit', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: selected ? '#f8fafc' : '#e2e8f0',
            transition: 'color 0.2s',
          }}
        >
          {category.name}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.78rem',
            lineHeight: 1.55,
            color: 'rgba(148,163,184,0.6)',
          }}
        >
          {category.description || 'Connect with buddies who share this vibe.'}
        </p>
      </div>

      <div
        style={{
          alignSelf: 'flex-start',
          padding: '3px 10px',
          borderRadius: '999px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          background: selected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
          color: selected ? '#a5b4fc' : 'rgba(148,163,184,0.45)',
          transition: 'all 0.2s',
        }}
      >
        {selected ? '✓ Selected' : 'Tap to select'}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: '20px',
        padding: '1.5rem',
        minHeight: '170px',
        border: '1.5px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.05)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '14px',
          borderRadius: '6px',
          width: '60%',
          background: 'rgba(255,255,255,0.05)',
          animation: 'pulse 1.5s ease-in-out infinite 0.1s',
        }}
      />
      <div
        style={{
          height: '10px',
          borderRadius: '6px',
          width: '85%',
          background: 'rgba(255,255,255,0.04)',
          animation: 'pulse 1.5s ease-in-out infinite 0.2s',
        }}
      />
      <div
        style={{
          height: '10px',
          borderRadius: '6px',
          width: '70%',
          background: 'rgba(255,255,255,0.04)',
          animation: 'pulse 1.5s ease-in-out infinite 0.3s',
        }}
      />
    </div>
  )
}

export default function Categories() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMsg, setSnackbarMsg] = useState('')
  const [snackbarSev, setSnackbarSev] = useState<'success' | 'error'>('success')

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds])

  useEffect(() => {
    setMounted(true)
    void loadCategories()
  }, [])

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMsg(message)
    setSnackbarSev(severity)
    setSnackbarOpen(true)
  }

  const handleUnauthorized = () => {
    showSnackbar('Session expired. Please login again.', 'error')
    setTimeout(() => router.push('/login'), 1200)
  }

  const loadCategories = async () => {
    try {
      setLoading(true)

      const token = getCookie('token')
      if (!token) {
        handleUnauthorized()
        return
      }

      const response = await fetch(`${GATEWAY_BASE_URL}/gateway/category/getall`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`)
      }

      const result: ApiResponse<CategoryApiItem[]> = await response.json()

      if (result.code !== 1) {
        throw new Error(result.message || 'Unable to load categories.')
      }

      const mapped: Category[] = Array.isArray(result.data)
        ? result.data
            .filter((item) => item && typeof item.Name === 'string')
            .map((item) => ({
              id: item.Id,
              name: item.Name ?? '',
              description: item.Description ?? '',
              icon: item.Icon ?? '',
            }))
        : []

      setCategories(mapped)
    } catch (error) {
      console.error('Error loading categories:', error)
      showSnackbar('Failed to load categories.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (id?: number) => {
    if (typeof id !== 'number') return
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

 const handleSave = async () => {
  const token = getCookie('token')

  if (!token) {
    handleUnauthorized()
    return
  }

  try {
    setSaving(true)

    const response = await fetch(`${GATEWAY_BASE_URL}/gateway/category/save-user-categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ categoryIds: selectedIds }),
    })

    if (response.status === 401) {
      handleUnauthorized()
      return
    }

    const result: ApiResponse<unknown> = await response.json()

    if (!response.ok || result.code !== 1) {
      throw new Error(result.message || 'Failed to save preferences.')
    }

    showSnackbar(result.message || 'Preferences saved successfully.', 'success')

    setTimeout(() => {
      router.push(`/usersfilters?categoryIds=${selectedIds.join(',')}`)
    }, 1200)
  } catch (error: any) {
    console.error('Error saving preferences:', error)
    showSnackbar(error?.message || 'Failed to save preferences.', 'error')
  } finally {
    setSaving(false)
  }
}
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100%',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-40px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
      </div>

      <Stack spacing={3.5} sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            position: 'relative',
            borderRadius: '22px',
            padding: { xs: '1.8rem', md: '2.4rem 3rem' },
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(135deg, rgba(12,18,35,0.92) 0%, rgba(8,12,24,0.85) 100%)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '5%',
              right: '5%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(129,140,248,0.5), rgba(34,211,238,0.4), transparent)',
              borderRadius: '999px',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: '-30%',
              right: '-5%',
              width: '350px',
              height: '350px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            spacing={2.5}
            sx={{ position: 'relative' }}
          >
            <Box>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '999px',
                  mb: 1.5,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.22)',
                }}
              >
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8' }} />
                <Typography
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#a5b4fc',
                  }}
                >
                  Your Interests
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontFamily: "'Syne', 'Outfit', sans-serif",
                  fontSize: { xs: '1.6rem', md: '2.2rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.05,
                  background: 'linear-gradient(100deg, #e2e8f0 20%, #a5b4fc 55%, #67e8f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Pick the vibes you're into
              </Typography>

              <Typography
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  color: 'rgba(148,163,184,0.6)',
                  fontSize: { xs: '0.87rem', md: '0.93rem' },
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                Choose as many as you like — we'll use these to find buddies who actually
                match your energy and interests.
              </Typography>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                textAlign: 'center',
                px: 3,
                py: 2,
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                minWidth: 130,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Syne', 'Outfit', sans-serif",
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  background:
                    selectedCount > 0
                      ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
                      : 'rgba(148,163,184,0.3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {selectedCount}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'rgba(148,163,184,0.45)',
                  mt: 0.3,
                }}
              >
                Selected
              </Typography>
            </Box>
          </Stack>
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
              gap: 2,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </Box>
        ) : categories.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🤔</Typography>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", color: 'rgba(148,163,184,0.5)' }}>
              No categories found.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
              gap: 2,
            }}
          >
            {categories.map((category, index) => (
              <CategoryCard
                key={`${category.id ?? 'no-id'}-${category.name}-${index}`}
                category={category}
                selected={typeof category.id === 'number' && selectedIds.includes(category.id)}
                onToggle={() => toggleCategory(category.id)}
                index={index}
              />
            ))}
          </Box>
        )}

        {!loading && categories.length > 0 && (
          <Box
            sx={{
              position: 'relative',
              borderRadius: '18px',
              px: { xs: 2.5, md: 3.5 },
              py: 2,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(12,18,35,0.8)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: selectedCount > 0 ? '#e2e8f0' : 'rgba(148,163,184,0.45)',
                  }}
                >
                  {selectedCount === 0
                    ? 'Select at least one category to continue'
                    : `${selectedCount} interest${selectedCount > 1 ? 's' : ''} selected`}
                </Typography>
                {selectedCount > 0 && (
                  <Typography
                    sx={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '0.75rem',
                      color: 'rgba(148,163,184,0.45)',
                      mt: 0.3,
                    }}
                  >
                    You can always update these from your profile settings
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
                <Button
                  onClick={() => setSelectedIds([])}
                  disabled={saving || selectedCount === 0}
                  sx={{
                    height: 44,
                    px: 2.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: selectedCount === 0 ? 'rgba(100,116,139,0.3)' : '#94a3b8',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    '&:hover': { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' },
                    '&.Mui-disabled': {
                      color: 'rgba(100,116,139,0.25)',
                      borderColor: 'rgba(255,255,255,0.04)',
                    },
                  }}
                >
                  Clear all
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || selectedCount === 0}
                  endIcon={!saving && <ArrowForwardRoundedIcon sx={{ fontSize: '0.95rem !important' }} />}
                  variant="contained"
                  sx={{
                    height: 44,
                    px: 3,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    letterSpacing: '0.02em',
                    color: '#fff',
                    background:
                      selectedCount > 0
                        ? 'linear-gradient(135deg, #6366f1 0%, #3b82f6 55%, #22d3ee 100%)'
                        : 'rgba(99,102,241,0.22)',
                    boxShadow: selectedCount > 0 ? '0 10px 28px rgba(99,102,241,0.3)' : 'none',
                    border: '1px solid',
                    borderColor: selectedCount > 0 ? 'transparent' : 'rgba(99,102,241,0.15)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f60ef 0%, #2563eb 55%, #22d3ee 100%)',
                      boxShadow: '0 16px 38px rgba(99,102,241,0.45)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': { transform: 'translateY(0)' },
                    '&.Mui-disabled': {
                      color: 'rgba(255,255,255,0.35)',
                      background: 'rgba(99,102,241,0.15)',
                      boxShadow: 'none',
                      borderColor: 'rgba(99,102,241,0.1)',
                    },
                  }}
                >
                  {saving ? (
                    <CircularProgress size={18} thickness={5} sx={{ color: 'rgba(255,255,255,0.65)' }} />
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Stack>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 1 }}
      >
        <Alert
          severity={snackbarSev}
          variant="filled"
          onClose={() => setSnackbarOpen(false)}
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.87rem',
            fontWeight: 500,
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            ...(snackbarSev === 'success' && {
              background: 'linear-gradient(135deg, #14532d, #166534)',
              border: '1px solid rgba(74,222,128,0.2)',
            }),
            ...(snackbarSev === 'error' && {
              background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              border: '1px solid rgba(248,113,113,0.2)',
            }),
          }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  )
}