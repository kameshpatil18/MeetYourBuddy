'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string
  senderId: number
  receiverId: number
  message: string
  createdDate: string
  isMine: boolean
}

type Conversation = {
  userId: number
  userName: string
  userPhoto?: string
  lastMessage?: string
  lastMessageDate?: string
  unreadCount?: number
}

type BotMessage = {
  id: string
  role: 'user' | 'bot'
  text: string
  time: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API || 'https://localhost:7250'
const SIGNALR_HUB = `${CHAT_API_BASE}/chatHub`

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''

  const v = `; ${document.cookie}`
  const p = v.split(`; ${name}=`)

  if (p.length === 2) {
    return decodeURIComponent(p.pop()!.split(';').shift()!)
  }

  return ''
}

function getToken(): string {
  if (typeof window === 'undefined') return ''

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    getCookie('token') ||
    ''
  )
}

function decodeJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function getUserIdFromToken(token: string): number {
  const p = decodeJwt(token)
  if (!p) return 0

  const id =
    p.sub ||
    p.userId ||
    p.UserId ||
    p.nameid ||
    p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']

  return Number(id || 0)
}

function getUserNameFromToken(token: string): string {
  const p = decodeJwt(token)
  if (!p) return 'Me'

  return p.name || p.unique_name || p.given_name || p.fullName || 'Me'
}

async function readJson(res: Response): Promise<any> {
  const t = await res.text()
  if (!t) return null

  try {
    return JSON.parse(t)
  } catch {
    return t
  }
}

function extractArray(result: any, ...keys: string[]): any[] {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key]
    if (Array.isArray(result?.data?.[key])) return result.data[key]
  }

  if (Array.isArray(result?.data)) return result.data

  return []
}

function now(): string {
  return new Date().toISOString()
}

function fmtTime(iso?: string): string {
  if (!iso) return ''

  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDay(iso?: string): string {
  if (!iso) return ''

  const d = new Date(iso)
  const today = new Date()

  if (d.toDateString() === today.toDateString()) return 'Today'

  const yest = new Date(today)
  yest.setDate(yest.getDate() - 1)

  if (d.toDateString() === yest.toDateString()) return 'Yesterday'

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function initials(name?: string): string {
  if (!name) return '?'

  return name
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function avatarHue(name?: string): number {
  return ((name?.charCodeAt(0) || 0) * 53 + (name?.charCodeAt(1) || 0) * 17) % 360
}

function messagesKey(messages: Message[]): string {
  return messages.map(x => `${x.id}-${x.senderId}-${x.receiverId}-${x.message}-${x.createdDate}`).join('|')
}

// ─── Bot Config ───────────────────────────────────────────────────────────────
const GYM_SYSTEM_PROMPT = `You are FitBot, an expert gym and fitness AI assistant for MeetYourBuddy — a platform where gym buddies connect. You specialize in:
- Personalized workout plans
- Diet and nutrition advice
- Exercise form and technique tips
- Recovery, sleep, and injury prevention
- Supplement guidance
- Motivation and accountability

Keep answers concise, practical, and friendly. Use emoji occasionally.`

const SUGGESTIONS = [
  '💪 Beginner workout plan',
  '🥗 Bulking diet plan',
  '🔥 Fat loss tips',
  '😴 Recovery advice',
  '🏋️ Chest exercises',
  '💊 Supplement guide',
]

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  name,
  src,
  size = 40,
  bot = false,
}: {
  name?: string
  src?: string
  size?: number
  bot?: boolean
}) {
  const hue = avatarHue(name)

  if (bot) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.48,
          boxShadow: '0 0 0 2px rgba(245,158,11,0.3)',
        }}
      >
        🤖
      </div>
    )
  }

  if (src && src !== 'null' && src !== '') {
    return (
      <img
        src={src}
        alt={name || 'User'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${hue},65%,52%), hsl(${(hue + 80) % 360},65%,40%))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.5px',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {initials(name)}
    </div>
  )
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
const EMOJIS = [
  '😂', '❤️', '🔥', '💪', '🏋️', '👊', '🎯', '🏆',
  '✨', '😎', '🤙', '👍', '🙌', '💯', '🥊', '😅',
  '🤣', '😍', '🥺', '😭', '🤔', '😤', '💀', '🫡',
  '🫶', '🥳', '🤯', '😮', '🎉', '💥', '⚡', '🌟',
]

