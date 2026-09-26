'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowForward,
  LockOutlined,
  MailOutline,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'

const IDENTITY_API = (
  process.env.NEXT_PUBLIC_IDENTITY_API_URL || 'https://localhost:7030'
).replace(/\/+$/, '')

const fieldSx = {
  '& .MuiInputLabel-root': {
    color: 'rgba(148,163,184,0.65)',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.88rem',
    letterSpacing: '0.02em',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#a5b4fc',
  },
  '& .MuiOutlinedInput-root': {
    color: '#f1f5f9',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.93rem',
    transition: 'all 0.22s ease',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: '1.5px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(129,140,248,0.35)',
    },
    '&.Mui-focused': {
      background: 'rgba(99,102,241,0.06)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#818cf8',
      boxShadow: '0 0 0 4px rgba(99,102,241,0.12)',
    },
    '& input': {
      paddingTop: '15px',
      paddingBottom: '15px',
    },
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
} as const

type LoginResponse = {
  code?: number
  message?: string
  data?: {
    token?: string
    userId?: number
    id?: number
    firstName?: string
    lastName?: string
    fullName?: string
    email?: string
    [key: string]: unknown
  }
}

async function readJsonSafely(response: Response): Promise<LoginResponse | null> {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text) as LoginResponse
  } catch {
    return null
  }
}

function setClientCookie(
  name: string,
  value: string,
  days = 7,
) {
  const expires = new Date()
  expires.setTime(
    expires.getTime() + days * 24 * 60 * 60 * 1000,
  )

  document.cookie =
    `${name}=${encodeURIComponent(value)}; ` +
    `expires=${expires.toUTCString()}; ` +
    'path=/; SameSite=Lax; Secure'
}

