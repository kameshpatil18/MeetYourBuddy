'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material'

const IDENTITY_API = (
  process.env.NEXT_PUBLIC_IDENTITY_API_URL ||
  'https://localhost:7030'
).replace(/\/+$/, '')

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState(
    'Verifying your email...'
  )

  useEffect(() => {
    let cancelled = false

    const verifyEmail = async () => {
      if (!token) {
        if (!cancelled) {
          setSuccess(false)
          setMessage('Verification token is missing.')
          setLoading(false)
        }

        return
      }

      try {
        setLoading(true)

        const response = await fetch(
          `${IDENTITY_API}/api/auth/verify-email?token=${encodeURIComponent(
            token
          )}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        )

        const text = await response.text()

        let result: any = null

        if (text) {
          try {
            result = JSON.parse(text)
          } catch {
            result = null
          }
        }

        if (cancelled) return

        if (response.ok) {
          setSuccess(true)

          setMessage(
            result?.message ||
              'Your email has been verified successfully. Redirecting to login...'
          )

          window.setTimeout(() => {
            router.push('/login')
          }, 2500)
        } else {
          setSuccess(false)

          setMessage(
            result?.message ||
              'Email verification failed. The link may be invalid or expired.'
          )
        }
      } catch (error) {
        console.error('Verify email error:', error)

        if (!cancelled) {
          setSuccess(false)

          setMessage(
            'Unable to verify email. Please try again later.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    verifyEmail()

    return () => {
      cancelled = true
    }
  }, [router, token])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(99,102,241,0.22), transparent 35%), #060912',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 4,
              sm: 5,
            },
            borderRadius: 5,
            textAlign: 'center',
            background: 'rgba(12,18,35,0.88)',
            border:
              '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(18px)',
            boxShadow:
              '0 24px 80px rgba(0,0,0,0.45)',
          }}
        >
          {loading ? (
            <CircularProgress size={46} />
          ) : (
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '18px',
                mx: 'auto',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                background: success
                  ? 'rgba(74,222,128,0.12)'
                  : 'rgba(248,113,113,0.12)',
                color: success
                  ? '#4ade80'
                  : '#f87171',
              }}
            >
              {success ? '✓' : '✕'}
            </Box>
          )}

          <Typography
            variant="h4"
            sx={{
              mt: loading ? 3 : 1,
              mb: 1,
              fontWeight: 800,
              color: '#e2e8f0',
            }}
          >
            {loading
              ? 'Verifying Email'
              : success
                ? 'Email Verified'
                : 'Verification Failed'}
          </Typography>

          <Typography
            sx={{
              color: 'rgba(148,163,184,0.85)',
              fontSize: '0.98rem',
              lineHeight: 1.7,
              mb: 4,
            }}
          >
            {message}
          </Typography>

          {!loading && (
            <Button
              fullWidth
              variant="contained"
              onClick={() => router.push('/login')}
              sx={{
                py: 1.4,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                background:
                  'linear-gradient(135deg, #6366f1, #22d3ee)',
                boxShadow:
                  '0 12px 30px rgba(99,102,241,0.35)',
              }}
            >
              Go to Login
            </Button>
          )}
        </Paper>
      </Container>
    </Box>
  )
}

function VerifyEmailLoading() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(99,102,241,0.22), transparent 35%), #060912',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={46} />
    </Box>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}