function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (e: string) => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '110%',
        right: 0,
        background: '#1a1f35',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 12,
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 4,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}
    >
      {EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => {
            onPick(e)
            onClose()
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: '4px 2px',
            borderRadius: 8,
          }}
          onMouseEnter={ev => {
            ev.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={ev => {
            ev.currentTarget.style.background = 'none'
          }}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

// ─── Typing Dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChatPage() {
  // Auth
  const [token, setToken] = useState('')
  const [myId, setMyId] = useState(0)
  const [myName, setMyName] = useState('Me')

  // Real chat
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [signalRStatus, setSignalRStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  // Bot
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: '0',
      role: 'bot',
      text: "Hey! I'm **FitBot** 🤖💪\n\nI'm your personal gym AI assistant. Ask me anything about workouts, nutrition, recovery, or supplements!\n\nWhat's your fitness goal today?",
      time: fmtTime(now()),
    },
  ])
  const [botInput, setBotInput] = useState('')
  const [botTyping, setBotTyping] = useState(false)
  const [botEmoji, setBotEmoji] = useState(false)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const botEndRef = useRef<HTMLDivElement>(null)
  const signalRRef = useRef<any>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const botInputRef = useRef<HTMLInputElement>(null)

  // Important scroll refs
  const msgBodyRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Init auth
  useEffect(() => {
    const t = getToken()
    setToken(t)

    if (t) {
      setMyId(getUserIdFromToken(t))
      setMyName(getUserNameFromToken(t))
    }
  }, [])

  const authHeaders = useMemo<Record<string, string>>(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  // Detect whether user is near bottom
  const handleMessageScroll = () => {
    const el = msgBodyRef.current
    if (!el) return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight

    // If user scrolls up, stop forced auto-scroll.
    shouldAutoScrollRef.current = distanceFromBottom < 120
  }

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return

    setChatLoading(true)

    try {
      const res = await fetch(`${CHAT_API_BASE}/api/Chat/conversations`, {
        headers: authHeaders,
      })

      const result = await readJson(res)
      const arr = extractArray(result, 'conversations', 'items', 'data')

      setConversations(
        arr.map((c: any) => ({
          userId: Number(c.userId ?? c.UserId ?? c.otherUserId ?? c.OtherUserId ?? 0),
          userName: c.userName ?? c.UserName ?? c.name ?? c.Name ?? 'User',
          userPhoto: c.userPhoto ?? c.UserPhoto ?? c.profileImage ?? '',
          lastMessage:
            c.lastMessage ??
            c.LastMessage ??
            c.lastMessageText ??
            c.LastMessageText ??
            '',
          lastMessageDate: c.lastMessageDate ?? c.LastMessageDate ?? c.createdDate ?? '',
          unreadCount: c.unreadCount ?? c.UnreadCount ?? 0,
        })),
      )
    } catch (e) {
      console.error('Conversations error:', e)
    } finally {
      setChatLoading(false)
    }
  }, [token, authHeaders])

  useEffect(() => {
    if (token) loadConversations()
  }, [token, loadConversations])

  // Load chat history
  const loadHistory = useCallback(
    async (otherUserId: number, silent = false) => {
      if (!token) return

      const el = msgBodyRef.current
      const oldScrollHeight = el?.scrollHeight ?? 0
      const oldScrollTop = el?.scrollTop ?? 0
      const wasNearBottom = shouldAutoScrollRef.current

      if (!silent) {
        setMsgLoading(true)
        setMessages([])
        shouldAutoScrollRef.current = true
      }

      try {
        const res = await fetch(`${CHAT_API_BASE}/api/Chat/history/${otherUserId}`, {
          headers: authHeaders,
        })

        const result = await readJson(res)
        const arr = extractArray(result, 'messages', 'items', 'history')

        const resolvedMyId = myId || getUserIdFromToken(token)

        const mappedMessages: Message[] = arr.map((m: any) => {
          const sid = Number(m.senderId ?? m.SenderId ?? 0)
          const rid = Number(m.receiverId ?? m.ReceiverId ?? 0)

          return {
            id: String(m.id ?? m.Id ?? `${sid}-${rid}-${m.createdDate ?? m.CreatedDate ?? Date.now()}`),
            senderId: sid,
            receiverId: rid,
            message:
              m.messageText ??
              m.MessageText ??
              m.message ??
              m.Message ??
              m.content ??
              m.Content ??
              m.text ??
              m.Text ??
              '',
            createdDate: m.createdDate ?? m.CreatedDate ?? now(),
            isMine: sid === resolvedMyId,
          }
        })

        setMessages(prev => {
          if (messagesKey(prev) === messagesKey(mappedMessages)) {
            return prev
          }

          return mappedMessages
        })

        // If polling refreshed while user is reading old messages, keep same visible position.
        if (silent && el && !wasNearBottom) {
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight
            const diff = newScrollHeight - oldScrollHeight
            el.scrollTop = oldScrollTop + diff
          })
        }
      } catch (e) {
        console.error('History error:', e)
      } finally {
        setMsgLoading(false)
      }
    },
    [token, authHeaders, myId],
  )

  // Keep 2-second polling
  useEffect(() => {
    if (!activeConvo) return

    shouldAutoScrollRef.current = true
    loadHistory(activeConvo.userId)

    const interval = setInterval(() => {
      loadHistory(activeConvo.userId, true)
    }, 2000)

    return () => clearInterval(interval)
  }, [activeConvo?.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // SignalR
  useEffect(() => {
    if (!token) return

    let connection: any = null

    const initSignalR = async () => {
      try {
        const signalR = await import('@microsoft/signalr')

        connection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB, {
            accessTokenFactory: () => token,
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Warning)
          .build()

        connection.on(
          'ReceiveMessage',
          (
            senderIdOrObj: any,
            receiverIdArg?: number,
            messageTextArg?: string,
            createdDateArg?: string,
          ) => {
            const isObjectPayload = typeof senderIdOrObj === 'object' && senderIdOrObj !== null

            const sid = Number(
              isObjectPayload
                ? senderIdOrObj.senderId ?? senderIdOrObj.SenderId
                : senderIdOrObj,
            )

            const rid = Number(
              isObjectPayload
                ? senderIdOrObj.receiverId ?? senderIdOrObj.ReceiverId
                : receiverIdArg,
            )

            const msgText = isObjectPayload
              ? senderIdOrObj.messageText ??
                senderIdOrObj.MessageText ??
                senderIdOrObj.message ??
                senderIdOrObj.Message ??
                senderIdOrObj.content ??
                ''
              : messageTextArg ?? ''

            const msgDate = isObjectPayload
              ? senderIdOrObj.createdDate ?? senderIdOrObj.CreatedDate ?? now()
              : createdDateArg ?? now()

            if (!sid || !rid || !msgText) return

            const resolvedMyId = myId || getUserIdFromToken(token)
            const activeUserId = activeConvo?.userId

            const incoming: Message = {
              id: String(isObjectPayload ? senderIdOrObj.id ?? senderIdOrObj.Id ?? Date.now() : Date.now()),
              senderId: sid,
              receiverId: rid,
              message: msgText,
              createdDate: msgDate,
              isMine: sid === resolvedMyId,
            }

            const belongsToActive =
              activeUserId &&
              ((sid === activeUserId && rid === resolvedMyId) ||
                (sid === resolvedMyId && rid === activeUserId))

            if (belongsToActive) {
              setMessages(prev => {
                const exists = prev.some(x => x.id === incoming.id)
                if (exists) return prev

                return [...prev, incoming]
              })
            }

            const otherUserId = sid === resolvedMyId ? rid : sid

            setConversations(prev =>
              prev.map(c =>
                c.userId === otherUserId
                  ? {
                      ...c,
                      lastMessage: msgText,
                      lastMessageDate: msgDate,
                      unreadCount:
                        activeUserId === otherUserId
                          ? c.unreadCount ?? 0
                          : (c.unreadCount ?? 0) + 1,
                    }
                  : c,
              ),
            )
          },
        )

        connection.onreconnecting(() => setSignalRStatus('connecting'))
        connection.onreconnected(() => setSignalRStatus('connected'))
        connection.onclose(() => setSignalRStatus('error'))

        await connection.start()

        setSignalRStatus('connected')
        signalRRef.current = connection
      } catch (e) {
        console.warn('SignalR connection failed. Polling fallback still active:', e)
        setSignalRStatus('error')
      }
    }

    initSignalR()

    return () => {
      connection?.stop()
    }
  }, [token, myId, activeConvo?.userId])

  // Send real message
  const sendMessage = async () => {
    if (!chatInput.trim() || !activeConvo) return

    const text = chatInput.trim()
    setChatInput('')
    setSendingMsg(true)

    shouldAutoScrollRef.current = true

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderId: myId,
      receiverId: activeConvo.userId,
      message: text,
      createdDate: now(),
      isMine: true,
    }

    setMessages(prev => [...prev, optimistic])

    setConversations(prev =>
      prev.map(c =>
        c.userId === activeConvo.userId
          ? {
              ...c,
              lastMessage: text,
              lastMessageDate: optimistic.createdDate,
            }
          : c,
      ),
    )

    try {
      const res = await fetch(`${CHAT_API_BASE}/api/Chat/send`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          senderId: myId,
          receiverId: activeConvo.userId,
          message: text,
        }),
      })

      if (!res.ok) throw new Error('Send failed')
    } catch (e) {
      console.error('Send message error:', e)
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setChatInput(text)
    } finally {
      setSendingMsg(false)
    }
  }

  // Auto-scroll only if user is near bottom
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return

    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])

  useEffect(() => {
    botEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [botMessages])

  // Bot message
  const sendBotMessage = async (text?: string) => {
    const input = (text ?? botInput).trim()

    if (!input || botTyping) return

    setBotInput('')
    setBotEmoji(false)

    const userMsg: BotMessage = {
      id: String(Date.now()),
      role: 'user',
      text: input,
      time: fmtTime(now()),
    }

    setBotMessages(prev => [...prev, userMsg])
    setBotTyping(true)

    try {
      // Direct frontend AI call may fail due CORS/API key.
      // So fallback is kept for now.
      throw new Error('Use backend AI API for production')
    } catch {
      const fallbacks: Record<string, string> = {
        workout:
          '💪 For beginner routine: Push, Pull, Legs. Train 3 days per week. Do 3 sets of 8-12 reps for each exercise.',
        diet:
          '🥗 For muscle gain, keep high protein and eat in a small calorie surplus. Add eggs, chicken, paneer, dal, milk, rice, and fruits.',
        fat:
          '🔥 Fat loss needs calorie deficit, strength training, walking, and enough protein. Start with 300-500 calorie deficit.',
        supplement:
          '💊 Basic useful supplements: creatine 3-5g/day and whey protein if your protein intake is low.',
        default:
          '🤖 I am having trouble connecting right now. But quick tip: consistency beats perfection. Stay regular and keep improving slowly 💪',
      }

      const key = Object.keys(fallbacks).find(k => input.toLowerCase().includes(k)) || 'default'

      setBotMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'bot',
          text: fallbacks[key],
          time: fmtTime(now()),
        },
      ])
    } finally {
      setBotTyping(false)
    }
  }

  function renderBotText(text: string) {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)

      return (
        <span key={i}>
          {parts.map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p))}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = []

    messages.forEach(m => {
      const d = fmtDay(m.createdDate)
      const last = groups[groups.length - 1]

      if (last && last.date === d) {
        last.msgs.push(m)
      } else {
        groups.push({ date: d, msgs: [m] })
      }
    })

    return groups
  }, [messages])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          height: 100%;
          overflow: hidden;
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .chat-root {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          font-family: 'Outfit', sans-serif;
          background: #0c0f1d;
          color: #e2e8f8;
          overflow: hidden;
        }

        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
        }

        .bot-panel {
          display: flex;
          flex-direction: column;
          background: linear-gradient(160deg, #0f1320 0%, #090c18 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }

        .bot-panel::before {
          content: '';
          position: absolute;
          top: -120px;
          left: -80px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .bot-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(12px);
        }

        .bot-header-info {
          flex: 1;
        }

        .bot-header-name {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.3px;
        }

        .bot-header-sub {
          font-size: 12px;
          color: rgba(245,158,11,0.7);
          font-weight: 500;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bot-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
          animation: pulse 2s infinite;
        }

        .bot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bot-msg-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          animation: fadeUp 0.25s ease;
        }

        .bot-msg-row.user {
          flex-direction: row-reverse;
        }

        .bot-bubble {
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 400;
          max-width: 420px;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .bot-bubble.bot-side {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
          color: rgba(226,232,248,0.92);
        }

        .bot-bubble.user-side {
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          border-bottom-right-radius: 4px;
          color: #fff;
          box-shadow: 0 4px 16px rgba(245,158,11,0.25);
        }

        .bot-time {
          font-size: 10px;
          color: rgba(200,210,230,0.35);
          margin-top: 4px;
          font-weight: 500;
        }

        .bot-suggestions {
          padding: 10px 18px 14px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .bot-chip {
          padding: 7px 13px;
          border-radius: 999px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: rgba(245,158,11,0.85);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .bot-chip:hover {
          background: rgba(245,158,11,0.16);
          border-color: rgba(245,158,11,0.4);
        }

        .bot-input-row {
          padding: 14px 18px 18px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
          position: relative;
        }

        .bot-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 12px 16px;
          color: #e2e8f8;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
        }

        .bot-input:focus {
          border-color: rgba(245,158,11,0.4);
        }

        .bot-input::placeholder {
          color: rgba(200,210,230,0.28);
        }

        .bot-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          border: none;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(245,158,11,0.35);
        }

        .bot-send-btn:hover {
          transform: scale(1.06);
        }

        .bot-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(200,210,230,0.55);
          font-size: 17px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }

        .icon-btn:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(220,225,240,0.9);
        }

        .chat-panel {
          display: grid;
          grid-template-columns: 260px 1fr;
          background: #0c0f1d;
          overflow: hidden;
        }

        .convo-list {
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.02);
          overflow: hidden;
        }

        .convo-list-header {
          padding: 20px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }

        .convo-list-title {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.4px;
        }

        .convo-list-sub {
          font-size: 12px;
          color: rgba(200,210,230,0.4);
          margin-top: 3px;
        }

        .convo-scroll {
          flex: 1;
          overflow-y: auto;
        }

        .convo-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .convo-item:hover {
          background: rgba(255,255,255,0.04);
        }

        .convo-item.active {
          background: rgba(99,102,241,0.1);
        }

        .convo-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #6366f1;
          border-radius: 0 3px 3px 0;
        }

        .convo-info {
          flex: 1;
          min-width: 0;
        }

        .convo-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .convo-last {
          font-size: 12px;
          color: rgba(200,210,230,0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .convo-badge {
          background: #6366f1;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 2px 7px;
          flex-shrink: 0;
        }

        .convo-empty {
          padding: 40px 16px;
          text-align: center;
          font-size: 13px;
          color: rgba(200,210,230,0.35);
        }

        .msg-area {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .msg-header {
          padding: 16px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }

        .msg-header-info {
          flex: 1;
        }

        .msg-header-name {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }

        .msg-header-status {
          font-size: 12px;
          color: rgba(200,210,230,0.45);
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .signalr-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .signalr-badge.connected {
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          color: #4ade80;
        }

        .signalr-badge.connecting {
          background: rgba(234,179,8,0.1);
          border: 1px solid rgba(234,179,8,0.25);
          color: #fbbf24;
        }

        .signalr-badge.error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
        }

        .msg-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scroll-behavior: smooth;
        }

        .date-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 14px 0 10px;
          color: rgba(200,210,230,0.35);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .date-divider::before,
        .date-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        .msg-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          animation: fadeUp 0.2s ease;
          margin-bottom: 2px;
          width: 100%;
        }

        .msg-row.mine {
          flex-direction: row-reverse;
        }

        .msg-row > div {
          min-width: 0;
          max-width: 70%;
        }

        .msg-bubble {
          min-width: 48px;
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 400;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          display: inline-block;
        }

        .msg-bubble.theirs {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
          color: rgba(226,232,248,0.9);
        }

        .msg-bubble.mine {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-bottom-right-radius: 4px;
          color: #fff;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
        }

        .msg-time {
          font-size: 10px;
          color: rgba(200,210,230,0.35);
          margin-top: 3px;
          padding: 0 4px;
          font-weight: 500;
        }

        .msg-row.mine .msg-time {
          text-align: right;
        }

        .no-convo {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(200,210,230,0.3);
          padding: 40px;
        }

        .no-convo-icon {
          font-size: 48px;
          filter: grayscale(0.5);
        }

        .no-convo-title {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 700;
          color: rgba(226,232,248,0.5);
        }

        .no-convo-sub {
          font-size: 13px;
          text-align: center;
          line-height: 1.6;
        }

        .chat-input-bar {
          padding: 14px 18px 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
          position: relative;
          background: rgba(255,255,255,0.02);
        }

        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 12px 16px;
          color: #e2e8f8;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
        }

        .chat-input:focus {
          border-color: rgba(99,102,241,0.45);
        }

        .chat-input::placeholder {
          color: rgba(200,210,230,0.28);
        }

        .chat-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }

        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.06);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .skel {
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }

        @media (max-width: 900px) {
          .chat-root {
            grid-template-columns: 1fr;
          }

          .bot-panel {
            display: none;
          }

          .chat-panel {
            grid-template-columns: 110px 1fr;
          }

          .convo-name,
          .convo-last,
          .convo-list-sub {
            display: none;
          }

          .convo-list-title {
            font-size: 14px;
          }

          .convo-item {
            justify-content: center;
            padding: 12px 8px;
          }
        }
      `}</style>

      <div className="chat-root">
        {/* LEFT PANEL — BOT */}
        <div className="bot-panel">
          <div className="bot-header">
            <Avatar bot size={46} />

            <div className="bot-header-info">
              <div className="bot-header-name">FitBot</div>
              <div className="bot-header-sub">
                <span className="bot-status-dot" />
                Gym AI · Always available
              </div>
            </div>

            <div
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(245,158,11,0.8)',
              }}
            >
              AI
            </div>
          </div>

          <div className="bot-messages">
            {botMessages.map(m => (
              <div key={m.id} className={`bot-msg-row ${m.role === 'user' ? 'user' : ''}`}>
                {m.role === 'bot' && <Avatar bot size={30} />}

                <div>
                  <div className={`bot-bubble ${m.role === 'bot' ? 'bot-side' : 'user-side'}`}>
                    {renderBotText(m.text)}
                  </div>

                  <div
                    className="bot-time"
                    style={{
                      textAlign: m.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {botTyping && (
              <div className="bot-msg-row">
                <Avatar bot size={30} />

                <div className="bot-bubble bot-side" style={{ padding: '6px 14px' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={botEndRef} />
          </div>

          {botMessages.length <= 2 && (
            <div className="bot-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" className="bot-chip" onClick={() => sendBotMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="bot-input-row">
            {botEmoji && (
              <EmojiPicker
                onPick={e => setBotInput(prev => prev + e)}
                onClose={() => setBotEmoji(false)}
              />
            )}

            <button type="button" className="icon-btn" onClick={() => setBotEmoji(v => !v)}>
              😊
            </button>

            <input
              ref={botInputRef}
              className="bot-input"
              value={botInput}
              onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendBotMessage()
                }
              }}
              placeholder="Ask FitBot about workouts, diet…"
            />

            <button
              type="button"
              className="bot-send-btn"
              onClick={() => sendBotMessage()}
              disabled={botTyping || !botInput.trim()}
            >
              {botTyping ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                '↑'
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL — CHAT */}
        <div className="chat-panel">
          <div className="convo-list">
            <div className="convo-list-header">
              <div className="convo-list-title">Messages</div>
              <div className="convo-list-sub">Your gym buddies</div>
            </div>

            <div className="convo-scroll">
              {chatLoading ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div
                        className="skel"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="skel" style={{ height: 12, borderRadius: 6, width: '60%' }} />
                        <div className="skel" style={{ height: 10, borderRadius: 6, width: '80%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="convo-empty">
                  No conversations yet.
                  <br />
                  Start chatting with a buddy!
                </div>
              ) : (
                conversations.map(c => (
                  <div
                    key={c.userId}
                    className={`convo-item${activeConvo?.userId === c.userId ? ' active' : ''}`}
                    onClick={() => {
                      shouldAutoScrollRef.current = true
                      setActiveConvo(c)
                    }}
                  >
                    <Avatar name={c.userName} src={c.userPhoto} size={42} />

                    <div className="convo-info">
                      <div className="convo-name">{c.userName}</div>
                      <div className="convo-last">{c.lastMessage || 'Start a conversation'}</div>
                    </div>

                    {(c.unreadCount || 0) > 0 && <span className="convo-badge">{c.unreadCount}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="msg-area">
            {!activeConvo ? (
              <div className="no-convo">
                <div className="no-convo-icon">💬</div>
                <div className="no-convo-title">Pick a buddy</div>
                <div className="no-convo-sub">
                  Select a conversation from the left to start chatting with your gym buddy
                </div>
              </div>
            ) : (
              <>
                <div className="msg-header">
                  <Avatar name={activeConvo.userName} src={activeConvo.userPhoto} size={40} />

                  <div className="msg-header-info">
                    <div className="msg-header-name">{activeConvo.userName}</div>

                    <div className="msg-header-status">
                      <span className={`signalr-badge ${signalRStatus}`}>
                        {signalRStatus === 'connected'
                          ? '● Live'
                          : signalRStatus === 'connecting'
                            ? '◌ Connecting'
                            : '○ Offline'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      shouldAutoScrollRef.current = true
                      loadHistory(activeConvo.userId)
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(200,210,230,0.5)',
                      borderRadius: 10,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div ref={msgBodyRef} className="msg-body" onScroll={handleMessageScroll}>
                  {msgLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            flexDirection: i % 2 ? 'row-reverse' : 'row',
                            gap: 10,
                            alignItems: 'flex-end',
                          }}
                        >
                          <div
                            className="skel"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              flexShrink: 0,
                            }}
                          />
                          <div
                            className="skel"
                            style={{
                              height: 40,
                              borderRadius: 14,
                              width: `${40 + i * 8}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 10,
                        color: 'rgba(200,210,230,0.35)',
                        paddingTop: 60,
                      }}
                    >
                      <span style={{ fontSize: 36 }}>👋</span>
                      <span style={{ fontSize: 14 }}>Say hi to {activeConvo.userName}!</span>
                    </div>
                  ) : (
                    groupedMessages.map(group => (
                      <div key={group.date}>
                        <div className="date-divider">{group.date}</div>

                        {group.msgs.map(m => (
                          <div key={m.id} className={`msg-row ${m.isMine ? 'mine' : ''}`}>
                            {!m.isMine && (
                              <Avatar name={activeConvo.userName} src={activeConvo.userPhoto} size={30} />
                            )}

                            <div>
                              <div className={`msg-bubble ${m.isMine ? 'mine' : 'theirs'}`}>
                                {m.message}
                              </div>

                              <div className="msg-time">{fmtTime(m.createdDate)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className="chat-input-bar">
                  {showEmoji && (
                    <EmojiPicker
                      onPick={e => setChatInput(prev => prev + e)}
                      onClose={() => setShowEmoji(false)}
                    />
                  )}

                  <button type="button" className="icon-btn" onClick={() => setShowEmoji(v => !v)}>
                    😊
                  </button>

                  <input
                    ref={chatInputRef}
                    className="chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={`Message ${activeConvo.userName}…`}
                    disabled={sendingMsg}
                  />

                  <button
                    type="button"
                    className="chat-send-btn"
                    onClick={sendMessage}
                    disabled={sendingMsg || !chatInput.trim()}
                  >
                    {sendingMsg ? (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTop: '2px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }}
                      />
                    ) : (
                      '↑'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}