export default function LoginForm() {
  const router = useRouter()
  const redirectTimerRef = useRef<number | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] =
    useState<'success' | 'error'>('success')
  const [mounted, setMounted] = useState(false)
  const [focusedField, setFocusedField] =
    useState<'email' | 'password' | null>(null)

  useEffect(() => {
    setMounted(true)

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const normalizedEmail = formData.email.trim()

  const emailLooksValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail),
    [normalizedEmail],
  )

  const allFilled =
    emailLooksValid && formData.password.length > 0

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const showError = (text: string) => {
    setSeverity('error')
    setMessage(text)
    setOpen(true)
  }

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (loading) return

    if (!normalizedEmail) {
      showError('Please enter your email address.')
      return
    }

    if (!emailLooksValid) {
      showError('Please enter a valid email address.')
      return
    }

    if (!formData.password) {
      showError('Please enter your password.')
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      20000,
    )

    setLoading(true)

    try {
      const response = await fetch(
        `${IDENTITY_API}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
          body: JSON.stringify({
            email: normalizedEmail,
            password: formData.password,
          }),
        },
      )

      const result = await readJsonSafely(response)

      if (!response.ok) {
        showError(
          result?.message ||
            `Login failed. Server returned ${response.status}.`,
        )
        return
      }

      if (result?.code !== 1) {
        showError(result?.message || 'Login failed.')
        return
      }

      const token = String(result?.data?.token || '')
      const userId = Number(
        result?.data?.userId ||
          result?.data?.id ||
          0,
      )

      if (!token) {
        showError(
          'Login succeeded but no access token was returned.',
        )
        return
      }

      const safeUser = {
        userId,
        firstName: result?.data?.firstName || '',
        lastName: result?.data?.lastName || '',
        fullName: result?.data?.fullName || '',
        email: result?.data?.email || normalizedEmail,
      }

      /*
       * Current app compatibility:
       * Other MeetYourBuddy client pages read token/user data from
       * browser storage/cookies. Keep these while the existing auth flow
       * depends on them.
       *
       * For a hardened production architecture, prefer an HttpOnly,
       * Secure cookie issued by the backend/BFF instead of a JS-readable JWT.
       */
      localStorage.setItem('token', token)
      localStorage.setItem('userId', String(userId))
      localStorage.setItem('user', JSON.stringify(safeUser))

      setClientCookie('token', token)
      setClientCookie('userId', String(userId))
      setClientCookie('user', JSON.stringify(safeUser))

      setSeverity('success')
      setMessage(result.message || 'Login successful')
      setOpen(true)

      redirectTimerRef.current = window.setTimeout(() => {
        router.replace('/dashboard')
      }, 700)
    } catch (error) {
      console.error('Login error:', error)

      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        showError(
          'The login request timed out. Please try again.',
        )
      } else {
        showError(
          'Unable to connect to the login service. Please try again.',
        )
      }
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100svh',
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
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
          width: 580,
          height: 580,
          top: '-18%',
          left: '-12%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
          width: 500,
          height: 500,
          bottom: '-15%',
          right: '-10%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 65%)',
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
          width: 320,
          height: 320,
          top: '38%',
          right: '14%',
          background:
            'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)',
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      <Paper
        elevation={0}
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 460,
          px: {
            xs: 3,
            sm: 4.5,
          },
          py: {
            xs: 4,
            sm: 5,
          },
          borderRadius: '28px',
          background: 'rgba(7,16,36,0.78)',
          border:
            '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(26px)',
          WebkitBackdropFilter: 'blur(26px)',
          boxShadow:
            '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
          opacity: mounted ? 1 : 0,
          transform: mounted
            ? 'translateY(0)'
            : 'translateY(22px)',
          transition:
            'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), rgba(34,211,238,0.45), transparent)',
            borderRadius: '999px',
          }}
        />

        <Stack spacing={3.5}>
          <Box
            textAlign="center"
            sx={{
              pb: 0.5,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: '15px',
                background:
                  'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(34,211,238,0.14))',
                border:
                  '1px solid rgba(129,140,248,0.18)',
                fontSize: '1.45rem',
                mb: 2,
                boxShadow:
                  '0 8px 24px rgba(99,102,241,0.18)',
              }}
            >
              🤝
            </Box>

            <Typography
              component="h1"
              sx={{
                fontFamily:
                  "'Syne', 'Outfit', sans-serif",
                fontSize: {
                  xs: '1.85rem',
                  sm: '2.2rem',
                },
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                background:
                  'linear-gradient(100deg, #e2e8f0 25%, #a5b4fc 60%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MeetYourBuddy
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontFamily: "'Outfit', sans-serif",
                color: 'rgba(148,163,184,0.58)',
                fontSize: '0.87rem',
                letterSpacing: '0.01em',
              }}
            >
              Welcome back — good to see you 👋
            </Typography>
          </Box>

          <Box
            aria-hidden="true"
            sx={{
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
            }}
          />

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
          >
            <Stack spacing={2.2}>
              <TextField
                label="Email address"
                name="email"
                type="email"
                fullWidth
                required
                disabled={loading}
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  'aria-label': 'Email address',
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline
                        aria-hidden="true"
                        sx={{
                          fontSize: '1.05rem',
                          color:
                            focusedField === 'email'
                              ? '#818cf8'
                              : 'rgba(148,163,184,0.38)',
                          transition: 'color 0.2s',
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />

              <Box>
                <TextField
                  label="Password"
                  name="password"
                  type={
                    showPassword ? 'text' : 'password'
                  }
                  fullWidth
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() =>
                    setFocusedField('password')
                  }
                  onBlur={() => setFocusedField(null)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    'aria-label': 'Password',
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined
                          aria-hidden="true"
                          sx={{
                            fontSize: '1.05rem',
                            color:
                              focusedField === 'password'
                                ? '#818cf8'
                                : 'rgba(148,163,184,0.38)',
                            transition:
                              'color 0.2s',
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          onClick={() =>
                            setShowPassword(prev => !prev)
                          }
                          edge="end"
                          size="small"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          sx={{
                            color:
                              'rgba(148,163,184,0.45)',
                            transition:
                              'all 0.18s',
                            '&:hover': {
                              color: '#a5b4fc',
                              background:
                                'rgba(99,102,241,0.1)',
                            },
                          }}
                        >
                          {showPassword ? (
                            <VisibilityOff
                              sx={{
                                fontSize:
                                  '1.05rem',
                              }}
                            />
                          ) : (
                            <Visibility
                              sx={{
                                fontSize:
                                  '1.05rem',
                              }}
                            />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 0.8,
                  }}
                >
                  <Link
                    component="button"
                    type="button"
                    underline="none"
                    onClick={() =>
                      router.push('/forgot-password')
                    }
                    sx={{
                      fontFamily:
                        "'Outfit', sans-serif",
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      color:
                        'rgba(148,163,184,0.55)',
                      cursor: 'pointer',
                      letterSpacing: '0.01em',
                      transition: 'color 0.18s',
                      '&:hover': {
                        color: '#818cf8',
                      },
                      '&:focus-visible': {
                        outline:
                          '2px solid rgba(129,140,248,0.65)',
                        outlineOffset: 3,
                        borderRadius: '4px',
                      },
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !allFilled}
                endIcon={
                  !loading ? (
                    <ArrowForward
                      sx={{
                        fontSize:
                          '0.95rem !important',
                      }}
                    />
                  ) : undefined
                }
                sx={{
                  mt: 0.5,
                  height: 54,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontFamily:
                    "'Outfit', sans-serif",
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
                  borderColor: allFilled
                    ? 'transparent'
                    : 'rgba(99,102,241,0.18)',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    background:
                      'linear-gradient(135deg, #4f60ef 0%, #24bce0 100%)',
                    boxShadow:
                      '0 16px 40px rgba(79,70,229,0.45)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&.Mui-disabled': {
                    color:
                      'rgba(255,255,255,0.45)',
                    background:
                      'rgba(99,102,241,0.2)',
                    boxShadow: 'none',
                    borderColor:
                      'rgba(99,102,241,0.12)',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress
                    size={20}
                    thickness={5}
                    sx={{
                      color:
                        'rgba(255,255,255,0.65)',
                    }}
                  />
                ) : (
                  'Sign In'
                )}
              </Button>
            </Stack>
          </Box>

          <Box
            aria-hidden="true"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background:
                  'rgba(255,255,255,0.06)',
              }}
            />

            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:
                  'rgba(100,116,139,0.5)',
              }}
            >
              or
            </Typography>

            <Box
              sx={{
                flex: 1,
                height: '1px',
                background:
                  'rgba(255,255,255,0.06)',
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color:
                  'rgba(148,163,184,0.45)',
                fontSize: '0.85rem',
              }}
            >
              Don&apos;t have an account?
            </Typography>

            <Link
              component="button"
              type="button"
              underline="none"
              onClick={() => router.push('/register')}
              sx={{
                fontFamily: "'Outfit', sans-serif",
                color: '#818cf8',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                position: 'relative',
                transition: 'color 0.18s',
                '&:hover': {
                  color: '#a5b4fc',
                },
                '&:focus-visible': {
                  outline:
                    '2px solid rgba(129,140,248,0.65)',
                  outlineOffset: 3,
                  borderRadius: '4px',
                },
              }}
            >
              Create account
            </Link>
          </Box>
        </Stack>
      </Paper>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setOpen(false)
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          mt: 1,
        }}
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
            boxShadow:
              '0 12px 32px rgba(0,0,0,0.45)',
            ...(severity === 'success' && {
              background:
                'linear-gradient(135deg, #14532d, #166534)',
              border:
                '1px solid rgba(74,222,128,0.2)',
            }),
            ...(severity === 'error' && {
              background:
                'linear-gradient(135deg, #7f1d1d, #991b1b)',
              border:
                '1px solid rgba(248,113,113,0.2)',
            }),
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
