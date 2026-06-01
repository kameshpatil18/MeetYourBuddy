'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setMessage('')
    setError('')

    if (!token) {
      setError('Reset token is missing or invalid.')
      return
    }

    if (!password.trim()) {
      setError('New password is required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }

    try {
      setLoading(true)
const response = await fetch('https://localhost:7030/api/auth/reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: token,
    password: password,
    confirmPassword: confirmPassword,
  }),
})

      const text = await response.text()
      const result = text ? JSON.parse(text) : null

      if (!response.ok) {
        setError(result?.message || 'Failed to reset password.')
        return
      }

      if (result?.code === 1 || response.ok) {
        setMessage(result?.message || 'Password reset successfully. Redirecting to login...')

        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        setError(result?.message || 'Unable to reset password.')
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>🔐</div>

        <h1 style={styles.title}>Reset Password</h1>

        <p style={styles.subtitle}>
          Enter your new password below. After successful reset, you can login with your new password.
        </p>

        {!token && (
          <div style={styles.error}>
            Reset token is missing. Please open the reset link from your email.
          </div>
        )}

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>

            <input
              type="password"
              value={password}
              placeholder="Enter new password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || !token}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>

            <input
              type="password"
              value={confirmPassword}
              placeholder="Confirm new password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !token}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            style={{
              ...styles.button,
              opacity: loading || !token ? 0.7 : 1,
              cursor: loading || !token ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p style={styles.backText}>
          Back to{' '}
          <Link href="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </section>
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
      'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 35%), linear-gradient(135deg, #020617, #0f172a, #111827)',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    padding: '34px',
    borderRadius: '26px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
    color: '#fff',
  },
  logo: {
    width: '58px',
    height: '58px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    marginBottom: '22px',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
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
  inputGroup: {
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
    height: '50px',
    borderRadius: '15px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
  },
  backText: {
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
  success: {
    padding: '12px 14px',
    borderRadius: '14px',
    marginBottom: '16px',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    color: '#86efac',
    fontSize: '14px',
  },
  error: {
    padding: '12px 14px',
    borderRadius: '14px',
    marginBottom: '16px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    color: '#fca5a5',
    fontSize: '14px',
  },
}