'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('https://localhost:7030/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const text = await response.text()
      const result = text ? JSON.parse(text) : null

      if (!response.ok) {
        setError(result?.message || 'Something went wrong. Please try again.')
        return
      }

      if (result?.code === 1 || response.ok) {
        setMessage(result?.message || 'Password reset link has been sent to your email.')
        setEmail('')
      } else {
        setError(result?.message || 'Unable to send reset link.')
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Unable to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoBox}>🤝</div>

        <h1 style={styles.title}>Forgot Password?</h1>

        <p style={styles.subtitle}>
          No worries. Enter your registered email and we will send you a password reset link.
        </p>

        {message && (
          <div style={styles.successBox}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={styles.footerText}>
          Remember your password?{' '}
          <Link href="/login" style={styles.link}>
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background:
      'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 35%), linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    padding: '34px',
    borderRadius: '26px',
    background: 'rgba(15, 23, 42, 0.88)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(16px)',
    color: '#fff',
  },
  logoBox: {
    width: '58px',
    height: '58px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    marginBottom: '22px',
    boxShadow: '0 14px 35px rgba(99,102,241,0.4)',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  subtitle: {
    marginTop: '10px',
    marginBottom: '24px',
    color: '#94a3b8',
    lineHeight: 1.6,
    fontSize: '15px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#cbd5e1',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    height: '48px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    padding: '0 14px',
    outline: 'none',
    fontSize: '15px',
  },
  button: {
    width: '100%',
    height: '50px',
    borderRadius: '15px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    boxShadow: '0 14px 30px rgba(99,102,241,0.35)',
  },
  footerText: {
    marginTop: '22px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  link: {
    color: '#a5b4fc',
    fontWeight: 700,
    textDecoration: 'none',
  },
  successBox: {
    padding: '12px 14px',
    borderRadius: '14px',
    marginBottom: '16px',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    color: '#86efac',
    fontSize: '14px',
  },
  errorBox: {
    padding: '12px 14px',
    borderRadius: '14px',
    marginBottom: '16px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    color: '#fca5a5',
    fontSize: '14px',
  },
}