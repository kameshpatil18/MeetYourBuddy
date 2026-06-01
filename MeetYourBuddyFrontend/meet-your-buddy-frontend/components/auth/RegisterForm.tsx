'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  MailOutline,
  PersonOutline,
  LockOutlined,
  ArrowForward,
} from '@mui/icons-material'

/* ─── password strength ─── */
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Weak',       color: '#f87171' },
    { label: 'Fair',       color: '#fb923c' },
    { label: 'Good',       color: '#facc15' },
    { label: 'Strong',     color: '#4ade80' },
    { label: 'Very strong',color: '#34d399' },
  ]
  return { score, ...map[score] }
}

/* ─── shared field sx ─── */
const fieldSx = {
  '& .MuiInputLabel-root': {
    color: 'rgba(148,163,184,0.65)',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.88rem',
    letterSpacing: '0.02em',
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a5b4fc' },
  '& .MuiOutlinedInput-root': {
    color: '#f1f5f9',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.93rem',
    transition: 'all 0.22s ease',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: 'rgba(129,140,248,0.35)' },
    '&.Mui-focused': { background: 'rgba(99,102,241,0.06)' },
    '&.Mui-focused fieldset': {
      borderColor: '#818cf8',
      boxShadow: '0 0 0 4px rgba(99,102,241,0.12)',
    },
    '& input': { paddingTop: '15px', paddingBottom: '15px' },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px rgba(7,16,36,0.98) inset',
      WebkitTextFillColor: '#f1f5f9',
      caretColor: '#f1f5f9',
      borderRadius: '14px',
      transition: 'background-color 5000s ease-in-out 0s',
    },
    '& input:-webkit-autofill:focus': {
      WebkitBoxShadow: '0 0 0 100px rgba(7,16,36,0.98) inset',
      WebkitTextFillColor: '#f1f5f9',
    },
  },
}

