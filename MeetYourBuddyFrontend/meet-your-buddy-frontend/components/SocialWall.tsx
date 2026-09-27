'use client'

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useRouter } from 'next/navigation'

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

type CurrentUser = {
  name?: string
  image?: string
}

const API_BASE = (
  process.env.NEXT_PUBLIC_SOCIALWALL_API ||
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'https://localhost:7169'
    : '')
).replace(/\/+$/, '')

const SOCIALWALL_ROUTE = '/api/SocialWall'
const REQUEST_TIMEOUT_MS = 15_000
const POSTS_PAGE_SIZE = 30

function socialWallUrl(path: string): string {
  if (!API_BASE) {
    throw new Error(
      'Social Wall API is not configured. Set NEXT_PUBLIC_SOCIALWALL_API.',
    )
  }

  return `${API_BASE}${SOCIALWALL_ROUTE}${path}`
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length !== 2) return ''

  try {
    return decodeURIComponent(parts.pop()!.split(';').shift() || '')
  } catch {
    return ''
  }
}

function getAuthToken(): string {
  if (typeof window === 'undefined') return ''

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

function readCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null

  try {
    const raw =
      getCookie('user') ||
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      ''

    if (!raw) return null

    const user = JSON.parse(raw) as Record<string, unknown>
    const firstName = String(user.firstName ?? user.first_name ?? '')
    const lastName = String(user.lastName ?? user.last_name ?? '')

    const fullName =
      String(user.fullName ?? user.name ?? '').trim() ||
      [firstName, lastName].filter(Boolean).join(' ')

    const image = String(
      user.profileImage ??
        user.profileImageUrl ??
        user.image ??
        user.userImage ??
        '',
    )

    return {
      name: fullName || 'Me',
      image: image || undefined,
    }
  } catch {
    return null
  }
}

function normalizePost(item: Record<string, unknown>): Post {
  return {
    id: Number(item.id ?? item.Id ?? item.postId ?? item.PostId ?? 0),
    userId: Number(item.userId ?? item.UserId ?? 0) || undefined,
    userName:
      String(
        item.userName ??
          item.UserName ??
          item.fullName ??
          item.FullName ??
          '',
      ) || undefined,
    userImage:
      String(
        item.userPhoto ??
          item.UserPhoto ??
          item.userImage ??
          item.UserImage ??
          item.profileImage ??
          item.ProfileImage ??
          '',
      ) || undefined,
    content: String(item.content ?? item.Content ?? ''),
    imageUrl:
      String(item.imageUrl ?? item.ImageUrl ?? '') || undefined,
    createdDate:
      String(item.createdDate ?? item.CreatedDate ?? '') || undefined,
    likesCount: Number(
      item.likesCount ??
        item.LikesCount ??
        item.likeCount ??
        item.LikeCount ??
        0,
    ),
    commentsCount: Number(
      item.commentsCount ??
        item.CommentsCount ??
        item.commentCount ??
        item.CommentCount ??
        0,
    ),
    isLiked: Boolean(
      item.isLikedByMe ??
        item.IsLikedByMe ??
        item.isLiked ??
        item.IsLiked ??
        false,
    ),
  }
}

function normalizeComment(
  item: Record<string, unknown>,
): CommentItem {
  return {
    id: Number(
      item.id ??
        item.Id ??
        item.commentId ??
        item.CommentId ??
        0,
    ),
    userId: Number(item.userId ?? item.UserId ?? 0) || undefined,
    userName:
      String(
        item.userName ??
          item.UserName ??
          item.fullName ??
          item.FullName ??
          '',
      ) || undefined,
    userImage:
      String(
        item.userImage ??
          item.UserImage ??
          item.profileImage ??
          item.ProfileImage ??
          '',
      ) || undefined,
    comment: String(
      item.comment ??
        item.Comment ??
        item.content ??
        item.Content ??
        '',
    ),
    createdDate:
      String(item.createdDate ?? item.CreatedDate ?? '') || undefined,
  }
}

async function readJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRecordValue(
  value: unknown,
  keys: readonly string[],
): unknown {
  if (!isRecord(value)) return undefined

  for (const key of keys) {
    if (key in value) return value[key]
  }

  return undefined
}

function extractArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  if (!isRecord(result)) return []

  const data = getRecordValue(result, ['data', 'Data'])
  const nestedData = isRecord(data)
    ? getRecordValue(data, ['data', 'Data'])
    : undefined

  const candidates: unknown[] = [
    isRecord(data) ? getRecordValue(data, ['items', 'Items']) : undefined,
    isRecord(data) ? getRecordValue(data, ['posts', 'Posts']) : undefined,
    isRecord(data) ? getRecordValue(data, ['comments', 'Comments']) : undefined,
    nestedData,
    data,
    getRecordValue(result, ['items', 'Items']),
    getRecordValue(result, ['posts', 'Posts']),
    getRecordValue(result, ['comments', 'Comments']),
    getRecordValue(result, ['result', 'Result']),
    getRecordValue(result, ['value', 'Value']),
  ]

  return candidates.find(Array.isArray) ?? []
}

function getApiMessage(
  body: unknown,
  fallback: string,
): string {
  if (typeof body === 'string' && body.trim()) {
    return body.trim()
  }

  const message = getRecordValue(body, ['message', 'Message'])

  return typeof message === 'string' && message.trim()
    ? message.trim()
    : fallback
}

function getApiCode(body: unknown): number | null {
  const code = getRecordValue(body, ['code', 'Code'])

  if (typeof code === 'number' && Number.isFinite(code)) {
    return code
  }

  if (typeof code === 'string' && code.trim()) {
    const parsed = Number(code)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function ensureSuccessfulEnvelope(
  body: unknown,
  fallbackMessage: string,
): void {
  const code = getApiCode(body)

  if (code !== null && code !== 1) {
    throw new Error(getApiMessage(body, fallbackMessage))
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  )

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'The server took too long to respond. Please try again.',
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : ''
  } catch {
    return ''
  }
}

function getInitials(name?: string) {
  if (!name) return 'U'

  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U'

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function formatTime(date?: string) {
  if (!date) return 'Just now'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return 'Just now'

  const diff = Math.max(0, Date.now() - parsed.getTime())
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)

  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)

  if (days < 7) return `${days}d ago`

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function Avatar({
  src,
  name,
  size = 44,
  style = {},
}: {
  src?: string
  name?: string
  size?: number
  style?: CSSProperties
}) {
  const initials = getInitials(name)
  const hue = ((name?.charCodeAt(0) || 0) * 37) % 360

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile` : 'Profile'}
        loading="lazy"
        referrerPolicy="no-referrer"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
      />
    )
  }

  return (
    <div
      aria-label={name || 'User'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue + 60) % 360},70%,45%))`,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: size * 0.34,
        color: '#fff',
        letterSpacing: '-0.5px',
        ...style,
      }}
    >
      {initials}
    </div>
  )
}

