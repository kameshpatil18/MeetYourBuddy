'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Box,
  Button,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import RegisterForm from '@/components/auth/RegisterForm'

const INTRO_DURATION_MS = 5000

const REGISTER_ANIMATION_URL =
  'https://lottie.host/2a4db3fa-d0a2-40c5-a432-009b9b1ee72b/n1pzhoSCWb.lottie'

const REGISTER_INTRO_SEEN_KEY =
  'meetyourbuddy-register-intro-seen'

export default function RegisterPage() {
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)'
  )

  const timerRef = useRef<number | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [mounted, setMounted] = useState(false)

  const clearIntroTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const openRegisterForm = useCallback(() => {
    clearIntroTimer()

    try {
      sessionStorage.setItem(
        REGISTER_INTRO_SEEN_KEY,
        'true'
      )
    } catch {
      // Storage may be unavailable in some browser modes.
    }

    setShowForm(true)
  }, [clearIntroTimer])

  useEffect(() => {
    setMounted(true)

    let hasSeenIntro = false

    try {
      hasSeenIntro =
        sessionStorage.getItem(
          REGISTER_INTRO_SEEN_KEY
        ) === 'true'
    } catch {
      hasSeenIntro = false
    }

    if (hasSeenIntro || prefersReducedMotion) {
      setShowForm(true)
      return
    }

    timerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          REGISTER_INTRO_SEEN_KEY,
          'true'
        )
      } catch {
        // Ignore storage errors.
      }

      setShowForm(true)
      timerRef.current = null
    }, INTRO_DURATION_MS)

    return clearIntroTimer
  }, [clearIntroTimer, prefersReducedMotion])

  if (!mounted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #020617 0%, #020b20 45%, #08061f 100%)',
        }}
      />
    )
  }

  return (
    <AnimatePresence mode="wait">
      {showForm ? (
        <motion.div
          key="register-form"
          initial={
            prefersReducedMotion
              ? false
              : {
                  opacity: 0,
                  y: 20,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: prefersReducedMotion
              ? 0
              : 0.4,
            ease: 'easeOut',
          }}
          style={{
            minHeight: '100vh',
          }}
        >
          <RegisterForm />
        </motion.div>
      ) : (
        <motion.main
          key="register-intro"
          initial={
            prefersReducedMotion
              ? false
              : {
                  opacity: 0,
                }
          }
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
            scale: prefersReducedMotion
              ? 1
              : 0.985,
          }}
          transition={{
            duration: prefersReducedMotion
              ? 0
              : 0.45,
          }}
          aria-label="MeetYourBuddy registration introduction"
        >
          <Box
            sx={{
              minHeight: '100svh',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              px: {
                xs: 2,
                sm: 3,
              },
              py: {
                xs: 8,
                sm: 4,
              },
              background:
                'radial-gradient(circle at 20% 20%, rgba(129,140,248,0.20), transparent 22%), radial-gradient(circle at 80% 30%, rgba(34,211,238,0.14), transparent 20%), radial-gradient(circle at 50% 85%, rgba(168,85,247,0.12), transparent 22%), linear-gradient(135deg, #020617 0%, #020b20 45%, #08061f 100%)',
            }}
          >
            {/* Background decoration */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -100,
                  right: -80,
                  width: {
                    xs: 240,
                    md: 340,
                  },
                  height: {
                    xs: 240,
                    md: 340,
                  },
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
                  filter: 'blur(12px)',
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  bottom: -120,
                  left: -80,
                  width: {
                    xs: 240,
                    md: 300,
                  },
                  height: {
                    xs: 240,
                    md: 300,
                  },
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)',
                  filter: 'blur(14px)',
                }}
              />
            </Box>

            {/* Skip intro */}
            <Button
              type="button"
              onClick={openRegisterForm}
              endIcon={
                <ArrowForwardRoundedIcon />
              }
              aria-label="Skip introduction and open registration form"
              sx={{
                position: 'absolute',
                top: {
                  xs: 16,
                  sm: 24,
                },
                right: {
                  xs: 16,
                  sm: 24,
                },
                zIndex: 10,
                px: 2,
                py: 1,
                minHeight: 42,
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                color: '#E2E8F0',
                background:
                  'rgba(255,255,255,0.05)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
                backdropFilter:
                  'blur(10px)',
                transition:
                  'background 160ms ease, border-color 160ms ease, transform 160ms ease',

                '&:hover': {
                  background:
                    'rgba(255,255,255,0.09)',
                  borderColor:
                    'rgba(255,255,255,0.14)',
                  transform:
                    'translateY(-1px)',
                },

                '&:focus-visible': {
                  outline:
                    '3px solid rgba(103,232,249,0.35)',
                  outlineOffset: 2,
                },
              }}
            >
              Skip
            </Button>

            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: 760,
              }}
            >
              <Box
                sx={{
                  borderRadius: {
                    xs: '24px',
                    sm: '32px',
                  },
                  p: {
                    xs: 3,
                    sm: 5,
                  },
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                  background:
                    'linear-gradient(180deg, rgba(12,18,35,0.90) 0%, rgba(8,12,24,0.82) 100%)',
                  backdropFilter:
                    'blur(18px)',
                  WebkitBackdropFilter:
                    'blur(18px)',
                  boxShadow:
                    '0 20px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                  textAlign: 'center',
                }}
              >
                <motion.div
                  initial={
                    prefersReducedMotion
                      ? false
                      : {
                          opacity: 0,
                          y: -24,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration:
                      prefersReducedMotion
                        ? 0
                        : 0.6,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                      mb: 2,
                    }}
                  >
                    <AutoAwesomeRoundedIcon
                      aria-hidden="true"
                      sx={{
                        color: '#67E8F9',
                      }}
                    />

                    <Typography
                      component="span"
                      sx={{
                        color: '#93C5FD',
                        fontWeight: 700,
                        letterSpacing:
                          '0.08em',
                        textTransform:
                          'uppercase',
                        fontSize:
                          '0.82rem',
                      }}
                    >
                      Onboarding
                    </Typography>
                  </Stack>

                  <Typography
                    component="h1"
                    sx={{
                      fontSize: {
                        xs: '2.35rem',
                        sm: '3.2rem',
                        md: '4rem',
                      },
                      lineHeight: 1,
                      fontWeight: 900,
                      letterSpacing:
                        '-0.05em',
                      background:
                        'linear-gradient(90deg, #A5B4FC 0%, #60A5FA 45%, #67E8F9 100%)',
                      WebkitBackgroundClip:
                        'text',
                      WebkitTextFillColor:
                        'transparent',
                      backgroundClip:
                        'text',
                    }}
                  >
                    MeetYourBuddy
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.5,
                      color:
                        'rgba(203,213,225,0.82)',
                      fontSize: {
                        xs: '0.98rem',
                        md: '1.1rem',
                      },
                    }}
                  >
                    Finding your perfect
                    buddy experience...
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color:
                        'rgba(148,163,184,0.72)',
                      fontSize:
                        '0.95rem',
                    }}
                  >
                    Travel • Gym • Study •
                    Networking
                  </Typography>
                </motion.div>

                {!prefersReducedMotion && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.94,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.7,
                      delay: 0.25,
                    }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: {
                          xs: 230,
                          sm: 350,
                        },
                        maxWidth: '100%',
                        mx: 'auto',
                        mt: 3,
                        mb: 2,
                        minHeight: {
                          xs: 210,
                          sm: 300,
                        },
                      }}
                    >
                      <DotLottieReact
                        src={
                          REGISTER_ANIMATION_URL
                        }
                        loop
                        autoplay
                      />
                    </Box>
                  </motion.div>
                )}

                <motion.div
                  initial={
                    prefersReducedMotion
                      ? false
                      : {
                          opacity: 0,
                          y: 18,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration:
                      prefersReducedMotion
                        ? 0
                        : 0.55,
                    delay:
                      prefersReducedMotion
                        ? 0
                        : 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      mt: prefersReducedMotion
                        ? 3
                        : 0,
                      color:
                        'rgba(226,232,240,0.74)',
                      fontSize:
                        '0.96rem',
                    }}
                  >
                    We’re preparing your
                    journey before account
                    creation.
                  </Typography>
                </motion.div>

                <Button
                  type="button"
                  onClick={openRegisterForm}
                  endIcon={
                    <ArrowForwardRoundedIcon />
                  }
                  sx={{
                    mt: 3,
                    px: 3,
                    py: 1.2,
                    borderRadius:
                      '14px',
                    textTransform:
                      'none',
                    fontWeight: 800,
                    color: '#fff',
                    background:
                      'linear-gradient(135deg, #6366F1, #2563EB 55%, #06B6D4)',
                    boxShadow:
                      '0 12px 30px rgba(37,99,235,0.25)',

                    '&:hover': {
                      background:
                        'linear-gradient(135deg, #4F46E5, #1D4ED8 55%, #0891B2)',
                      boxShadow:
                        '0 16px 38px rgba(37,99,235,0.32)',
                    },

                    '&:focus-visible': {
                      outline:
                        '3px solid rgba(103,232,249,0.35)',
                      outlineOffset: 2,
                    },
                  }}
                >
                  Create my account
                </Button>
              </Box>
            </Box>
          </Box>
        </motion.main>
      )}
    </AnimatePresence>
  )
}