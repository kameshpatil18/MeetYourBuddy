'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Avatar,
  Box,
  Button,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import WcRoundedIcon from '@mui/icons-material/WcRounded'
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded'
import GpsFixedRoundedIcon from '@mui/icons-material/GpsFixedRounded'

type FormState = {
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: string
  city: string
  state: string
  country: string
  bio: string
}

type StateOption = {
  name: string
  state_code?: string
}

type CountryOption = {
  name: string
  iso2?: string
  iso3?: string
  states: StateOption[]
}

const API_BASE_URL = 'https://localhost:7152/gateway/profile'
const LOCATION_API_BASE = 'https://countriesnow.space/api/v0.1'

const STEPS = [
  { title: 'Basic Info', sub: 'Name & identity', icon: <PersonRoundedIcon sx={{ fontSize: 16 }} /> },
  { title: 'Location', sub: 'Where are you?', icon: <LocationOnRoundedIcon sx={{ fontSize: 16 }} /> },
  { title: 'Photo', sub: 'Put a face to it', icon: <PhotoCameraRoundedIcon sx={{ fontSize: 16 }} /> },
  { title: 'Finish', sub: 'Bio & submit', icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} /> },
]

const darkFieldSx = {
  '& .MuiInputLabel-root': {
    color: 'rgba(148,163,184,0.68)',
    fontSize: '0.9rem',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#a5b4fc',
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 58,
    height: 58,
    color: '#f8fafc',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.04)',
    transition: 'all 0.25s ease',
    display: 'flex',
    alignItems: 'center',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.10)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(129,140,248,0.38)',
    },
    '&.Mui-focused': {
      background: 'rgba(99,102,241,0.05)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#818cf8',
      boxShadow: '0 0 0 4px rgba(99,102,241,0.10)',
    },
    '& input': {
      color: '#f8fafc',
      height: '58px',
      padding: '0 14px',
      boxSizing: 'border-box',
    },
    '& textarea': {
      color: '#f8fafc',
      lineHeight: 1.6,
      paddingTop: 0,
    },
    '& .MuiSelect-select': {
      display: 'flex',
      alignItems: 'center',
      minHeight: '58px !important',
      padding: '0 14px !important',
      boxSizing: 'border-box',
    },
    '& .MuiInputAdornment-root': {
      marginRight: 2,
      marginLeft: 0.5,
    },
    '& input[type="date"]': {
      minHeight: '58px',
      padding: '0 14px',
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px rgba(255,255,255,0.04) inset',
      WebkitTextFillColor: '#f8fafc',
      caretColor: '#f8fafc',
      borderRadius: '18px',
      transition: 'background-color 5000s ease-in-out 0s',
    },
  },
  '& .MuiOutlinedInput-root.MuiInputBase-multiline': {
    minHeight: 'unset',
    height: 'auto',
    alignItems: 'flex-start',
    padding: '14px 16px',
  },
  '& .MuiInputBase-inputMultiline': {
    padding: 0,
    lineHeight: 1.65,
    fontSize: '0.95rem',
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(148,163,184,0.55)',
  },
} as const

const glassSx = {
  position: 'relative' as const,
  borderRadius: '24px',
  border: '1px solid rgba(255,255,255,0.06)',
  background:
    'linear-gradient(180deg, rgba(12,18,35,0.92) 0%, rgba(8,12,24,0.85) 100%)',
  backdropFilter: 'blur(18px)',
  boxShadow:
    '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
  overflow: 'hidden',
} as const

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          width: 34,
          height: 3,
          borderRadius: '999px',
          mb: 1.5,
          background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
        }}
      />
      <Typography
        sx={{
          fontSize: { xs: '1.05rem', md: '1.15rem' },
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#f8fafc',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          mt: 0.4,
          fontSize: '0.86rem',
          color: 'rgba(148,163,184,0.62)',
        }}
      >
        {sub}
      </Typography>
    </Box>
  )
}

const extractProfileData = (result: any): any | null => {
  if (!result) return null

  if (result.firstName !== undefined || result.userId !== undefined) {
    return result
  }

  const data = result?.data
  if (!data) return null

  if (data?.profile) return data.profile

  if (Array.isArray(data)) return data.length > 0 ? data[0] : null

  if (data.firstName !== undefined || data.userId !== undefined) return data

  return null
}

