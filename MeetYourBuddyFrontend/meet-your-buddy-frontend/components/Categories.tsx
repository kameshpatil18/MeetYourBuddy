'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

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

/**
 * Curated, category-specific imagery.
 * Each entry is a real, distinct photo chosen for that activity/interest —
 * not a generic stock-fitness shot reused everywhere.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  travel:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=82',
  photography:
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=82',
  sports:
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=82',
  fitness:
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=82',
  gym:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=82',
  weightlifting:
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=82',
  crossfit:
    'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&w=1200&q=82',
  running:
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=82',
  yoga:
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=82',
  cycling:
    'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=82',
  swimming:
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=82',
  hiking:
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=82',
  climbing:
    'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=82',
  boxing:
    'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=1200&q=82',
  martialarts:
    'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=1200&q=82',
  tennis:
    'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?auto=format&fit=crop&w=1200&q=82',
  basketball:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=82',
  football:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=82',
  soccer:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=82',
  music:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=82',
  movies:
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=82',
  gaming:
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=82',
  books:
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=82',
  reading:
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=82',
  food:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=82',
  cooking:
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82',
  technology:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=82',
  tech:
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=82',
  coding:
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=82',
  art:
    'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=82',
  dance:
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=82',
  nature:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=82',
  outdoors:
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=82',
  pets:
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=82',
  wellness:
    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=82',
  meditation:
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=82',
  fashion:
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=82',
  default:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=82',
}

// Longer keys first so more specific phrases ("weightlifting") win over
// shorter substrings ("lift") when matching loosely-named categories.
const CATEGORY_IMAGE_KEYS = Object.keys(CATEGORY_IMAGES)
  .filter((key) => key !== 'default')
  .sort((a, b) => b.length - a.length)

const CATEGORY_ACCENTS = [
  ['#6366f1', '#22d3ee'],
  ['#f472b6', '#fb923c'],
  ['#34d399', '#22d3ee'],
  ['#a78bfa', '#60a5fa'],
  ['#fbbf24', '#f472b6'],
  ['#60a5fa', '#34d399'],
] as const

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

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getCategoryImage(name: string): string {
  const normalized = normalizeKey(name)

  if (CATEGORY_IMAGES[normalized]) return CATEGORY_IMAGES[normalized]

  const partialKey = CATEGORY_IMAGE_KEYS.find((key) => normalized.includes(key))
  return partialKey ? CATEGORY_IMAGES[partialKey] : CATEGORY_IMAGES.default
}

function getCategoryAccent(index: number): readonly [string, string] {
  return CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length]
}

function getCategoryEmoji(category: Category): string {
  if (category.icon) {
    const cleanIcon = category.icon.split('.')[0]?.trim()
    if (cleanIcon) return cleanIcon
  }

  const name = category.name.toLowerCase()
  if (name.includes('travel')) return '✈️'
  if (name.includes('photo')) return '📷'
  if (name.includes('weight') || name.includes('gym') || name.includes('lift')) return '🏋️'
  if (name.includes('crossfit')) return '🔥'
  if (name.includes('run')) return '🏃'
  if (name.includes('yoga')) return '🧘'
  if (name.includes('cycl') || name.includes('bike')) return '🚴'
  if (name.includes('swim')) return '🏊'
  if (name.includes('hik') || name.includes('trek')) return '🥾'
  if (name.includes('climb')) return '🧗'
  if (name.includes('box')) return '🥊'
  if (name.includes('martial')) return '🥋'
  if (name.includes('tennis')) return '🎾'
  if (name.includes('basketball')) return '🏀'
  if (name.includes('football') || name.includes('soccer')) return '⚽'
  if (name.includes('sport')) return '🏆'
  if (name.includes('fitness')) return '💪'
  if (name.includes('music')) return '🎵'
  if (name.includes('movie') || name.includes('film')) return '🎬'
  if (name.includes('game')) return '🎮'
  if (name.includes('book') || name.includes('read')) return '📚'
  if (name.includes('food') || name.includes('cook')) return '🍜'
  if (name.includes('tech') || name.includes('coding')) return '💻'
  if (name.includes('art')) return '🎨'
  if (name.includes('dance')) return '💃'
  if (name.includes('meditat') || name.includes('wellness')) return '🧠'
  if (name.includes('nature') || name.includes('outdoor')) return '🌿'
  if (name.includes('fashion')) return '👗'
  if (name.includes('pet') || name.includes('animal')) return '🐾'
  return '✨'
}

function CategoryCard({
  category,
  selected,
  onSelect,
  index,
}: {
  category: Category
  selected: boolean
  onSelect: () => void
  index: number
}) {
  const canSelect = typeof category.id === 'number'
  const image = getCategoryImage(category.name)
  const [accentFrom, accentTo] = getCategoryAccent(index)

  return (
    <Box
      component="button"
      type="button"
      onClick={canSelect ? onSelect : undefined}
      disabled={!canSelect}
      aria-pressed={selected}
      className="category-card"
      sx={{
        appearance: 'none',
        width: '100%',
        p: 0,
        border: 'none',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        position: 'relative',
        minHeight: 300,
        borderRadius: '22px',
        overflow: 'hidden',
        cursor: canSelect ? 'pointer' : 'default',
        background: '#0a0f1c',
        outline: selected ? `2px solid ${accentFrom}` : '1px solid rgba(255,255,255,0.08)',
        outlineOffset: selected ? '2px' : 0,
        boxShadow: selected
          ? `0 24px 60px -12px ${accentFrom}55`
          : '0 14px 38px rgba(0,0,0,0.28)',
        transform: selected ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, outline-color .3s ease',
        animation: 'cardIn .5s cubic-bezier(.2,.8,.2,1) both',
        animationDelay: `${index * 0.04}s`,
        '&:hover': canSelect
          ? {
              transform: selected ? 'translateY(-6px)' : 'translateY(-4px)',
              boxShadow: selected
                ? `0 28px 66px -12px ${accentFrom}66`
                : '0 20px 48px rgba(0,0,0,0.36)',
              '& .category-image': { transform: 'scale(1.08)' },
              '& .category-glow': { opacity: 1 },
            }
          : undefined,
        '&:focus-visible': {
          outline: '3px solid #22d3ee',
          outlineOffset: '3px',
        },
      }}
    >
      <Box
        className="category-image"
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.01)',
          transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
        }}
      />

      {/* Duotone / brand-tinted wash so every image feels part of one system */}
      <Box
        className="category-glow"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: selected ? 0.9 : 0.55,
          mixBlendMode: 'color',
          background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
          transition: 'opacity .3s ease',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: selected
            ? 'linear-gradient(180deg, rgba(10,15,28,0.10) 8%, rgba(10,15,28,0.62) 52%, rgba(10,15,28,0.97) 100%)'
            : 'linear-gradient(180deg, rgba(2,6,23,0.08) 6%, rgba(2,6,23,0.56) 52%, rgba(2,6,23,0.95) 100%)',
          transition: 'background .25s ease',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 300,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: '14px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.35rem',
              background: 'rgba(10,15,28,.6)',
              border: '1px solid rgba(255,255,255,.16)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 10px 30px rgba(0,0,0,.24)',
            }}
          >
            {getCategoryEmoji(category)}
          </Box>

          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: selected
                ? `linear-gradient(135deg, ${accentFrom}, ${accentTo})`
                : 'rgba(10,15,28,.6)',
              border: selected
                ? '1px solid rgba(255,255,255,.45)'
                : '1px solid rgba(255,255,255,.18)',
              backdropFilter: 'blur(14px)',
              transition: 'all .2s ease',
            }}
          >
            {selected ? (
              <CheckRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            ) : (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.75)' }} />
            )}
          </Box>
        </Stack>

        <Box>
          <Typography
            sx={{
              fontFamily: "'Space Grotesk','Outfit',sans-serif",
              fontSize: '1.16rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#fff',
              textShadow: '0 2px 18px rgba(0,0,0,.45)',
            }}
          >
            {category.name}
          </Typography>

          <Typography
            sx={{
              mt: 0.7,
              fontFamily: "'Inter','Outfit',sans-serif",
              fontSize: '0.82rem',
              lineHeight: 1.55,
              color: 'rgba(226,232,240,.85)',
              maxWidth: '95%',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {category.description || 'Meet people who enjoy the same kind of moments you do.'}
          </Typography>

          <Typography
            component="span"
            sx={{
              mt: 1.7,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.7,
              px: 1.25,
              py: 0.6,
              borderRadius: '999px',
              fontFamily: "'Inter','Outfit',sans-serif",
              fontSize: '0.69rem',
              fontWeight: 700,
              letterSpacing: '.03em',
              color: selected ? '#fff' : 'rgba(226,232,240,.86)',
              bgcolor: selected ? `${accentFrom}40` : 'rgba(10,15,28,.55)',
              border: selected ? `1px solid ${accentFrom}88` : '1px solid rgba(255,255,255,.12)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {selected ? 'Selected' : 'Tap to select'}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function SkeletonCard() {
  return (
    <Box
      sx={{
        minHeight: 300,
        borderRadius: '22px',
        border: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(255,255,255,.025)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, animation: 'pulse 1.5s ease-in-out infinite', bgcolor: 'rgba(255,255,255,.025)' }} />
      <Stack sx={{ position: 'relative', height: '100%', minHeight: 300, p: 2.5 }} justifyContent="space-between">
        <Box sx={{ width: 46, height: 46, borderRadius: '14px', bgcolor: 'rgba(255,255,255,.07)' }} />
        <Box>
          <Box sx={{ width: '52%', height: 17, borderRadius: 1, bgcolor: 'rgba(255,255,255,.08)', mb: 1.2 }} />
          <Box sx={{ width: '88%', height: 10, borderRadius: 1, bgcolor: 'rgba(255,255,255,.05)', mb: 0.8 }} />
          <Box sx={{ width: '70%', height: 10, borderRadius: 1, bgcolor: 'rgba(255,255,255,.05)' }} />
        </Box>
      </Stack>
    </Box>
  )
}

export default function Categories() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMsg, setSnackbarMsg] = useState('')
  const [snackbarSev, setSnackbarSev] = useState<'success' | 'error'>('success')

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId),
    [categories, selectedId],
  )

  const filteredCategories = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return categories
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(trimmed) ||
        (category.description ?? '').toLowerCase().includes(trimmed),
    )
  }, [categories, query])

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

  const selectCategory = (id?: number) => {
    if (typeof id !== 'number') return
    setSelectedId(id)
  }

  const handleSave = async () => {
    if (selectedId === null) {
      showSnackbar('Please choose one category to continue.', 'error')
      return
    }

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
        // Keep the existing backend request shape, but send only one category.
        body: JSON.stringify({ categoryIds: [selectedId] }),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      const result: ApiResponse<unknown> = await response.json()

      if (!response.ok || result.code !== 1) {
        throw new Error(result.message || 'Failed to save category.')
      }

      showSnackbar(result.message || 'Category saved successfully.', 'success')

      setTimeout(() => {
        router.push(`/usersfilters?categoryIds=${selectedId}`)
      }, 900)
    } catch (error: any) {
      console.error('Error saving category:', error)
      showSnackbar(error?.message || 'Failed to save category.', 'error')
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
        transition: 'opacity .4s ease, transform .4s ease',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: .42; }
        }
        @media (prefers-reduced-motion: reduce) {
          .category-card { animation: none !important; transition: none !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: -90,
            right: -90,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,.18), transparent 68%)',
            filter: 'blur(8px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 400,
            left: -130,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,114,182,.10), transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
      </Box>

      <Stack spacing={3.2} sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '28px',
            minHeight: { xs: 270, md: 320 },
            border: '1px solid rgba(255,255,255,.08)',
            boxShadow: '0 22px 70px rgba(0,0,0,.32)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1800&q=85")',
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%',
              transform: 'scale(1.02)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(2,6,23,.97) 0%, rgba(2,6,23,.86) 46%, rgba(2,6,23,.34) 100%), linear-gradient(0deg, rgba(2,6,23,.7), transparent 55%)',
            }}
          />

          <Stack
            sx={{ position: 'relative', zIndex: 1, minHeight: { xs: 270, md: 320 }, p: { xs: 3, md: 5 } }}
            justifyContent="center"
            alignItems="flex-start"
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.4,
                py: 0.7,
                mb: 2,
                borderRadius: '999px',
                bgcolor: 'rgba(99,102,241,.16)',
                border: '1px solid rgba(165,180,252,.22)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: '#a5b4fc' }} />
              <Typography
                sx={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: '.71rem',
                  fontWeight: 700,
                  letterSpacing: '.09em',
                  textTransform: 'uppercase',
                  color: '#c7d2fe',
                }}
              >
                Find your people
              </Typography>
            </Box>

            <Typography
              sx={{
                maxWidth: 680,
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: { xs: '2rem', md: '3.25rem' },
                lineHeight: 1.02,
                fontWeight: 700,
                letterSpacing: '-.03em',
                color: '#f8fafc',
                textShadow: '0 8px 30px rgba(0,0,0,.28)',
              }}
            >
              What are you most into?
            </Typography>

            <Typography
              sx={{
                mt: 1.4,
                maxWidth: 560,
                fontFamily: "'Inter',sans-serif",
                fontSize: { xs: '.9rem', md: '1rem' },
                lineHeight: 1.65,
                color: 'rgba(203,213,225,.8)',
              }}
            >
              Pick one main category. We’ll use it to start showing you buddies with the closest interests and vibe.
            </Typography>

            {!loading && categories.length > 0 && (
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories, e.g. running, yoga, gaming…"
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                  mt: 3,
                  maxWidth: 420,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    bgcolor: 'rgba(10,15,28,.55)',
                    backdropFilter: 'blur(14px)',
                    color: '#f1f5f9',
                    fontFamily: "'Inter',sans-serif",
                    fontSize: '.88rem',
                    '& fieldset': { borderColor: 'rgba(255,255,255,.14)' },
                    '&:hover fieldset': { borderColor: 'rgba(165,180,252,.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(226,232,240,.5)',
                    opacity: 1,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 19, color: 'rgba(226,232,240,.55)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        sx={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: 'none',
                          bgcolor: 'rgba(255,255,255,.08)',
                          color: 'rgba(226,232,240,.8)',
                          cursor: 'pointer',
                        }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </Box>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            )}
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: '1.15rem',
                color: '#f1f5f9',
              }}
            >
              Explore categories
              {!loading && categories.length > 0 && (
                <Typography
                  component="span"
                  sx={{
                    ml: 1,
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 600,
                    fontSize: '.78rem',
                    color: 'rgba(148,163,184,.6)',
                  }}
                >
                  {filteredCategories.length} of {categories.length}
                </Typography>
              )}
            </Typography>
            <Typography sx={{ mt: .35, fontFamily: "'Inter',sans-serif", fontSize: '.82rem', color: 'rgba(148,163,184,.62)' }}>
              You can choose only one category at a time.
            </Typography>
          </Box>

          {selectedCategory && (
            <Box
              sx={{
                px: 1.6,
                py: .9,
                borderRadius: '999px',
                bgcolor: 'rgba(99,102,241,.12)',
                border: '1px solid rgba(129,140,248,.23)',
              }}
            >
              <Typography sx={{ fontFamily: "'Inter',sans-serif", fontSize: '.76rem', fontWeight: 700, color: '#c7d2fe' }}>
                Selected: {selectedCategory.name}
              </Typography>
            </Box>
          )}
        </Stack>

        {loading ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
              gap: 2.2,
            }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </Box>
        ) : categories.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,.06)',
              bgcolor: 'rgba(255,255,255,.02)',
            }}
          >
            <Typography sx={{ fontSize: '2.4rem' }}>🧭</Typography>
            <Typography sx={{ mt: 1, fontFamily: "'Inter',sans-serif", color: 'rgba(148,163,184,.62)' }}>
              No categories found.
            </Typography>
          </Box>
        ) : filteredCategories.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,.06)',
              bgcolor: 'rgba(255,255,255,.02)',
            }}
          >
            <Typography sx={{ fontSize: '2.4rem' }}>🔍</Typography>
            <Typography sx={{ mt: 1, fontFamily: "'Inter',sans-serif", color: 'rgba(148,163,184,.62)' }}>
              No categories match “{query}”.
            </Typography>
            <Button
              onClick={() => setQuery('')}
              sx={{ mt: 1.5, textTransform: 'none', fontFamily: "'Inter',sans-serif", color: '#a5b4fc' }}
            >
              Clear search
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
              gap: 2.2,
            }}
          >
            {filteredCategories.map((category, index) => (
              <CategoryCard
                key={`${category.id ?? 'no-id'}-${category.name}-${index}`}
                category={category}
                selected={typeof category.id === 'number' && category.id === selectedId}
                onSelect={() => selectCategory(category.id)}
                index={index}
              />
            ))}
          </Box>
        )}

        {!loading && categories.length > 0 && (
          <Box
            sx={{
              position: 'sticky',
              bottom: 18,
              zIndex: 10,
              borderRadius: '20px',
              px: { xs: 2, sm: 2.5 },
              py: 1.6,
              border: '1px solid rgba(255,255,255,.09)',
              background: 'rgba(7,12,24,.88)',
              backdropFilter: 'blur(22px)',
              boxShadow: '0 18px 50px rgba(0,0,0,.38)',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.6}
            >
              <Box>
                <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '.88rem', color: '#e2e8f0' }}>
                  {selectedCategory ? selectedCategory.name : 'Choose your main category'}
                </Typography>
                <Typography sx={{ mt: .25, fontFamily: "'Inter',sans-serif", fontSize: '.74rem', color: 'rgba(148,163,184,.56)' }}>
                  {selectedCategory
                    ? 'Looks good. Continue to discover matching buddies.'
                    : 'Select one card above to continue.'}
                </Typography>
              </Box>

              <Button
                onClick={handleSave}
                disabled={saving || selectedId === null}
                endIcon={!saving && <ArrowForwardRoundedIcon />}
                variant="contained"
                sx={{
                  minWidth: { sm: 185 },
                  height: 48,
                  px: 3,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontFamily: "'Inter',sans-serif",
                  fontWeight: 800,
                  fontSize: '.9rem',
                  color: '#fff',
                  background:
                    selectedId !== null
                      ? 'linear-gradient(135deg,#6366f1 0%,#3b82f6 58%,#22d3ee 100%)'
                      : 'rgba(99,102,241,.18)',
                  boxShadow: selectedId !== null ? '0 12px 30px rgba(79,70,229,.34)' : 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg,#4f46e5 0%,#2563eb 58%,#06b6d4 100%)',
                    boxShadow: '0 16px 36px rgba(79,70,229,.42)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,.34)',
                    background: 'rgba(99,102,241,.14)',
                  },
                }}
              >
                {saving ? (
                  <CircularProgress size={19} thickness={5} sx={{ color: 'rgba(255,255,255,.72)' }} />
                ) : (
                  'Continue'
                )}
              </Button>
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
            fontFamily: "'Inter',sans-serif",
            fontSize: '.87rem',
            fontWeight: 500,
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,.45)',
            ...(snackbarSev === 'success' && {
              background: 'linear-gradient(135deg,#14532d,#166534)',
            }),
            ...(snackbarSev === 'error' && {
              background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
            }),
          }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  )
}