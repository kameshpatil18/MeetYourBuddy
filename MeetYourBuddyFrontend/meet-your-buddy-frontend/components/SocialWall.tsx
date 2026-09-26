'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
type Post = {
  id: number
  userId?: number
  userName?: string
  userImage?: string
  content: string
  imageUrl?: string
  createdDate?: string
  likesCount?: number
  commentsCount?: number
  isLiked?: boolean
}

type CommentItem = {
  id: number
  userId?: number
  userName?: string
  userImage?: string
  comment: string
  createdDate?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_SOCIALWALL_API || 'https://localhost:7169'
const SOCIALWALL_ROUTE = '/api/Socialwall'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
  return ''
}

// FIX: only runs client-side (called inside useEffect, never during SSR)
function getAuthToken(): string {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('accessToken') ||
    getCookie('token') ||
    getCookie('authToken') ||
    getCookie('accessToken') ||
    ''
  )
}

function normalizePost(item: any): Post {
  return {
    id: item.id ?? item.Id ?? item.postId ?? item.PostId,
    userId: item.userId ?? item.UserId,
    // API returns "userName" OR "fullName" — both covered
    userName: item.userName ?? item.UserName ?? item.fullName ?? item.FullName,
    // API returns "userPhoto" not "userImage"
    userImage: item.userPhoto ?? item.UserPhoto ?? item.userImage ?? item.UserImage ?? item.profileImage ?? item.ProfileImage,
    content: item.content ?? item.Content ?? '',
    imageUrl: item.imageUrl ?? item.ImageUrl ?? '',
    createdDate: item.createdDate ?? item.CreatedDate,
    // API returns "likeCount" not "likesCount"
    likesCount: item.likesCount ?? item.LikesCount ?? item.likeCount ?? item.LikeCount ?? 0,
    // API returns "commentCount" not "commentsCount"
    commentsCount: item.commentsCount ?? item.CommentsCount ?? item.commentCount ?? item.CommentCount ?? 0,
    // API returns "isLikedByMe" not "isLiked"
    isLiked: item.isLikedByMe ?? item.IsLikedByMe ?? item.isLiked ?? item.IsLiked ?? false,
  }
}

function normalizeComment(item: any): CommentItem {
  return {
    id: item.id ?? item.Id ?? item.commentId ?? item.CommentId,
    userId: item.userId ?? item.UserId,
    userName: item.userName ?? item.UserName ?? item.fullName ?? item.FullName,
    userImage: item.userImage ?? item.UserImage ?? item.profileImage ?? item.ProfileImage,
    comment: item.comment ?? item.Comment ?? item.content ?? item.Content ?? '',
    createdDate: item.createdDate ?? item.CreatedDate,
  }
}