export default function RegisterForm() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword]  = useState(false)
  const [loading, setLoading]            = useState(false)
  const [open, setOpen]                  = useState(false)
  const [message, setMessage]            = useState('')
  const [severity, setSeverity]          = useState<'success' | 'error'>('success')
  const [mounted, setMounted]            = useState(false)
  const [focusedField, setFocusedField]  = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const strength  = getStrength(formData.password)
  const allFilled = Object.values(formData).every(Boolean)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('https://localhost:7152/gateway/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.code === 1) {
        setSeverity('success')
        setMessage(result.message || 'Registered successfully')
        setOpen(true)
        setTimeout(() => router.push('/login'), 1400)
      } else {
        setSeverity('error')
        setMessage(result.message || 'Registration failed')
        setOpen(true)
      }
    } catch (error: any) {
      console.error('Register error:', error)
      setSeverity('error')
      setMessage(error?.message || 'Something went wrong')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: '#020617',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Background atmosphere ── */}
      {/* Large indigo orb top-left */}
      <Box sx={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 580, height: 580, top: '-18%', left: '-12%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
      }} />
      {/* Cyan orb bottom-right */}
      <Box sx={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 500, height: 500, bottom: '-15%', right: '-10%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 65%)',
      }} />
      {/* Purple mid accent */}
      <Box sx={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        width: 320, height: 320, top: '42%', right: '12%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)',
      }} />
      {/* Subtle grid */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      {/* ── Card ── */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 500,
          px: { xs: 3, sm: 4.5 },
          py: { xs: 4, sm: 5 },
          borderRadius: '28px',
          background: 'rgba(7,16,36,0.78)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(26px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(22px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Top shimmer line */}
        <Box sx={{
          position: 'absolute',
          top: 0, left: '8%', right: '8%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), rgba(34,211,238,0.45), transparent)',
          borderRadius: '999px',
        }} />

        <Stack spacing={3.5}>

          {/* ── Header ── */}
          <Box textAlign="center" sx={{ pb: 0.5 }}>
            {/* Logo badge */}
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: '15px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(34,211,238,0.14))',
              border: '1px solid rgba(129,140,248,0.18)',
              fontSize: '1.45rem',
              mb: 2,
              boxShadow: '0 8px 24px rgba(99,102,241,0.18)',
            }}>
              🤝
            </Box>

            <Typography sx={{
              fontFamily: "'Syne', 'Outfit', sans-serif",
              fontSize: { xs: '1.85rem', sm: '2.2rem' },
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              background: 'linear-gradient(100deg, #e2e8f0 25%, #a5b4fc 60%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              MeetYourBuddy
            </Typography>

            <Typography sx={{
              mt: 1,
              fontFamily: "'Outfit', sans-serif",
              color: 'rgba(148,163,184,0.58)',
              fontSize: '0.87rem',
              letterSpacing: '0.01em',
            }}>
              Create your account and start connecting
            </Typography>
          </Box>

          {/* ── Thin divider ── */}
          <Box sx={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          }} />

          {/* ── Form ── */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.2}>

              {/* Name row */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}>
                <TextField
                  label="First Name"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{
                          fontSize: '1.05rem',
                          color: focusedField === 'firstName' ? '#818cf8' : 'rgba(148,163,184,0.38)',
                          transition: 'color 0.2s',
                        }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />

                <TextField
                  label="Last Name"
                  name="lastName"
                  required
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{
                          fontSize: '1.05rem',
                          color: focusedField === 'lastName' ? '#818cf8' : 'rgba(148,163,184,0.38)',
                          transition: 'color 0.2s',
                        }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />
              </Box>

              {/* Email */}
              <TextField
                label="Email address"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline sx={{
                        fontSize: '1.05rem',
                        color: focusedField === 'email' ? '#818cf8' : 'rgba(148,163,184,0.38)',
                        transition: 'color 0.2s',
                      }} />
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />

              {/* Password + strength */}
              <Box>
                <TextField
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{
                          fontSize: '1.05rem',
                          color: focusedField === 'password' ? '#818cf8' : 'rgba(148,163,184,0.38)',
                          transition: 'color 0.2s',
                        }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                          size="small"
                          sx={{
                            color: 'rgba(148,163,184,0.45)',
                            transition: 'all 0.18s',
                            '&:hover': {
                              color: '#a5b4fc',
                              background: 'rgba(99,102,241,0.1)',
                            },
                          }}
                        >
                          {showPassword
                            ? <VisibilityOff sx={{ fontSize: '1.05rem' }} />
                            : <Visibility sx={{ fontSize: '1.05rem' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />

                {/* Strength meter */}
                {formData.password && (
                  <Box sx={{ mt: 1.2, px: 0.25 }}>
                    <Box sx={{ display: 'flex', gap: '5px', mb: '5px' }}>
                      {[0, 1, 2, 3].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            flex: 1,
                            height: '3px',
                            borderRadius: '999px',
                            background: i < strength.score ? strength.color : 'rgba(255,255,255,0.07)',
                            transition: 'background 0.3s ease',
                            boxShadow: i < strength.score ? `0 0 6px ${strength.color}55` : 'none',
                          }}
                        />
                      ))}
                    </Box>
                    <Typography sx={{
                      fontSize: '0.68rem',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: strength.color,
                      transition: 'color 0.3s',
                    }}>
                      {strength.label}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                endIcon={!loading && (
                  <ArrowForward sx={{ fontSize: '0.95rem !important', transition: 'transform 0.2s' }} />
                )}
                sx={{
                  mt: 0.5,
                  height: 54,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: '#fff',
                  background: allFilled
                    ? 'linear-gradient(135deg, #5b6df5 0%, #2ec5e8 100%)'
                    : 'rgba(99,102,241,0.22)',
                  boxShadow: allFilled
                    ? '0 10px 30px rgba(79,70,229,0.32)'
                    : 'none',
                  border: '1px solid',
                  borderColor: allFilled ? 'transparent' : 'rgba(99,102,241,0.18)',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f60ef 0%, #24bce0 100%)',
                    boxShadow: '0 16px 40px rgba(79,70,229,0.45)',
                    transform: 'translateY(-1px)',
                    '& .MuiButton-endIcon': { transform: 'translateX(3px)' },
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,0.45)',
                    background: 'rgba(99,102,241,0.2)',
                    boxShadow: 'none',
                    borderColor: 'rgba(99,102,241,0.12)',
                  },
                }}
              >
                {loading
                  ? <CircularProgress size={20} thickness={5} sx={{ color: 'rgba(255,255,255,0.65)' }} />
                  : 'Create Account'}
              </Button>
            </Stack>
          </Box>

          {/* ── Footer ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{
              fontFamily: "'Outfit', sans-serif",
              color: 'rgba(148,163,184,0.45)',
              fontSize: '0.85rem',
            }}>
              Already have an account?
            </Typography>
            <Typography
              component="span"
              onClick={() => router.push('/login')}
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: '#818cf8',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                position: 'relative',
                transition: 'color 0.18s',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-1px', left: 0, right: 0,
                  height: '1px',
                  background: 'currentColor',
                  transform: 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 0.2s ease',
                },
                '&:hover': { color: '#a5b4fc' },
                '&:hover::after': { transform: 'scaleX(1)' },
              }}
            >
              Sign in
            </Typography>
          </Box>

        </Stack>
      </Paper>

      {/* ── Toast ── */}
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
            fontFamily: "'Outfit', sans-serif",
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