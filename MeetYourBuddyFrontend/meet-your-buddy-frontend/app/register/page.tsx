'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, Button, Stack } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import RegisterForm from '@/components/auth/RegisterForm'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'

export default function RegisterPage() {
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {showForm ? (
        <motion.div
          key="register-form"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <RegisterForm />
        </motion.div>
      ) : (
        <motion.div
          key="register-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            sx={{
              minHeight: '100vh',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              px: 2,
              background:
                'radial-gradient(circle at 20% 20%, rgba(129,140,248,0.20), transparent 22%), radial-gradient(circle at 80% 30%, rgba(34,211,238,0.14), transparent 20%), radial-gradient(circle at 50% 85%, rgba(168,85,247,0.12), transparent 22%), linear-gradient(135deg, #020617 0%, #020b20 45%, #08061f 100%)',
            }}
          >
            <Box
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
                  width: 320,
                  height: 320,
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
                  width: 280,
                  height: 280,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)',
                  filter: 'blur(14px)',
                }}
              />
            </Box>

            <Button
              onClick={() => setShowForm(true)}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                position: 'absolute',
                top: 24,
                right: 24,
                zIndex: 2,
                px: 2,
                py: 1,
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                color: '#E2E8F0',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(255,255,255,0.08)',
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
                  borderRadius: '32px',
                  p: { xs: 3, sm: 5 },
                  border: '1px solid rgba(255,255,255,0.08)',
                  background:
                    'linear-gradient(180deg, rgba(12,18,35,0.90) 0%, rgba(8,12,24,0.82) 100%)',
                  backdropFilter: 'blur(18px)',
                  boxShadow:
                    '0 20px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                  textAlign: 'center',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <AutoAwesomeRoundedIcon sx={{ color: '#67E8F9' }} />
                    <Typography
                      sx={{
                        color: '#93C5FD',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontSize: '0.82rem',
                      }}
                    >
                      Onboarding
                    </Typography>
                  </Stack>

                  <Typography
                    sx={{
                      fontSize: { xs: '2.4rem', md: '4rem' },
                      lineHeight: 1,
                      fontWeight: 900,
                      letterSpacing: '-0.05em',
                      background:
                        'linear-gradient(90deg, #A5B4FC 0%, #60A5FA 45%, #67E8F9 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    MeetYourBuddy
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.5,
                      color: 'rgba(203,213,225,0.82)',
                      fontSize: { xs: '1rem', md: '1.1rem' },
                    }}
                  >
                    Finding your perfect buddy experience...
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: 'rgba(148,163,184,0.72)',
                      fontSize: '0.95rem',
                    }}
                  >
                    Travel • Gym • Study • Networking
                  </Typography>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.25 }}
                >
                  <Box
                    sx={{
                      width: { xs: 260, sm: 360 },
                      mx: 'auto',
                      mt: 3,
                      mb: 2,
                    }}
                  >
                    <DotLottieReact
                      src="https://lottie.host/2a4db3fa-d0a2-40c5-a432-009b9b1ee72b/n1pzhoSCWb.lottie"
                      loop
                      autoplay
                    />
                  </Box>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.5 }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(226,232,240,0.74)',
                      fontSize: '0.96rem',
                    }}
                  >
                    We’re preparing your journey before account creation.
                  </Typography>
                </motion.div>
              </Box>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  )
}