const normalizeDate = (value: string | null | undefined): string => {
  if (!value) return ''
  return value.split('T')[0]
}

const mapProfileToForm = (data: any): FormState => ({
  firstName: data?.firstName ?? data?.FirstName ?? '',
  lastName: data?.lastName ?? data?.LastName ?? '',
  gender: data?.gender ?? data?.Gender ?? '',
  dateOfBirth: normalizeDate(data?.dateOfBirth ?? data?.DateOfBirth),
  city: data?.city ?? data?.City ?? '',
  state: data?.state ?? data?.State ?? '',
  country: data?.country ?? data?.Country ?? '',
  bio: data?.bio ?? data?.Bio ?? '',
})

export default function ProfileForm() {
  const router = useRouter()

  const [activeStep, setActiveStep] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [profileImageBase64, setProfileImageBase64] = useState('')

  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileExists, setProfileExists] = useState(false)

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<'success' | 'error'>('success')

  const [userId, setUserId] = useState(0)
  const [token, setToken] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([])
  const [stateOptions, setStateOptions] = useState<StateOption[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])

  const [countryLoading, setCountryLoading] = useState(false)
  const [cityLoading, setCityLoading] = useState(false)

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    city: '',
    state: '',
    country: '',
    bio: '',
  })

  const getCookie = (name: string): string => {
    if (typeof document === 'undefined') return ''
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift()!)
    return ''
  }

  const safeJsonParse = (raw: string): any => {
    try {
      return raw ? JSON.parse(raw) : {}
    } catch {
      return { message: raw }
    }
  }

  const decodeJwtPayload = (jwtToken: string): any | null => {
    try {
      const payload = jwtToken.split('.')[1]
      if (!payload) return null

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )

      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('JWT decode error:', error)
      return null
    }
  }

  const getUserIdFromToken = (jwtToken: string): number => {
    const payload = decodeJwtPayload(jwtToken)
    if (!payload) return 0

    const id =
      payload.sub ||
      payload.userId ||
      payload.UserId ||
      payload.id ||
      payload.Id ||
      payload.nameid ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']

    return Number(id || 0)
  }

  const fetchCountriesAndStates = async () => {
    setCountryLoading(true)

    try {
      const response = await fetch(`${LOCATION_API_BASE}/countries/states`)
      const result = await response.json()

      if (!response.ok || result?.error) {
        throw new Error(result?.msg || 'Failed to load countries.')
      }

      setCountryOptions(result?.data || [])
    } catch (error: any) {
      console.error('Countries API error:', error)
      setSeverity('error')
      setMessage(error?.message || 'Could not load countries.')
      setOpen(true)
    } finally {
      setCountryLoading(false)
    }
  }

  const fetchMyProfile = async (id: number, authToken: string) => {
    if (!id) return

    setProfileLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/me/${id}`, {
        method: 'GET',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })

      const raw = await response.text()
      const result = safeJsonParse(raw)

      console.log('ME API full result:', result)

      const profileData = extractProfileData(result)

      console.log('Extracted profile data:', profileData)

      if (response.ok && profileData) {
        const mappedForm = mapProfileToForm(profileData)

        setProfileExists(true)
        setForm(mappedForm)

        const lat = profileData?.latitude ?? profileData?.Latitude ?? null
        const lng = profileData?.longitude ?? profileData?.Longitude ?? null

        if (lat !== null && lng !== null) {
          setLatitude(Number(lat))
          setLongitude(Number(lng))
        }

        const image =
          profileData?.profileImage ||
          profileData?.ProfileImage ||
          profileData?.profileImageBase64 ||
          profileData?.ProfileImageBase64 ||
          ''

        if (image) {
          setPreview(image)
          setProfileImageBase64(image)
        }
      } else {
        console.warn('No profile data found or request failed. result:', result)
        setProfileExists(false)
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      setProfileExists(false)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    fetchCountriesAndStates()
  }, [])

  useEffect(() => {
    const storedToken = getCookie('token')

    if (!storedToken) {
      setSeverity('error')
      setMessage('Token not found. Please login again.')
      setOpen(true)
      return
    }

    setToken(storedToken)

    const tokenUserId = getUserIdFromToken(storedToken)

    if (!tokenUserId) {
      setSeverity('error')
      setMessage('User id not found in token. Please login again.')
      setOpen(true)
      return
    }

    setUserId(tokenUserId)
  }, [])

  useEffect(() => {
    if (userId && token) {
      fetchMyProfile(userId, token)
    }
  }, [userId, token])

  useEffect(() => {
    if (!form.country || countryOptions.length === 0) {
      setStateOptions([])
      return
    }

    const selectedCountry = countryOptions.find(
      (country) => country.name === form.country
    )

    setStateOptions(selectedCountry?.states || [])
  }, [form.country, countryOptions])

  useEffect(() => {
    const fetchCitiesByState = async () => {
      if (!form.country || !form.state) {
        setCityOptions([])
        return
      }

      setCityLoading(true)

      try {
        const response = await fetch(`${LOCATION_API_BASE}/countries/state/cities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: form.country,
            state: form.state,
          }),
        })

        const result = await response.json()

        if (!response.ok || result?.error) {
          throw new Error(result?.msg || 'Failed to load cities.')
        }

        setCityOptions(result?.data || [])
      } catch (error: any) {
        console.error('Cities API error:', error)
        setCityOptions([])
        setSeverity('error')
        setMessage(error?.message || 'Could not load cities.')
        setOpen(true)
      } finally {
        setCityLoading(false)
      }
    }

    fetchCitiesByState()
  }, [form.country, form.state])

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const completionScore = useMemo(() => {
    let s = 0

    if (form.firstName) s += 12
    if (form.lastName) s += 12
    if (form.gender) s += 12
    if (form.dateOfBirth) s += 12
    if (form.city) s += 10
    if (form.state) s += 10
    if (form.country) s += 10
    if (form.bio) s += 12
    if (preview) s += 10

    return Math.min(s, 100)
  }, [form, preview])

  const stepProgress = ((activeStep + 1) / STEPS.length) * 100

  const handleChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
    }

  const handleCountryChange = (e: any) => {
    const country = e.target.value

    setForm((p) => ({
      ...p,
      country,
      state: '',
      city: '',
    }))

    setStateOptions([])
    setCityOptions([])
  }

  const handleStateChange = (e: any) => {
    const state = e.target.value

    setForm((p) => ({
      ...p,
      state,
      city: '',
    }))

    setCityOptions([])
  }

  const handleCityChange = (e: any) => {
    setForm((p) => ({
      ...p,
      city: e.target.value,
    }))
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    setPreview(URL.createObjectURL(file))

    const reader = new FileReader()

    reader.onloadend = () => {
      setProfileImageBase64(typeof reader.result === 'string' ? reader.result : '')
    }

    reader.readAsDataURL(file)
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    setLocationLoading(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLocationLoading(false)
      },
      (error) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please allow access in your browser settings.',
          2: 'Location unavailable. Try again.',
          3: 'Location request timed out. Try again.',
        }

        setLocationError(msgs[error.code] ?? 'Could not get your location.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const validateBeforeSubmit = (): boolean => {
    if (!userId) {
      setSeverity('error')
      setMessage('User not found. Please login again.')
      setOpen(true)
      return false
    }

    if (!form.firstName || !form.lastName) {
      setSeverity('error')
      setMessage('Please enter first name and last name.')
      setOpen(true)
      return false
    }

    return true
  }

  const handleSubmitProfile = async () => {
    if (!validateBeforeSubmit()) return

    setLoading(true)

    try {
      const payload = {
        userId,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
        city: form.city,
        state: form.state,
        country: form.country,
        bio: form.bio,
        profileImage: profileImageBase64 || '',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }

      const url = profileExists ? `${API_BASE_URL}/update` : `${API_BASE_URL}/create`
      const method = profileExists ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const raw = await response.text()
      const result = safeJsonParse(raw)

      if (response.ok && result?.code === 1) {
        setSeverity('success')
        setMessage(
          result.message ||
            (profileExists ? 'Profile updated successfully' : 'Profile created successfully')
        )
        setOpen(true)

        setTimeout(() => router.push('/categories'), 1200)
      } else {
        setSeverity('error')
        setMessage(result?.message || 'Profile save failed')
        setOpen(true)
      }
    } catch (error: any) {
      console.error('Profile save error:', error)
      setSeverity('error')
      setMessage(error?.message || 'Something went wrong')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handlePrimaryAction = () => {
    if (activeStep === STEPS.length - 1) {
      handleSubmitProfile()
    } else {
      setActiveStep((p) => p + 1)
    }
  }

  const isLastStep = activeStep === STEPS.length - 1

  const scoreColor =
    completionScore >= 80 ? '#4ade80' : completionScore >= 50 ? '#fbbf24' : '#818cf8'

  if (profileLoading) {
    return (
      <Box sx={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Checking your profile...
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -80,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />
      </Box>

      <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: '1.9rem', md: '2.5rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.05,
                  background: 'linear-gradient(100deg, #e2e8f0 20%, #a5b4fc 55%, #67e8f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {profileExists ? 'Update Your Profile' : 'Create Your Profile'}
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: 'rgba(148,163,184,0.62)',
                  fontSize: { xs: '0.9rem', md: '0.96rem' },
                  maxWidth: 580,
                }}
              >
                {profileExists
                  ? 'Your profile details are already available. You can review or update them.'
                  : "Complete your profile first — then we'll show you available buddy categories."}
              </Typography>
            </Box>

            <Paper
              sx={{
                minWidth: { xs: '100%', lg: 250 },
                px: 2.5,
                py: 2,
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Stack spacing={1.2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>
                    Profile strength
                  </Typography>
                  <Typography sx={{ color: scoreColor, fontWeight: 800, fontSize: '0.92rem' }}>
                    {completionScore}%
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={completionScore}
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      background: `linear-gradient(90deg, #6366f1 0%, #3b82f6 50%, ${scoreColor} 100%)`,
                    },
                  }}
                />

                <Typography sx={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem' }}>
                  {completionScore < 50
                    ? 'Add more info to stand out'
                    : completionScore < 80
                      ? 'Looking good — almost there!'
                      : 'Great profile! 🎉'}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        <Paper sx={{ ...glassSx, p: { xs: 2, md: 2.8 } }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
                Onboarding Progress
              </Typography>
              <Typography sx={{ color: 'rgba(99,102,241,0.8)', fontWeight: 700, fontSize: '0.85rem' }}>
                Step {activeStep + 1} / {STEPS.length}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={stepProgress}
              sx={{
                height: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.05)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #6366f1 0%, #3b82f6 50%, #22d3ee 100%)',
                },
              }}
            />

            <Grid container spacing={1.5}>
              {STEPS.map((step, index) => {
                const isActive = index === activeStep
                const isDone = index < activeStep

                return (
                  <Grid size={{ xs: 6, md: 3 }} key={step.title}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: '16px',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.09))'
                          : isDone
                            ? 'rgba(34,197,94,0.07)'
                            : 'rgba(255,255,255,0.025)',
                        border: isActive
                          ? '1px solid rgba(99,102,241,0.32)'
                          : isDone
                            ? '1px solid rgba(74,222,128,0.2)'
                            : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '10px',
                            display: 'grid',
                            placeItems: 'center',
                            background: isDone
                              ? 'linear-gradient(135deg, #22c55e, #14b8a6)'
                              : isActive
                                ? 'linear-gradient(135deg, #6366f1, #3b82f6)'
                                : 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {isDone ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : step.icon}
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              color: isActive ? '#f8fafc' : isDone ? '#86efac' : '#94a3b8',
                              fontWeight: 600,
                              fontSize: '0.83rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {step.title}
                          </Typography>
                          <Typography sx={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.68rem' }}>
                            {isDone ? '✓ Done' : isActive ? 'In progress' : step.sub}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 3.5 }, minHeight: 420 }}>
              {activeStep === 0 && (
                <Box>
                  <SectionHead
                    title="Basic Information"
                    sub="Start with the essentials — your name, gender, and date of birth."
                  />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="First Name"
                        fullWidth
                        value={form.firstName}
                        onChange={handleChange('firstName')}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BadgeRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Last Name"
                        fullWidth
                        value={form.lastName}
                        onChange={handleChange('lastName')}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BadgeRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Gender"
                        fullWidth
                        value={form.gender}
                        onChange={handleChange('gender') as any}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <WcRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                        <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        type="date"
                        label="Date of Birth"
                        fullWidth
                        value={form.dateOfBirth}
                        onChange={handleChange('dateOfBirth')}
                        InputLabelProps={{ shrink: true }}
                        sx={darkFieldSx}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 1 && (
                <Box>
                  <SectionHead
                    title="Location Details"
                    sub="Select your country, state, and city to help us suggest nearby buddies."
                  />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="Country"
                        fullWidth
                        value={form.country}
                        onChange={handleCountryChange}
                        disabled={countryLoading}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PublicRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      >
                        {countryLoading ? (
                          <MenuItem value="">Loading countries...</MenuItem>
                        ) : (
                          countryOptions.map((country) => (
                            <MenuItem key={country.name} value={country.name}>
                              {country.name}
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="State"
                        fullWidth
                        value={form.state}
                        onChange={handleStateChange}
                        disabled={!form.country || stateOptions.length === 0}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      >
                        {!form.country ? (
                          <MenuItem value="">Select country first</MenuItem>
                        ) : stateOptions.length === 0 ? (
                          <MenuItem value="">No states found</MenuItem>
                        ) : (
                          stateOptions.map((state) => (
                            <MenuItem key={state.name} value={state.name}>
                              {state.name}
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="City"
                        fullWidth
                        value={form.city}
                        onChange={handleCityChange}
                        disabled={!form.state || cityLoading}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnRoundedIcon />
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldSx}
                      >
                        {!form.state ? (
                          <MenuItem value="">Select state first</MenuItem>
                        ) : cityLoading ? (
                          <MenuItem value="">Loading cities...</MenuItem>
                        ) : cityOptions.length === 0 ? (
                          <MenuItem value="">No cities found</MenuItem>
                        ) : (
                          cityOptions.map((city) => (
                            <MenuItem key={city} value={city}>
                              {city}
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: '18px',
                          background: latitude
                            ? 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(20,184,166,0.05))'
                            : 'rgba(255,255,255,0.025)',
                          border: latitude
                            ? '1px solid rgba(74,222,128,0.2)'
                            : '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Stack spacing={0.8}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <GpsFixedRoundedIcon
                                sx={{
                                  fontSize: 16,
                                  color: latitude ? '#4ade80' : 'rgba(148,163,184,0.55)',
                                }}
                              />
                              <Typography sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.88rem' }}>
                                GPS Coordinates
                              </Typography>
                            </Stack>

                            {latitude && longitude ? (
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Box
                                  sx={{
                                    px: 1.5,
                                    py: 0.4,
                                    borderRadius: '999px',
                                    background: 'rgba(99,102,241,0.12)',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                  }}
                                >
                                  <Typography sx={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Lat: {latitude.toFixed(6)}
                                  </Typography>
                                </Box>

                                <Box
                                  sx={{
                                    px: 1.5,
                                    py: 0.4,
                                    borderRadius: '999px',
                                    background: 'rgba(34,211,238,0.10)',
                                    border: '1px solid rgba(34,211,238,0.22)',
                                  }}
                                >
                                  <Typography sx={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Lng: {longitude.toFixed(6)}
                                  </Typography>
                                </Box>
                              </Stack>
                            ) : (
                              <Typography sx={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.8rem' }}>
                                {locationError || 'Click to detect your precise coordinates.'}
                              </Typography>
                            )}

                            {locationError && (
                              <Typography sx={{ color: '#f87171', fontSize: '0.75rem' }}>
                                {locationError}
                              </Typography>
                            )}
                          </Stack>

                          <Button
                            onClick={detectLocation}
                            disabled={locationLoading}
                            startIcon={
                              locationLoading ? (
                                <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.6)' }} />
                              ) : (
                                <MyLocationRoundedIcon sx={{ fontSize: 16 }} />
                              )
                            }
                            variant="outlined"
                            sx={{
                              px: 2.5,
                              py: 1.1,
                              borderRadius: '12px',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              color: latitude ? '#4ade80' : '#a5b4fc',
                              borderColor: latitude
                                ? 'rgba(74,222,128,0.35)'
                                : 'rgba(99,102,241,0.35)',
                              background: latitude
                                ? 'rgba(34,197,94,0.07)'
                                : 'rgba(99,102,241,0.07)',
                              '&:hover': {
                                borderColor: latitude
                                  ? 'rgba(74,222,128,0.6)'
                                  : 'rgba(99,102,241,0.6)',
                                background: latitude
                                  ? 'rgba(34,197,94,0.12)'
                                  : 'rgba(99,102,241,0.12)',
                              },
                            }}
                          >
                            {locationLoading
                              ? 'Detecting…'
                              : latitude
                                ? 'Re-detect Location'
                                : 'Detect My Location'}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 2 && (
                <Box>
                  <SectionHead
                    title="Profile Photo"
                    sub="A friendly photo makes people much more likely to connect with you."
                  />

                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={3}
                    alignItems={{ xs: 'center', md: 'center' }}
                  >
                    <Box
                      sx={{
                        flexShrink: 0,
                        p: '3px',
                        borderRadius: '50%',
                        background: preview
                          ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
                          : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,211,238,0.2))',
                        boxShadow: preview ? '0 16px 40px rgba(99,102,241,0.3)' : 'none',
                      }}
                    >
                      <Avatar
                        src={preview || ''}
                        sx={{
                          width: 148,
                          height: 148,
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,211,238,0.2))',
                          fontSize: '3rem',
                          fontWeight: 700,
                          border: '3px solid rgba(8,12,24,0.8)',
                        }}
                      >
                        {!preview ? form.firstName?.[0]?.toUpperCase() || '👤' : ''}
                      </Avatar>
                    </Box>

                    <Paper
                      sx={{
                        flex: 1,
                        p: 2.5,
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1rem' }}>
                          Upload your best photo
                        </Typography>

                        <Stack spacing={0.8}>
                          {[
                            'Clear face, good lighting',
                            'Natural expression works best',
                            'JPG or PNG · max 5 MB',
                          ].map((t) => (
                            <Stack key={t} direction="row" spacing={1} alignItems="center">
                              <Box
                                sx={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: '#6366f1',
                                  flexShrink: 0,
                                }}
                              />
                              <Typography sx={{ color: 'rgba(148,163,184,0.65)', fontSize: '0.82rem' }}>
                                {t}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>

                        <Box>
                          <Button
                            component="label"
                            startIcon={<CloudUploadRoundedIcon />}
                            variant="contained"
                            sx={{
                              px: 2.5,
                              py: 1.3,
                              borderRadius: '12px',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              background:
                                'linear-gradient(135deg, #6366f1 0%, #3b82f6 55%, #22d3ee 100%)',
                              boxShadow: '0 10px 28px rgba(99,102,241,0.3)',
                              '&:hover': {
                                boxShadow: '0 14px 36px rgba(99,102,241,0.45)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            {preview ? 'Change Photo' : 'Upload Photo'}
                            <input hidden type="file" accept="image/*" onChange={handleImage} />
                          </Button>
                        </Box>

                        {preview && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.8,
                              px: 1.5,
                              py: 0.6,
                              borderRadius: '999px',
                              background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(74,222,128,0.2)',
                              width: 'fit-content',
                            }}
                          >
                            <CheckCircleRoundedIcon sx={{ color: '#4ade80', fontSize: 14 }} />
                            <Typography sx={{ color: '#4ade80', fontSize: '0.72rem', fontWeight: 600 }}>
                              Photo uploaded
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Stack>
                </Box>
              )}

              {activeStep === 3 && (
                <Box>
                  <SectionHead
                    title="Final Touch"
                    sub="Write a short bio — then you're all set to explore buddy categories."
                  />

                  <TextField
                    label="Your Bio"
                    fullWidth
                    multiline
                    minRows={5}
                    placeholder="Tell people what kind of buddy you're looking for, your hobbies, or what makes you fun to hang out with…"
                    value={form.bio}
                    onChange={handleChange('bio')}
                    InputLabelProps={{ shrink: true }}
                    sx={darkFieldSx}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.8 }}>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: form.bio.length > 260 ? '#f87171' : 'rgba(100,116,139,0.45)',
                      }}
                    >
                      {form.bio.length} / 280
                    </Typography>
                  </Box>

                  <Paper
                    sx={{
                      mt: 2.5,
                      p: 2,
                      borderRadius: '16px',
                      background:
                        'linear-gradient(135deg, rgba(34,197,94,0.09), rgba(34,211,238,0.07))',
                      border: '1px solid rgba(74,222,128,0.16)',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CheckCircleRoundedIcon sx={{ color: '#4ade80', fontSize: 22 }} />
                      <Box>
                        <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
                          Ready to complete your profile
                        </Typography>
                        <Typography sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem' }}>
                          After submission you&apos;ll be redirected to buddy categories.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              )}

              <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
                <Button
                  onClick={() => setActiveStep((p) => p - 1)}
                  disabled={activeStep === 0 || loading}
                  startIcon={<ArrowBackRoundedIcon />}
                  sx={{
                    minWidth: 110,
                    height: 46,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    color: activeStep === 0 ? 'rgba(100,116,139,0.3)' : '#94a3b8',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.06)',
                      color: '#cbd5e1',
                    },
                  }}
                >
                  Back
                </Button>

                <Button
                  onClick={handlePrimaryAction}
                  disabled={loading}
                  endIcon={
                    loading ? undefined : isLastStep ? (
                      <CheckCircleRoundedIcon />
                    ) : (
                      <ArrowForwardRoundedIcon />
                    )
                  }
                  variant="contained"
                  sx={{
                    minWidth: { xs: 150, md: 190 },
                    height: 50,
                    borderRadius: '14px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    letterSpacing: '0.02em',
                    background: isLastStep
                      ? 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 55%, #22d3ee 100%)',
                    boxShadow: isLastStep
                      ? '0 12px 32px rgba(34,197,94,0.25)'
                      : '0 12px 32px rgba(99,102,241,0.3)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: isLastStep
                        ? '0 18px 40px rgba(34,197,94,0.35)'
                        : '0 18px 40px rgba(99,102,241,0.45)',
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255,255,255,0.5)',
                      background: 'rgba(99,102,241,0.25)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} thickness={5} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  ) : isLastStep ? (
                    profileExists ? 'Update Profile' : 'Complete Profile'
                  ) : (
                    'Continue'
                  )}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2.5}>
              <Paper sx={{ ...glassSx, p: 2.5 }}>
                <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', mb: 2 }}>
                  Live Preview
                </Typography>

                <Paper
                  sx={{
                    p: 2,
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Stack spacing={1.8} alignItems="center">
                    <Box
                      sx={{
                        p: '2px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                      }}
                    >
                      <Avatar
                        src={preview || ''}
                        sx={{
                          width: 72,
                          height: 72,
                          background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)',
                          fontSize: '1.6rem',
                          fontWeight: 700,
                          border: '2px solid rgba(8,12,24,0.8)',
                        }}
                      >
                        {!preview ? form.firstName?.[0]?.toUpperCase() || '👤' : ''}
                      </Avatar>
                    </Box>

                    <Box textAlign="center">
                      <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                        {[form.firstName, form.lastName].filter(Boolean).join(' ') || 'Your Name'}
                      </Typography>

                      <Typography sx={{ color: 'rgba(148,163,184,0.55)', fontSize: '0.8rem' }}>
                        {[form.city, form.country].filter(Boolean).join(', ') || 'Your location'}
                      </Typography>

                      {form.bio && (
                        <Typography
                          sx={{
                            color: 'rgba(148,163,184,0.5)',
                            fontSize: '0.75rem',
                            mt: 1,
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {form.bio}
                        </Typography>
                      )}
                    </Box>

                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '999px',
                        background:
                          completionScore >= 80 ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                        border: `1px solid ${
                          completionScore >= 80
                            ? 'rgba(74,222,128,0.22)'
                            : 'rgba(99,102,241,0.22)'
                        }`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: completionScore >= 80 ? '#4ade80' : '#818cf8',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {completionScore}% complete
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Paper>

              <Paper sx={{ ...glassSx, p: 2.5 }}>
                <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', mb: 1.8 }}>
                  Quick Tips
                </Typography>

                <Stack spacing={1.3}>
                  {[
                    'Use your real first name — it builds trust instantly.',
                    'A clear photo makes you more likely to get matches.',
                    'A short, warm bio works better than a long one.',
                    'Pick buddy categories after this step to refine your matches.',
                  ].map((tip) => (
                    <Stack key={tip} direction="row" spacing={1.2} alignItems="flex-start">
                      <Box
                        sx={{
                          mt: '3px',
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography sx={{ color: '#fff', fontSize: '0.55rem', fontWeight: 900 }}>
                          ✓
                        </Typography>
                      </Box>

                      <Typography
                        sx={{ color: 'rgba(148,163,184,0.65)', fontSize: '0.82rem', lineHeight: 1.5 }}
                      >
                        {tip}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 1 }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{
            fontSize: '0.87rem',
            fontWeight: 500,
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            ...(severity === 'success' && {
              background: 'linear-gradient(135deg, #14532d, #166534)',
              border: '1px solid rgba(74,222,128,0.2)',
            }),
            ...(severity === 'error' && {
              background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
              border: '1px solid rgba(248,113,113,0.2)',
            }),
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  )
}