export default function SocialWallPage() {
  const router = useRouter()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const commentInputRef = useRef<HTMLInputElement | null>(null)
  const shareTimerRef = useRef<number | null>(null)
  const likeTimerRef = useRef<number | null>(null)

  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const [newPost, setNewPost] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)

  const [selectedPostId, setSelectedPostId] =
    useState<number | null>(null)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentPosting, setCommentPosting] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [likeAnimId, setLikeAnimId] =
    useState<number | null>(null)
  const [likingIds, setLikingIds] =
    useState<Set<number>>(new Set())
  const [shareToast, setShareToast] = useState('')

  useEffect(() => {
    const savedToken = getAuthToken()

    setToken(savedToken)
    setCurrentUser(readCurrentUser())

    if (!savedToken) {
      setErrorMessage('Login token not found. Please sign in again.')
      setLoading(false)
      router.replace('/login')
    }

    return () => {
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current)
      }

      if (likeTimerRef.current !== null) {
        window.clearTimeout(likeTimerRef.current)
      }
    }
  }, [router])

  const authHeaders = useMemo<Record<string, string>>(
    () => ({
      Accept: 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    }),
    [token],
  )

  const jsonHeaders = useMemo(
    () => ({
      ...authHeaders,
      'Content-Type': 'application/json',
    }),
    [authHeaders],
  )

  const handleUnauthorized = useCallback(() => {
    ;['token', 'authToken', 'accessToken'].forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`
    })

    setErrorMessage('Your session has expired. Please sign in again.')
    router.replace('/login')
  }, [router])

  const handleApiError = useCallback(
    async (
      response: Response,
      defaultMessage: string,
    ) => {
      const body = await readJsonSafely(response)

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error('Your session has expired.')
      }

      const message = getApiMessage(
        body,
        defaultMessage,
      )

      throw new Error(
        `${message} (${response.status})`,
      )
    },
    [handleUnauthorized],
  )

  const loadPosts = useCallback(async () => {
    const activeToken = token || getAuthToken()

    if (!activeToken) {
      setLoading(false)
      handleUnauthorized()
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      const response = await fetchWithTimeout(
        socialWallUrl(
          `/posts?pageNumber=1&pageSize=${POSTS_PAGE_SIZE}`,
        ),
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
        },
      )

      if (!response.ok) {
        await handleApiError(
          response,
          'Failed to fetch posts',
        )
      }

      const result = await readJsonSafely(response)

      ensureSuccessfulEnvelope(
        result,
        'Failed to fetch posts',
      )

      const extracted = extractArray(result)

      setPosts(
        extracted
          .filter(isRecord)
          .map(normalizePost)
          .filter(post => post.id > 0),
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to fetch posts',
      )
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [token, handleApiError, handleUnauthorized])

  useEffect(() => {
    if (token) {
      void loadPosts()
    }
  }, [token, loadPosts])

  const handleCreatePost = async () => {
    const content = newPost.trim()
    const rawImage = imageUrl.trim()
    const image = rawImage
      ? normalizeHttpUrl(rawImage)
      : ''

    if (!content && !rawImage) return

    if (rawImage && !image) {
      setErrorMessage(
        'Image URL must start with http:// or https://.',
      )
      return
    }

    try {
      setPosting(true)
      setErrorMessage('')

      const response = await fetchWithTimeout(
        socialWallUrl('/posts'),
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            content,
            imageUrl: image,
          }),
        },
      )

      if (!response.ok) {
        await handleApiError(
          response,
          'Failed to create post',
        )
      }

      const result = await readJsonSafely(response)

      ensureSuccessfulEnvelope(
        result,
        'Failed to create post',
      )

      setNewPost('')
      setImageUrl('')
      setShowImageInput(false)

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      await loadPosts()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to create post',
      )
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: number) => {
    if (likingIds.has(postId)) return

    const previousPost = posts.find(
      post => post.id === postId,
    )

    if (!previousPost) return

    setLikingIds(current => {
      const next = new Set(current)
      next.add(postId)
      return next
    })

    setLikeAnimId(postId)

    if (likeTimerRef.current !== null) {
      window.clearTimeout(likeTimerRef.current)
    }

    likeTimerRef.current = window.setTimeout(
      () => setLikeAnimId(null),
      550,
    )

    setPosts(current =>
      current.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: Math.max(
                0,
                (post.likesCount || 0) +
                  (post.isLiked ? -1 : 1),
              ),
            }
          : post,
      ),
    )

    try {
      const response = await fetchWithTimeout(
        socialWallUrl(`/posts/${postId}/like`),
        {
          method: 'POST',
          headers: authHeaders,
        },
      )

      if (!response.ok) {
        await handleApiError(
          response,
          'Failed to update like',
        )
      }

      const result = await readJsonSafely(response)

      ensureSuccessfulEnvelope(
        result,
        'Failed to update like',
      )
    } catch (error) {
      setPosts(current =>
        current.map(post =>
          post.id === postId
            ? previousPost
            : post,
        ),
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update like',
      )
    } finally {
      setLikingIds(current => {
        const next = new Set(current)
        next.delete(postId)
        return next
      })
    }
  }

  const loadComments = async (postId: number) => {
    setSelectedPostId(postId)
    setCommentLoading(true)
    setComments([])
    setErrorMessage('')

    try {
      const response = await fetchWithTimeout(
        socialWallUrl(`/posts/${postId}/comments`),
        {
          cache: 'no-store',
          headers: authHeaders,
        },
      )

      if (!response.ok) {
        await handleApiError(
          response,
          'Failed to load comments',
        )
      }

      const result = await readJsonSafely(response)

      ensureSuccessfulEnvelope(
        result,
        'Failed to load comments',
      )

      const extracted = extractArray(result)

      setComments(
        extracted
          .filter(isRecord)
          .map(normalizeComment)
          .filter(comment => comment.id > 0),
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load comments',
      )
      setComments([])
    } finally {
      setCommentLoading(false)
      window.setTimeout(
        () => commentInputRef.current?.focus(),
        120,
      )
    }
  }

  const handleAddComment = async () => {
    const comment = commentText.trim()

    if (!selectedPostId || !comment) return

    try {
      setCommentPosting(true)
      setErrorMessage('')

      const response = await fetchWithTimeout(
        socialWallUrl(
          `/posts/${selectedPostId}/comments`,
        ),
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ comment }),
        },
      )

      if (!response.ok) {
        await handleApiError(
          response,
          'Failed to add comment',
        )
      }

      const result = await readJsonSafely(response)

      ensureSuccessfulEnvelope(
        result,
        'Failed to add comment',
      )

      setCommentText('')

      await Promise.all([
        loadComments(selectedPostId),
        loadPosts(),
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to add comment',
      )
    } finally {
      setCommentPosting(false)
    }
  }

  const showShareToast = (message: string) => {
    setShareToast(message)

    if (shareTimerRef.current !== null) {
      window.clearTimeout(shareTimerRef.current)
    }

    shareTimerRef.current = window.setTimeout(
      () => setShareToast(''),
      2200,
    )
  }

  const handleShare = async (post: Post) => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard?post=${post.id}`
        : ''

    const text = post.content?.trim() || ''

    const shareText = text
      ? `${post.userName || 'A buddy'} shared: ${text.slice(0, 140)}${text.length > 140 ? '…' : ''}`
      : `Check out this post from ${post.userName || 'MeetYourBuddy'}.`

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.share
      ) {
        await navigator.share({
          title: `MeetYourBuddy · ${post.userName || 'Social Wall'}`,
          text: shareText,
          url: shareUrl,
        })

        showShareToast('Post shared')
        return
      }

      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          `${shareText}\n${shareUrl}`,
        )

        showShareToast('Post link copied')
        return
      }

      const textarea = document.createElement('textarea')
      textarea.value = `${shareText}\n${shareUrl}`
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()

      showShareToast('Post link copied')
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }

      showShareToast('Could not share this post')
    }
  }

  const selectedPost = posts.find(
    post => post.id === selectedPostId,
  )

  useEffect(() => {
    if (selectedPostId === null) return

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPostId(null)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPostId])

  return (
    <>
      <style>{`
        .sw-root {
          width: 100%;
          color: #e8eaf6;
        }

        .sw-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .sw-eyebrow {
          color: rgba(165,180,252,.85);
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .15em;
          margin-bottom: 8px;
        }

        .sw-title {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(25px,3vw,34px);
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .sw-subtitle {
          margin: 8px 0 0;
          color: rgba(148,163,184,.64);
          font-size: 13px;
          line-height: 1.55;
          max-width: 580px;
        }

        .sw-refresh {
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: #cbd5e1;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .sw-error {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 13px;
          border: 1px solid rgba(248,113,113,.20);
          background: rgba(248,113,113,.08);
          color: #fecaca;
          font-size: 12px;
          line-height: 1.5;
        }

        .sw-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 280px;
          gap: 20px;
          align-items: start;
        }

        .sw-feed {
          min-width: 0;
        }

        .sw-card {
          border: 1px solid rgba(255,255,255,.075);
          background:
            linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025));
          border-radius: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,.10);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .sw-composer {
          padding: 17px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .sw-composer::before {
          content: "";
          position: absolute;
          left: 12%;
          right: 12%;
          top: 0;
          height: 1px;
          background:
            linear-gradient(90deg,transparent,rgba(129,140,248,.6),rgba(34,211,238,.42),transparent);
        }

        .sw-composer-main {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .sw-composer-textarea {
          flex: 1;
          min-width: 0;
          min-height: 72px;
          max-height: 220px;
          resize: none;
          overflow-y: auto;
          border: 0;
          outline: 0;
          background: transparent;
          color: #e2e8f0;
          padding: 4px 0;
          font: inherit;
          font-size: 14px;
          line-height: 1.55;
        }

        .sw-composer-textarea::placeholder,
        .sw-image-input::placeholder,
        .sw-comment-input::placeholder {
          color: rgba(100,116,139,.60);
        }

        .sw-composer-hint {
          margin: -2px 0 13px 54px;
          color: rgba(100,116,139,.70);
          font-size: 10px;
        }

        .sw-image-input-row {
          margin: 0 0 14px 54px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .sw-image-input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #e2e8f0;
          font: inherit;
          font-size: 12px;
        }

        .sw-divider {
          height: 1px;
          margin: 0 0 13px;
          background: rgba(255,255,255,.055);
        }

        .sw-composer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .sw-composer-tools {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .sw-tool,
        .sw-post-button {
          min-height: 38px;
          border-radius: 11px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          transition: .18s ease;
        }

        .sw-tool {
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.035);
          color: rgba(203,213,225,.72);
        }

        .sw-tool:hover,
        .sw-tool.active {
          color: #c7d2fe;
          background: rgba(99,102,241,.10);
          border-color: rgba(129,140,248,.22);
        }

        .sw-post-button {
          padding: 0 17px;
          border: 0;
          color: white;
          background: linear-gradient(135deg,#6366f1,#3b82f6,#22d3ee);
          box-shadow: 0 8px 25px rgba(99,102,241,.24);
        }

        .sw-post-button:disabled {
          opacity: .45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .sw-feed-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 14px;
        }

        .sw-feed-heading h2 {
          margin: 0;
          color: #f8fafc;
          font-size: 15px;
          letter-spacing: -.02em;
        }

        .sw-feed-count {
          padding: 5px 10px;
          border-radius: 999px;
          color: #a5b4fc;
          background: rgba(99,102,241,.10);
          border: 1px solid rgba(99,102,241,.18);
          font-size: 10px;
          font-weight: 800;
        }

        .sw-post-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .sw-post {
          padding: 17px;
          overflow: hidden;
          transition: border-color .18s ease, transform .18s ease;
        }

        .sw-post:hover {
          border-color: rgba(129,140,248,.14);
          transform: translateY(-1px);
        }

        .sw-post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 13px;
        }

        .sw-user {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .sw-user-copy {
          min-width: 0;
        }

        .sw-user-name {
          color: #f8fafc;
          font-size: 13px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sw-user-time {
          margin-top: 2px;
          color: rgba(148,163,184,.52);
          font-size: 10px;
        }

        .sw-menu-button {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(148,163,184,.6);
          cursor: pointer;
        }

        .sw-menu-button:hover {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.06);
        }

        .sw-post-content {
          color: rgba(226,232,240,.88);
          font-size: 13px;
          line-height: 1.62;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          margin-bottom: 13px;
        }

        .sw-post-content:empty {
          display: none;
        }

        .sw-post-image-wrap {
          margin-bottom: 14px;
          overflow: hidden;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(0,0,0,.16);
        }

        .sw-post-image {
          width: 100%;
          max-height: 520px;
          display: block;
          object-fit: cover;
        }

        .sw-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 9px 0;
          margin-bottom: 9px;
          border-top: 1px solid rgba(255,255,255,.05);
          border-bottom: 1px solid rgba(255,255,255,.05);
          color: rgba(148,163,184,.58);
          font-size: 10px;
          font-weight: 700;
        }

        .sw-actions {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 7px;
        }

        .sw-action {
          min-width: 0;
          height: 39px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: rgba(203,213,225,.66);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          transition: .18s ease;
        }

        .sw-action:hover:not(:disabled) {
          color: #e2e8f0;
          background: rgba(255,255,255,.05);
        }

        .sw-action:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        .sw-action.liked {
          color: #fb7185;
          background: rgba(244,63,94,.08);
          border-color: rgba(244,63,94,.18);
        }

        @keyframes swHeart {
          40% { transform: scale(1.35); }
          70% { transform: scale(.92); }
        }

        .sw-heart-pop {
          animation: swHeart .48s ease;
        }

        .sw-side {
          position: sticky;
          top: 86px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sw-side-card {
          padding: 16px;
        }

        .sw-side-title {
          margin-bottom: 13px;
          color: rgba(203,213,225,.70);
          text-transform: uppercase;
          letter-spacing: .11em;
          font-size: 10px;
          font-weight: 900;
        }

        .sw-pulse {
          padding: 18px 14px;
          border-radius: 14px;
          text-align: center;
          background:
            linear-gradient(135deg,rgba(99,102,241,.16),rgba(34,211,238,.08));
          border: 1px solid rgba(99,102,241,.16);
        }

        .sw-pulse strong {
          display: block;
          color: #fff;
          font-size: 27px;
          line-height: 1;
        }

        .sw-pulse span {
          display: block;
          margin-top: 5px;
          color: rgba(148,163,184,.65);
          font-size: 10px;
        }

        .sw-chips {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .sw-chip {
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.03);
          color: rgba(203,213,225,.62);
          font-size: 10px;
          font-weight: 700;
        }

        .sw-idea-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sw-idea-list li {
          display: flex;
          gap: 8px;
          color: rgba(203,213,225,.62);
          font-size: 11px;
          line-height: 1.45;
        }

        .sw-idea-list li::before {
          content: "";
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          margin-top: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg,#818cf8,#22d3ee);
        }

        .sw-loader,
        .sw-empty {
          min-height: 220px;
          display: grid;
          place-items: center;
          text-align: center;
          color: rgba(148,163,184,.58);
        }

        .sw-spinner {
          width: 34px;
          height: 34px;
          margin: 0 auto 10px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,.07);
          border-top-color: #818cf8;
          animation: swSpin .8s linear infinite;
        }

        @keyframes swSpin {
          to { transform: rotate(360deg); }
        }

        .sw-empty strong {
          display: block;
          margin-bottom: 6px;
          color: #f8fafc;
          font-size: 17px;
        }

        .sw-share-toast {
          position: fixed;
          left: 50%;
          bottom: 22px;
          z-index: 1500;
          transform: translateX(-50%);
          padding: 10px 13px;
          border-radius: 12px;
          border: 1px solid rgba(129,140,248,.20);
          background: rgba(15,23,42,.96);
          color: #e2e8f0;
          box-shadow: 0 14px 40px rgba(0,0,0,.35);
          font-size: 11px;
          font-weight: 800;
        }

        .sw-overlay {
          position: fixed;
          inset: 0;
          z-index: 1200;
          background: rgba(2,6,23,.72);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          display: flex;
          justify-content: flex-end;
        }

        .sw-comments {
          width: min(470px,100%);
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #090e1c;
          border-left: 1px solid rgba(255,255,255,.07);
          box-shadow: -20px 0 60px rgba(0,0,0,.35);
        }

        .sw-comments-header {
          padding: 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sw-comments-header strong {
          color: #f8fafc;
          font-size: 18px;
        }

        .sw-comments-header span {
          display: block;
          margin-top: 2px;
          color: rgba(148,163,184,.55);
          font-size: 10px;
        }

        .sw-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: #cbd5e1;
          cursor: pointer;
        }

        .sw-post-preview {
          padding: 13px 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          gap: 10px;
          background: rgba(255,255,255,.018);
        }

        .sw-post-preview > div {
          min-width: 0;
        }

        .sw-post-preview strong {
          display: block;
          color: #e2e8f0;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .sw-post-preview p {
          margin: 0;
          color: rgba(148,163,184,.60);
          font-size: 11px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sw-comment-composer {
          padding: 13px 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .sw-comment-input {
          flex: 1;
          min-width: 0;
          height: 41px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: #e2e8f0;
          outline: 0;
          padding: 0 12px;
          font: inherit;
          font-size: 12px;
        }

        .sw-comment-input:focus {
          border-color: rgba(129,140,248,.38);
        }

        .sw-comment-send {
          height: 41px;
          padding: 0 14px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(135deg,#6366f1,#22d3ee);
          color: white;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .sw-comment-send:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .sw-comment-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 16px 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .sw-comment-item {
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .sw-comment-bubble {
          min-width: 0;
          flex: 1;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.035);
        }

        .sw-comment-bubble strong {
          color: #f8fafc;
          font-size: 11px;
        }

        .sw-comment-bubble p {
          margin: 4px 0 0;
          color: rgba(226,232,240,.80);
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .sw-comment-bubble span {
          display: block;
          margin-top: 5px;
          color: rgba(148,163,184,.45);
          font-size: 9px;
        }

        @media (max-width: 1100px) {
          .sw-layout {
            grid-template-columns: minmax(0,1fr);
          }

          .sw-side {
            display: none;
          }
        }

        @media (max-width: 700px) {
          .sw-header {
            align-items: flex-start;
            margin-bottom: 14px;
            padding-bottom: 14px;
          }

          .sw-refresh {
            width: 40px;
            min-width: 40px;
            padding: 0;
            font-size: 0;
          }

          .sw-refresh::after {
            content: "↻";
            font-size: 17px;
          }

          .sw-subtitle {
            font-size: 11px;
          }

          .sw-card {
            border-radius: 15px;
          }

          .sw-composer,
          .sw-post {
            padding: 13px;
          }

          .sw-composer-hint,
          .sw-image-input-row {
            margin-left: 0;
          }

          .sw-composer-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .sw-composer-tools {
            width: 100%;
          }

          .sw-tool {
            flex: 1;
          }

          .sw-post-button {
            width: 100%;
          }

          .sw-comments {
            width: 100%;
            height: min(92svh,760px);
            margin-top: auto;
            border-left: 0;
            border-top: 1px solid rgba(255,255,255,.08);
            border-radius: 20px 20px 0 0;
          }

          .sw-overlay {
            align-items: flex-end;
          }
        }

        @media (max-width: 480px) {
          .sw-title {
            font-size: 25px;
          }

          .sw-composer-main {
            gap: 9px;
          }

          .sw-composer-textarea {
            min-height: 64px;
            font-size: 13px;
          }

          .sw-actions {
            gap: 5px;
          }

          .sw-action {
            height: 37px;
            padding: 0;
          }

          .sw-action-label {
            display: none;
          }

          .sw-post-image-wrap {
            margin-left: -13px;
            margin-right: -13px;
            border-left: 0;
            border-right: 0;
            border-radius: 0;
          }

          .sw-comment-composer {
            padding: 11px;
          }

          .sw-comment-list {
            padding: 14px 12px 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <section className="sw-root">
        <header className="sw-header">
          <div>
            <div className="sw-eyebrow">
              MeetYourBuddy · Community
            </div>

            <h1 className="sw-title">Social Wall</h1>

            <p className="sw-subtitle">
              Share updates, celebrate small wins, and stay connected with your buddy community.
            </p>
          </div>

          <button
            type="button"
            className="sw-refresh"
            onClick={() => void loadPosts()}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </header>

        {!!errorMessage && (
          <div className="sw-error" role="alert">
            ⚠ {errorMessage}
          </div>
        )}

        <div className="sw-layout">
          <div className="sw-feed">
            <section className="sw-card sw-composer">
              <div className="sw-composer-main">
                <Avatar
                  name={currentUser?.name || 'Me'}
                  src={currentUser?.image}
                  size={42}
                />

                <textarea
                  ref={textareaRef}
                  className="sw-composer-textarea"
                  value={newPost}
                  maxLength={1200}
                  onChange={event =>
                    setNewPost(event.target.value)
                  }
                  onInput={event => {
                    const element = event.currentTarget
                    element.style.height = 'auto'
                    element.style.height = `${Math.min(
                      element.scrollHeight,
                      220,
                    )}px`
                  }}
                  placeholder="What's happening in your world?"
                  rows={3}
                />
              </div>

              <div className="sw-composer-hint">
                Share a plan, question, small win, or something your buddies might enjoy.
              </div>

              {showImageInput && (
                <div className="sw-image-input-row">
                  <span>🖼</span>

                  <input
                    className="sw-image-input"
                    value={imageUrl}
                    onChange={event =>
                      setImageUrl(event.target.value)
                    }
                    placeholder="Paste an image URL…"
                    inputMode="url"
                  />

                  <button
                    type="button"
                    className="sw-tool"
                    onClick={() => {
                      setShowImageInput(false)
                      setImageUrl('')
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="sw-divider" />

              <div className="sw-composer-actions">
                <div className="sw-composer-tools">
                  <button
                    type="button"
                    className={`sw-tool ${showImageInput ? 'active' : ''}`}
                    onClick={() =>
                      setShowImageInput(value => !value)
                    }
                  >
                    🖼 Image
                  </button>

                  <button
                    type="button"
                    className="sw-tool"
                    onClick={() => {
                      setNewPost(value =>
                        value
                          ? `${value} ✨`
                          : 'Feeling motivated today ✨',
                      )
                      textareaRef.current?.focus()
                    }}
                  >
                    😊 Mood
                  </button>
                </div>

                <button
                  type="button"
                  className="sw-post-button"
                  onClick={() => void handleCreatePost()}
                  disabled={
                    posting ||
                    (!newPost.trim() && !imageUrl.trim())
                  }
                >
                  {posting ? 'Posting…' : 'Post Now →'}
                </button>
              </div>
            </section>

            <div className="sw-feed-heading">
              <h2>Community Feed</h2>
              <span className="sw-feed-count">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>

            {loading ? (
              <div className="sw-loader">
                <div>
                  <div className="sw-spinner" />
                  Loading the wall…
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="sw-card sw-empty">
                <div>
                  <strong>Nothing here yet</strong>
                  Be the first to light up the social wall.
                </div>
              </div>
            ) : (
              <div className="sw-post-list">
                {posts.map(post => (
                  <article
                    key={post.id}
                    className="sw-card sw-post"
                  >
                    <div className="sw-post-header">
                      <div className="sw-user">
                        <Avatar
                          name={post.userName}
                          src={post.userImage}
                          size={42}
                        />

                        <div className="sw-user-copy">
                          <div className="sw-user-name">
                            {post.userName || 'Buddy'}
                          </div>

                          <div className="sw-user-time">
                            {formatTime(post.createdDate)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="sw-menu-button"
                        aria-label="More post options"
                      >
                        •••
                      </button>
                    </div>

                    <div className="sw-post-content">
                      {post.content}
                    </div>

                    {!!post.imageUrl && (
                      <div className="sw-post-image-wrap">
                        <img
                          src={post.imageUrl}
                          alt="Post attachment"
                          className="sw-post-image"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="sw-stats">
                      <span>♥ {post.likesCount || 0} likes</span>
                      <span>◎ {post.commentsCount || 0} comments</span>
                    </div>

                    <div className="sw-actions">
                      <button
                        type="button"
                        className={`sw-action ${post.isLiked ? 'liked' : ''}`}
                        onClick={() =>
                          void handleLike(post.id)
                        }
                        disabled={likingIds.has(post.id)}
                        aria-pressed={Boolean(post.isLiked)}
                      >
                        <span
                          className={
                            likeAnimId === post.id
                              ? 'sw-heart-pop'
                              : ''
                          }
                        >
                          {post.isLiked ? '♥' : '♡'}
                        </span>

                        <span className="sw-action-label">
                          {post.isLiked ? 'Liked' : 'Like'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="sw-action"
                        onClick={() =>
                          void loadComments(post.id)
                        }
                      >
                        <span>◎</span>
                        <span className="sw-action-label">
                          Comment
                        </span>
                      </button>

                      <button
                        type="button"
                        className="sw-action"
                        onClick={() =>
                          void handleShare(post)
                        }
                      >
                        <span>↗</span>
                        <span className="sw-action-label">
                          Share
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="sw-side">
            <section className="sw-card sw-side-card">
              <div className="sw-side-title">Social Pulse</div>

              <div className="sw-pulse">
                <strong>{posts.length}</strong>
                <span>Total posts in your current feed</span>
              </div>

              <div className="sw-chips">
                <span className="sw-chip">🔥 Trending</span>
                <span className="sw-chip">💬 Active</span>
                <span className="sw-chip">✨ Fresh</span>
              </div>
            </section>

            <section className="sw-card sw-side-card">
              <div className="sw-side-title">Wall Ideas</div>

              <ul className="sw-idea-list">
                <li>Share your latest gym milestone</li>
                <li>Post a travel snapshot</li>
                <li>Ask buddies for recommendations</li>
                <li>Celebrate a small win</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>

      {!!shareToast && (
        <div
          className="sw-share-toast"
          role="status"
          aria-live="polite"
        >
          ✓ {shareToast}
        </div>
      )}

      {selectedPostId !== null && (
        <div
          className="sw-overlay"
          onClick={() => setSelectedPostId(null)}
        >
          <section
            className="sw-comments"
            onClick={event => event.stopPropagation()}
            aria-label="Post comments"
          >
            <div className="sw-comments-header">
              <div>
                <strong>Comments</strong>
                <span>Join the conversation</span>
              </div>

              <button
                type="button"
                className="sw-close"
                onClick={() => setSelectedPostId(null)}
                aria-label="Close comments"
              >
                ✕
              </button>
            </div>

            {!!selectedPost && (
              <div className="sw-post-preview">
                <Avatar
                  name={selectedPost.userName}
                  src={selectedPost.userImage}
                  size={34}
                />

                <div>
                  <strong>
                    {selectedPost.userName || 'Buddy'}
                  </strong>

                  <p>{selectedPost.content}</p>
                </div>
              </div>
            )}

            <div className="sw-comment-composer">
              <Avatar
                name={currentUser?.name || 'Me'}
                src={currentUser?.image}
                size={34}
              />

              <input
                ref={commentInputRef}
                className="sw-comment-input"
                value={commentText}
                maxLength={500}
                onChange={event =>
                  setCommentText(event.target.value)
                }
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault()
                    void handleAddComment()
                  }
                }}
                placeholder="Write a comment…"
              />

              <button
                type="button"
                className="sw-comment-send"
                onClick={() => void handleAddComment()}
                disabled={
                  commentPosting || !commentText.trim()
                }
              >
                {commentPosting ? '…' : 'Send'}
              </button>
            </div>

            <div className="sw-comment-list">
              {commentLoading ? (
                <div className="sw-loader">
                  <div>
                    <div className="sw-spinner" />
                    Loading comments…
                  </div>
                </div>
              ) : comments.length === 0 ? (
                <div className="sw-empty">
                  <div>
                    <strong>No comments yet</strong>
                    Be the first to join the conversation.
                  </div>
                </div>
              ) : (
                comments.map(comment => (
                  <div
                    key={comment.id}
                    className="sw-comment-item"
                  >
                    <Avatar
                      name={comment.userName}
                      src={comment.userImage}
                      size={34}
                    />

                    <div className="sw-comment-bubble">
                      <strong>
                        {comment.userName || 'Buddy'}
                      </strong>

                      <p>{comment.comment}</p>

                      <span>
                        {formatTime(comment.createdDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