async function readJsonSafely(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U'
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function formatTime(date?: string): string {
  if (!date) return 'Just now'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 'Just now'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({
  src, name, size = 44, style = {}
}: { src?: string; name?: string; size?: number; style?: React.CSSProperties }) {
  const initials = getInitials(name)
  const hue = (name?.charCodeAt(0) || 0) * 37 % 360
  if (src) {
    return (
      <img
        src={src} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue+60)%360},70%,45%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.36, color: '#fff', letterSpacing: '-0.5px',
      fontFamily: 'DM Sans, sans-serif',
      ...style,
    }}>
      {initials}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SocialWallPage() {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState<{ name?: string; image?: string } | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)

  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentPosting, setCommentPosting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [likeAnimId, setLikeAnimId] = useState<number | null>(null)
  const [shareToast, setShareToast] = useState('')

  // FIX: token is set client-side only, inside useEffect
  useEffect(() => {
    const saved = getAuthToken()
    setToken(saved)
    if (!saved) setErrorMessage('Login token not found. Please login again.')
  }, [])

  // FIX: headers are re-derived from token state (not stale closures)
  const authHeaders = useMemo<Record<string, string>>(() => ({
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])

  const jsonHeaders = useMemo(() => ({
    ...authHeaders,
    'Content-Type': 'application/json',
  }), [authHeaders])

  const handleUnauthorized = useCallback(() => {
    ;['token', 'authToken', 'accessToken'].forEach(k => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    setErrorMessage('Session expired. Please login again.')
    router.push('/login')
  }, [router])

  const handleApiError = useCallback(async (response: Response, defaultMsg: string) => {
    const body = await readJsonSafely(response)
    if (response.status === 401) { handleUnauthorized(); throw new Error('Unauthorized') }
    const msg = typeof body === 'string' ? body : body?.message || body?.Message || defaultMsg
    throw new Error(`${defaultMsg} (${response.status}): ${msg}`)
  }, [handleUnauthorized])

  const loadPosts = useCallback(async () => {
    const lat = token || getAuthToken()
    if (!lat) { setErrorMessage('Login token not found.'); return }
    try {
      setLoading(true)
      setErrorMessage('')
      const res = await fetch(`${API_BASE}${SOCIALWALL_ROUTE}/posts`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${lat}` },
      })
      if (!res.ok) await handleApiError(res, 'Failed to fetch posts')
      const result = await readJsonSafely(res)

      // Log raw shape so you can identify the exact wrapper key
      console.log('Posts API raw result:', result)

      // Walk every known wrapper shape until we find an array.
      // YOUR API shape: { code, message, data: { items: [...], totalCount, ... } }
      const extracted: any[] | null =
        Array.isArray(result)                        ? result               // [ {...} ]
        : Array.isArray(result?.data?.items)         ? result.data.items    // { data: { items: [...] } }  ← YOUR SHAPE
        : Array.isArray(result?.data?.Items)         ? result.data.Items
        : Array.isArray(result?.data?.posts)         ? result.data.posts
        : Array.isArray(result?.data?.Posts)         ? result.data.Posts
        : Array.isArray(result?.data?.data)          ? result.data.data
        : Array.isArray(result?.data)                ? result.data          // { data: [...] }
        : Array.isArray(result?.Data?.items)         ? result.Data.items
        : Array.isArray(result?.Data)                ? result.Data
        : Array.isArray(result?.items)               ? result.items         // { items: [...] }
        : Array.isArray(result?.Items)               ? result.Items
        : Array.isArray(result?.posts)               ? result.posts
        : Array.isArray(result?.Posts)               ? result.Posts
        : Array.isArray(result?.result)              ? result.result
        : Array.isArray(result?.Result)              ? result.Result
        : Array.isArray(result?.value)               ? result.value
        : Array.isArray(result?.Value)               ? result.Value
        : null

      if (extracted === null) {
        console.warn('Posts API: no array found in response:', JSON.stringify(result, null, 2))
        setPosts([])
        return
      }

      setPosts(extracted.map(normalizePost))
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to fetch posts')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [token, handleApiError])

  useEffect(() => { if (token) loadPosts() }, [token, loadPosts])

  const handleCreatePost = async () => {
    if (!newPost.trim() && !imageUrl.trim()) return
    try {
      setPosting(true)
      setErrorMessage('')
      const res = await fetch(`${API_BASE}${SOCIALWALL_ROUTE}/posts`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ content: newPost.trim(), imageUrl: imageUrl.trim() }),
      })
      if (!res.ok) await handleApiError(res, 'Failed to create post')
      setNewPost(''); setImageUrl(''); setShowImageInput(false)
      await loadPosts()
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: number) => {
    const snap = posts
    setLikeAnimId(postId)
    setTimeout(() => setLikeAnimId(null), 600)
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likesCount: Math.max(0, (p.likesCount || 0) + (p.isLiked ? -1 : 1)) }
        : p
    ))
    try {
      const res = await fetch(`${API_BASE}${SOCIALWALL_ROUTE}/posts/${postId}/like`, {
        method: 'POST', headers: authHeaders,
      })
      if (!res.ok) { setPosts(snap); await handleApiError(res, 'Failed to like post') }
    } catch (e: any) {
      setPosts(snap)
      setErrorMessage(e?.message || 'Failed to like post')
    }
  }

  const loadComments = async (postId: number) => {
    setCommentLoading(true)
    setSelectedPostId(postId)
    setComments([])
    setErrorMessage('')
    try {
      const res = await fetch(`${API_BASE}${SOCIALWALL_ROUTE}/posts/${postId}/comments`, {
        headers: authHeaders,
      })
      if (!res.ok) await handleApiError(res, 'Failed to load comments')
      const result = await readJsonSafely(res)

      console.log('Comments API raw result:', result)

      const extracted: any[] | null =
        Array.isArray(result)              ? result
        : Array.isArray(result?.data)      ? result.data
        : Array.isArray(result?.Data)      ? result.Data
        : Array.isArray(result?.comments)  ? result.comments
        : Array.isArray(result?.Comments)  ? result.Comments
        : Array.isArray(result?.items)     ? result.items
        : Array.isArray(result?.Items)     ? result.Items
        : Array.isArray(result?.result)    ? result.result
        : Array.isArray(result?.Result)    ? result.Result
        : Array.isArray(result?.value)     ? result.value
        : null

      if (extracted === null) {
        console.warn('Comments API: no array found in response:', JSON.stringify(result, null, 2))
        setComments([])
        return
      }

      setComments(extracted.map(normalizeComment))
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to load comments')
      setComments([])
    } finally {
      setCommentLoading(false)
      setTimeout(() => commentInputRef.current?.focus(), 150)
    }
  }

  const handleAddComment = async () => {
    if (!selectedPostId || !commentText.trim()) return
    try {
      setCommentPosting(true)
      setErrorMessage('')
      const res = await fetch(`${API_BASE}${SOCIALWALL_ROUTE}/posts/${selectedPostId}/comments`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ comment: commentText.trim() }),
      })
      if (!res.ok) await handleApiError(res, 'Failed to add comment')
      setCommentText('')
      await loadComments(selectedPostId)
      await loadPosts()
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to add comment')
    } finally {
      setCommentPosting(false)
    }
  }

  const handleShare = async (post: Post) => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}?post=${post.id}`
        : ''

    const shareText = post.content?.trim()
      ? `${post.userName || 'A buddy'} shared: ${post.content.trim().slice(0, 140)}${post.content.trim().length > 140 ? '…' : ''}`
      : `Check out this post from ${post.userName || 'MeetYourBuddy'}.`

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `MeetYourBuddy · ${post.userName || 'Social Wall'}`,
          text: shareText,
          url: shareUrl,
        })
        setShareToast('Post shared')
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        setShareToast('Post link copied')
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = `${shareText}\n${shareUrl}`
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
        setShareToast('Post link copied')
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      setShareToast('Could not share this post')
    }

    window.setTimeout(() => setShareToast(''), 2200)
  }

  const selectedPost = posts.find(p => p.id === selectedPostId)

  return (
    <>
      {/* ── Global styles injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #050912; }

        .sw-page {
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          color: #e8eaf6;
          background: #050912;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Noise texture overlay ── */
        .sw-page::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.55;
        }

        /* ── Gradient mesh ── */
        .sw-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 10% 0%, rgba(99,60,220,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 100%, rgba(0,180,200,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 40% 60% at 50% 50%, rgba(255,60,140,0.07) 0%, transparent 65%);
        }

        /* ── Fine grid ── */
        .sw-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 100% 100% at 50% 0%, black 30%, transparent 100%);
        }

        .sw-inner {
          position: relative; z-index: 1;
          max-width: 1180px; margin: 0 auto;
          padding: 24px 22px 72px;
        }

        /* ── Header ── */
        .sw-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 18px; flex-wrap: wrap;
          margin-bottom: 24px;
          padding: 2px 0 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .sw-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(160,120,255,0.85);
          margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .sw-eyebrow::before {
          content: '';
          display: inline-block; width: 20px; height: 1px;
          background: rgba(160,120,255,0.7);
        }

        .sw-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 800;
          letter-spacing: -1.2px;
          line-height: 1.1;
          background: linear-gradient(135deg, #fff 30%, rgba(160,120,255,0.9) 65%, rgba(0,200,220,0.85) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sw-subtitle {
          margin-top: 7px;
          color: rgba(200,210,230,0.54);
          font-size: 13px;
          font-weight: 400;
          max-width: 520px;
          line-height: 1.5;
        }

        .sw-refresh-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 22px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(200,210,230,0.8);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(12px);
        }
        .sw-refresh-btn:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.18);
          color: #fff;
        }

        /* ── Error banner ── */
        .sw-error {
          margin-bottom: 24px; padding: 14px 18px;
          border-radius: 16px;
          background: rgba(255,60,80,0.1);
          border: 1px solid rgba(255,60,80,0.25);
          color: #ffb3be;
          font-size: 13px; font-weight: 500;
        }

        /* ── Layout ── */
        .sw-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 270px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .sw-layout { grid-template-columns: 1fr; }
          .sw-sidebar { display: none; }
        }

        /* ── Glass card base ── */
        .sw-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* ── Composer ── */
        .sw-composer {
          padding: 18px;
          margin-bottom: 20px;
          position: relative; overflow: hidden;
        }
        .sw-composer::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(160,120,255,0.5), rgba(0,200,220,0.4), transparent);
        }

        .sw-composer-top {
          display: flex; gap: 14px; align-items: flex-start;
          margin-bottom: 16px;
        }

        .sw-composer-textarea {
          flex: 1; background: transparent; border: none; outline: none;
          color: #e8eaf6; font-family: 'DM Sans', sans-serif;
          font-size: 14px; line-height: 1.55; resize: none;
          width: 100%; min-height: 58px;
          padding: 4px 0;
        }
        .sw-composer-textarea::placeholder { color: rgba(200,210,230,0.3); }

        .sw-composer-divider {
          height: 1px; background: rgba(255,255,255,0.06);
          margin: 0 0 16px;
        }

        .sw-image-input-wrap {
          margin-bottom: 14px;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .sw-image-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #e8eaf6; font-family: 'DM Sans', sans-serif;
          font-size: 13px;
        }
        .sw-image-input::placeholder { color: rgba(200,210,230,0.3); }

        .sw-composer-actions {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }

        .sw-composer-tools {
          display: flex; gap: 8px;
        }

        .sw-tool-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(200,210,230,0.6);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.18s;
        }
        .sw-tool-btn:hover, .sw-tool-btn.active {
          background: rgba(160,120,255,0.12);
          border-color: rgba(160,120,255,0.3);
          color: rgba(180,150,255,0.9);
        }

        .sw-post-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 24px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #0ea5e9);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 8px 24px rgba(99,60,220,0.35);
          white-space: nowrap;
        }
        .sw-post-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(99,60,220,0.5);
        }
        .sw-post-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* ── Feed header ── */
        .sw-feed-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .sw-feed-title {
          font-family: 'Syne', sans-serif;
          font-size: 16px; font-weight: 700;
          letter-spacing: -0.5px; color: #fff;
        }
        .sw-feed-count {
          font-size: 12px; font-weight: 600;
          color: rgba(160,120,255,0.8);
          background: rgba(160,120,255,0.1);
          border: 1px solid rgba(160,120,255,0.2);
          padding: 5px 12px; border-radius: 999px;
        }

        /* ── Post cards ── */
        .sw-post-list { display: flex; flex-direction: column; gap: 14px; }

        .sw-post-card {
          padding: 18px; position: relative; overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sw-post-card:hover {
          transform: translateY(-1px);
          border-color: rgba(129,140,248,0.16);
          box-shadow: 0 16px 42px rgba(0,0,0,0.28);
        }
        .sw-post-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        .sw-post-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .sw-post-user { display: flex; align-items: center; gap: 12px; }
        .sw-post-name {
          font-weight: 700; font-size: 14px; color: #fff;
          font-family: 'DM Sans', sans-serif;
        }
        .sw-post-time {
          font-size: 11px; color: rgba(200,210,230,0.45);
          margin-top: 2px; font-weight: 400;
        }
        .sw-post-badge {
          padding: 4px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 11px; color: rgba(200,210,230,0.5);
          font-weight: 600; cursor: pointer;
        }

        .sw-post-content {
          font-size: 14px; line-height: 1.62;
          color: rgba(226,232,240,0.9);
          white-space: pre-wrap; margin-bottom: 14px;
        }

        .sw-post-image-wrap {
          border-radius: 16px; overflow: hidden;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.07);
          position: relative;
        }
        .sw-post-image {
          width: 100%; display: block;
          max-height: 460px; object-fit: cover;
        }

        .sw-post-stats {
          display: flex; gap: 16px;
          padding: 10px 0; margin-bottom: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sw-stat-item {
          font-size: 12px; font-weight: 600;
          color: rgba(200,210,230,0.5);
          display: flex; align-items: center; gap: 5px;
        }

        .sw-post-actions {
          display: flex; gap: 8px;
        }

        .sw-action-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 9px 10px; border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          color: rgba(200,210,230,0.65);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.18s;
        }
        .sw-action-btn:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(220,225,240,0.9);
          border-color: rgba(255,255,255,0.12);
        }
        .sw-action-btn.liked {
          background: rgba(255,60,120,0.1);
          border-color: rgba(255,60,120,0.25);
          color: #ff6090;
        }
        .sw-action-btn.liked:hover {
          background: rgba(255,60,120,0.16);
        }

        @keyframes heartPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.35); }
          70% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .heart-pop { animation: heartPop 0.5s cubic-bezier(.36,.07,.19,.97); }

        /* ── Sidebar ── */
        .sw-sidebar { display: flex; flex-direction: column; gap: 20px; }

        .sw-side-card { padding: 16px; }

        .sw-side-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.02em; color: rgba(220,225,240,0.7);
          text-transform: uppercase; font-size: 11px; letter-spacing: 0.12em;
          margin-bottom: 18px;
          display: flex; align-items: center; gap: 8px;
        }
        .sw-side-title::before {
          content: '';
          display: inline-block; width: 3px; height: 14px;
          border-radius: 999px;
          background: linear-gradient(180deg, #7c3aed, #0ea5e9);
        }

        .sw-stat-big {
          padding: 20px; border-radius: 16px; text-align: center;
          background: linear-gradient(135deg, rgba(99,60,220,0.2), rgba(0,180,200,0.12));
          border: 1px solid rgba(99,60,220,0.2);
          margin-bottom: 14px;
        }
        .sw-stat-big-num {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 800; color: #fff;
          line-height: 1;
        }
        .sw-stat-big-label {
          font-size: 12px; color: rgba(200,210,230,0.5);
          margin-top: 6px; font-weight: 500;
        }

        .sw-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .sw-chip {
          padding: 7px 13px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 12px; font-weight: 600;
          color: rgba(200,210,230,0.65);
        }

        .sw-idea-list {
          list-style: none;
          display: flex; flex-direction: column; gap: 10px;
        }
        .sw-idea-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; color: rgba(200,210,230,0.65); line-height: 1.5;
        }
        .sw-idea-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          flex-shrink: 0; margin-top: 6px;
        }

        .sw-mood-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }
        .sw-mood-tile {
          padding: 16px 10px; text-align: center;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 13px; font-weight: 600;
          color: rgba(200,210,230,0.65);
          transition: all 0.18s;
          cursor: pointer;
        }
        .sw-mood-tile:hover {
          background: rgba(99,60,220,0.1);
          border-color: rgba(99,60,220,0.25);
          color: rgba(180,150,255,0.9);
        }

        /* ── Loading state ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

        .sw-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.08);
          border-top-color: #7c3aed;
          animation: spin 0.8s linear infinite;
        }
        .sw-loader-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 60px 20px; gap: 14px;
        }
        .sw-loader-text { font-size: 14px; color: rgba(200,210,230,0.5); font-weight: 500; }

        .sw-skeleton {
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }

        /* ── Empty state ── */
        .sw-empty {
          text-align: center; padding: 64px 24px;
        }
        .sw-empty-icon {
          font-size: 52px; margin-bottom: 16px;
          filter: grayscale(0.3);
        }
        .sw-empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 700; color: #fff;
          margin-bottom: 8px;
        }
        .sw-empty-text { font-size: 14px; color: rgba(200,210,230,0.45); }


        .sw-feed-main { min-width: 0; }

        .sw-post-card {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028));
        }

        .sw-post-user-meta {
          min-width: 0;
        }

        .sw-post-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sw-post-menu {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(203,213,225,0.48);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 16px;
          transition: all .18s ease;
        }

        .sw-post-menu:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.07);
          color: rgba(226,232,240,0.86);
        }

        .sw-action-btn .sw-action-icon {
          font-size: 14px;
          line-height: 1;
        }

        .sw-share-toast {
          position: fixed;
          left: 50%;
          bottom: 26px;
          z-index: 1400;
          transform: translateX(-50%);
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(15,23,42,0.94);
          border: 1px solid rgba(129,140,248,0.22);
          box-shadow: 0 14px 40px rgba(0,0,0,.34);
          backdrop-filter: blur(18px);
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 700;
          animation: shareToastIn .18s ease;
        }

        @keyframes shareToastIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .sw-composer-hint {
          font-size: 11px;
          color: rgba(148,163,184,.42);
          margin-left: 56px;
          margin-top: -9px;
          margin-bottom: 12px;
        }

        .sw-refresh-btn {
          padding: 9px 13px;
          border-radius: 11px;
          font-size: 12px;
        }

        .sw-post-btn {
          padding: 9px 16px;
          border-radius: 11px;
          font-size: 12px;
          box-shadow: 0 7px 20px rgba(99,60,220,.24);
        }

        .sw-tool-btn {
          padding: 7px 11px;
          font-size: 11px;
        }

        .sw-image-input-wrap {
          margin-left: 54px;
        }

        .sw-side-card {
          background: rgba(10,15,27,.72);
        }

        @media (max-width: 620px) {
          .sw-inner { padding: 18px 12px 56px; }
          .sw-header { margin-bottom: 16px; padding-bottom: 14px; }
          .sw-subtitle { font-size: 12px; }
          .sw-card { border-radius: 15px; }
          .sw-composer, .sw-post-card { padding: 14px; }
          .sw-post-actions { gap: 6px; }
          .sw-action-btn { font-size: 12px; padding: 9px 7px; }
          .sw-action-btn .action-label { display: none; }
          .sw-composer-actions { align-items: flex-end; }
          .sw-image-input-wrap { margin-left: 0; }
          .sw-composer-hint { margin-left: 0; }
        }


        /* ── Comment panel ── */
        .sw-overlay {
          position: fixed; inset: 0;
          background: rgba(2,5,18,0.75);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex; justify-content: flex-end;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .sw-comment-panel {
          width: 100%; max-width: 460px; height: 100%;
          background: #0a0d1a;
          border-left: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column;
          animation: slideIn 0.28s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .sw-cp-header {
          padding: 24px 22px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .sw-cp-post-preview {
          padding: 14px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; gap: 12px; align-items: flex-start;
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }
        .sw-cp-post-text {
          font-size: 13px; color: rgba(200,210,230,0.6);
          line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sw-cp-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800; color: #fff;
        }
        .sw-cp-sub { font-size: 12px; color: rgba(200,210,230,0.4); margin-top: 3px; }

        .sw-cp-close {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(200,210,230,0.7);
          font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s;
        }
        .sw-cp-close:hover { background: rgba(255,255,255,0.09); color: #fff; }

        .sw-cp-input-row {
          padding: 16px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; gap: 10px; align-items: center;
          flex-shrink: 0;
        }
        .sw-cp-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px; padding: 11px 16px;
          color: #e8eaf6; font-family: 'DM Sans', sans-serif; font-size: 14px;
          outline: none; transition: border-color 0.18s;
        }
        .sw-cp-input:focus { border-color: rgba(99,60,220,0.5); }
        .sw-cp-input::placeholder { color: rgba(200,210,230,0.3); }

        .sw-cp-send {
          padding: 11px 20px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
          white-space: nowrap;
          box-shadow: 0 6px 20px rgba(99,60,220,0.35);
        }
        .sw-cp-send:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(99,60,220,0.5); }
        .sw-cp-send:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .sw-cp-list {
          flex: 1; overflow-y: auto; padding: 18px 22px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .sw-cp-list::-webkit-scrollbar { width: 4px; }
        .sw-cp-list::-webkit-scrollbar-track { background: transparent; }
        .sw-cp-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

        .sw-comment-item { display: flex; gap: 12px; align-items: flex-start; }
        .sw-comment-bubble {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 12px 14px;
        }
        .sw-comment-user { font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 4px; }
        .sw-comment-text { font-size: 13px; color: rgba(220,225,240,0.85); line-height: 1.55; }
        .sw-comment-time { font-size: 11px; color: rgba(200,210,230,0.4); margin-top: 6px; }

        .sw-cp-empty {
          text-align: center; padding: 40px 0;
          font-size: 13px; color: rgba(200,210,230,0.4);
        }
      `}</style>

      <div className="sw-page">
        <div className="sw-mesh" />
        <div className="sw-grid" />

        <div className="sw-inner">
          {/* ── Header ── */}
          <header className="sw-header">
            <div>
              <div className="sw-eyebrow">MeetYourBuddy · Social Wall</div>
              <h1 className="sw-title">Social Wall</h1>
              <p className="sw-subtitle">See what your buddies are up to, share an update, and join the conversation.</p>
            </div>
            <button className="sw-refresh-btn" onClick={loadPosts}>
              <span style={{ fontSize: 16 }}>↻</span> Refresh
            </button>
          </header>

          {errorMessage && (
            <div className="sw-error">⚠ {errorMessage}</div>
          )}

          <div className="sw-layout">
            {/* ── Left column ── */}
            <div className="sw-feed-main">
              {/* Composer */}
              <div className="sw-card sw-composer">
                <div className="sw-composer-top">
                  <Avatar name={currentUser?.name || 'Me'} src={currentUser?.image} size={42} />
                  <textarea
                    ref={textareaRef}
                    className="sw-composer-textarea"
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    onInput={e => {
                      const el = e.currentTarget
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }}
                    placeholder="What's on your mind today?"
                    rows={3}
                  />
                </div>
                <div className="sw-composer-hint">
                  Share an update, a small win, a plan, or ask the community something.
                </div>

                {showImageInput && (
                  <div className="sw-image-input-wrap">
                    <span style={{ fontSize: 14, opacity: 0.5 }}>🖼</span>
                    <input
                      className="sw-image-input"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="Paste an image URL..."
                    />
                    <button
                      className="sw-tool-btn"
                      onClick={() => { setShowImageInput(false); setImageUrl('') }}
                      style={{ padding: '4px 10px', fontSize: 12 }}
                    >✕</button>
                  </div>
                )}

                <div className="sw-composer-divider" />

                <div className="sw-composer-actions">
                  <div className="sw-composer-tools">
                    <button
                      className={`sw-tool-btn${showImageInput ? ' active' : ''}`}
                      onClick={() => setShowImageInput(v => !v)}
                    >
                      🖼 Image
                    </button>
                    <button
                      className="sw-tool-btn"
                      onClick={() => {
                        setNewPost(value => value ? `${value} ✨` : 'Feeling motivated today ✨')
                        textareaRef.current?.focus()
                      }}
                    >
                      😊 Mood
                    </button>
                  </div>

                  <button
                    className="sw-post-btn"
                    onClick={handleCreatePost}
                    disabled={posting || (!newPost.trim() && !imageUrl.trim())}
                  >
                    {posting ? (
                      <>
                        <div className="sw-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        Posting…
                      </>
                    ) : 'Post Now →'}
                  </button>
                </div>
              </div>

              {/* Feed */}
              <div className="sw-feed-header">
                <h2 className="sw-feed-title">Community Feed</h2>
                <span className="sw-feed-count">{posts.length} posts</span>
              </div>

              {loading ? (
                <div className="sw-loader-wrap">
                  <div className="sw-spinner" />
                  <p className="sw-loader-text">Loading the wall…</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="sw-card sw-empty">
                  <div className="sw-empty-icon">📭</div>
                  <div className="sw-empty-title">Nothing here yet</div>
                  <div className="sw-empty-text">Be the first to light up the social wall.</div>
                </div>
              ) : (
                <div className="sw-post-list">
                  {posts.map(post => (
                    <div key={post.id} className="sw-card sw-post-card">
                      <div className="sw-post-header">
                        <div className="sw-post-user">
                          <Avatar name={post.userName} src={post.userImage} size={42} />
                          <div className="sw-post-user-meta">
                            <div className="sw-post-name">{post.userName || 'Unknown'}</div>
                            <div className="sw-post-time">{formatTime(post.createdDate)}</div>
                          </div>
                        </div>
                        <button className="sw-post-menu" type="button" aria-label="More post options">•••</button>
                      </div>

                      <div className="sw-post-content">{post.content}</div>

                      {post.imageUrl && (
                        <div className="sw-post-image-wrap">
                          <img src={post.imageUrl} alt="" className="sw-post-image" />
                        </div>
                      )}

                      <div className="sw-post-stats">
                        <span className="sw-stat-item">
                          <span style={{ fontSize: 13 }}>♥</span>
                          {post.likesCount || 0} likes
                        </span>
                        <span className="sw-stat-item">
                          <span style={{ fontSize: 13 }}>◎</span>
                          {post.commentsCount || 0} comments
                        </span>
                      </div>

                      <div className="sw-post-actions">
                        <button
                          className={`sw-action-btn${post.isLiked ? ' liked' : ''}`}
                          onClick={() => handleLike(post.id)}
                        >
                          <span className={`sw-action-icon ${likeAnimId === post.id ? 'heart-pop' : ''}`}>
                            {post.isLiked ? '♥' : '♡'}
                          </span>
                          <span className="action-label">{post.isLiked ? 'Liked' : 'Like'}</span>
                        </button>
                        <button
                          className="sw-action-btn"
                          onClick={() => loadComments(post.id)}
                        >
                          <span className="sw-action-icon">◎</span>
                          <span className="action-label">Comment</span>
                        </button>
                        <button
                          className="sw-action-btn"
                          onClick={() => handleShare(post)}
                          type="button"
                        >
                          <span className="sw-action-icon">↗</span>
                          <span className="action-label">Share</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="sw-sidebar">
              <div className="sw-card sw-side-card">
                <div className="sw-side-title">Social Pulse</div>
                <div className="sw-stat-big">
                  <div className="sw-stat-big-num">{posts.length}</div>
                  <div className="sw-stat-big-label">Total Posts</div>
                </div>
                <div className="sw-chips">
                  <span className="sw-chip">🔥 Trending</span>
                  <span className="sw-chip">💬 Active</span>
                  <span className="sw-chip">✨ Fresh</span>
                </div>
              </div>

              <div className="sw-card sw-side-card">
                <div className="sw-side-title">Wall Ideas</div>
                <ul className="sw-idea-list">
                  {[
                    'Share your gym transformation',
                    'Post your travel snapshot',
                    'Ask buddies for recommendations',
                    'Celebrate your small wins',
                  ].map(idea => (
                    <li key={idea} className="sw-idea-item">
                      <span className="sw-idea-dot" />
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="sw-card sw-side-card">
                <div className="sw-side-title">Mood Board</div>
                <div className="sw-mood-grid">
                  {['Music', 'Travel', 'Fitness', 'Study'].map(m => (
                    <div key={m} className="sw-mood-tile">{m}</div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* ── Comment Panel ── */}
      {shareToast && (
        <div className="sw-share-toast" role="status" aria-live="polite">
          ✓ {shareToast}
        </div>
      )}

      {selectedPostId !== null && (
        <div className="sw-overlay" onClick={() => setSelectedPostId(null)}>
          <div className="sw-comment-panel" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sw-cp-header">
              <div>
                <div className="sw-cp-title">Comments</div>
                <div className="sw-cp-sub">Join the conversation</div>
              </div>
              <button className="sw-cp-close" onClick={() => setSelectedPostId(null)}>✕</button>
            </div>

            {/* Post preview */}
            {selectedPost && (
              <div className="sw-cp-post-preview">
                <Avatar name={selectedPost.userName} src={selectedPost.userImage} size={34} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(220,225,240,0.7)', marginBottom: 3 }}>
                    {selectedPost.userName}
                  </div>
                  <div className="sw-cp-post-text">{selectedPost.content}</div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="sw-cp-input-row">
              <Avatar name={currentUser?.name || 'Me'} src={currentUser?.image} size={34} />
              <input
                ref={commentInputRef}
                className="sw-cp-input"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                placeholder="Write a comment…"
              />
              <button
                className="sw-cp-send"
                onClick={handleAddComment}
                disabled={commentPosting || !commentText.trim()}
              >
                {commentPosting ? '…' : 'Send'}
              </button>
            </div>

            {/* Comment list */}
            <div className="sw-cp-list">
              {commentLoading ? (
                <div className="sw-loader-wrap" style={{ padding: '30px 0' }}>
                  <div className="sw-spinner" />
                  <p className="sw-loader-text">Loading…</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="sw-cp-empty">No comments yet — be the first! 💬</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="sw-comment-item">
                    <Avatar name={c.userName} src={c.userImage} size={36} />
                    <div className="sw-comment-bubble">
                      <div className="sw-comment-user">{c.userName || 'User'}</div>
                      <div className="sw-comment-text">{c.comment}</div>
                      <div className="sw-comment-time">{formatTime(c.createdDate)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}