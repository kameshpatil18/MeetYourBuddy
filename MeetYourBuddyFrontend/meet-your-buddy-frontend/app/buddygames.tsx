'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { useSearchParams, useRouter } from 'next/navigation'
import * as signalR from '@microsoft/signalr'

/* =========================================================
   CONFIG
========================================================= */

const API_BASE = (
  process.env.NEXT_PUBLIC_BUDDY_GAMES_API_BASE_URL ||
  'https://localhost:7265'
).replace(/\/+$/, '')

const HUB_URL =
  process.env.NEXT_PUBLIC_BUDDY_GAMES_HUB_URL ||
  `${API_BASE}/hubs/game`

const RECENT_GAME_KEY = 'myb-buddy-games-recent'

/* =========================================================
   TYPES
========================================================= */

type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'

type ApiResponse = {
  code: number
  message: string
}

type GameChallenge = {
  gameSessionId: number
  gameType: string
  challengerUserId: number
  challengedUserId: number
  status: string
  createdDate: string
}

type OutgoingChallenge = {
  gameSessionId: number
  gameType: string
  challengerUserId: number
  opponentUserId: number
  status: string
  createdDate: string
}

type GameChallengeResponse = ApiResponse & {
  gameSessionId: number
}

type GameChallengesResponse = ApiResponse & {
  challenges: GameChallenge[]
}

type OutgoingGameChallengesResponse = ApiResponse & {
  challenges: OutgoingChallenge[]
}

type GameMove = {
  moveId: number
  gameSessionId: number
  userId: number
  position: number
  symbol: string
  moveNumber: number
  createdDate: string
}

type GameSession = {
  gameSessionId: number
  gameType: string

  player1Id: number
  player2Id: number

  player1Symbol: string | null
  player2Symbol: string | null

  currentTurnUserId: number | null

  boardState: string

  winnerUserId: number | null

  status: string

  createdDate?: string
  startedDate?: string | null
  completedDate?: string | null
  updatedDate?: string | null
}

type GameSessionResponse = ApiResponse & {
  game: GameSession | null
  moves: GameMove[]
}

type AcceptGameResponse = ApiResponse & {
  game: GameSession | null
}

type GameActionResponse = ApiResponse & {
  gameSessionId: number
}

type TicTacToeMoveResponse = ApiResponse & {
  game: GameSession | null

  moveNumber: number
  position: number
  symbol: string

  isWinner: boolean
  isDraw: boolean
}

type Toast = {
  id: number
  title: string
  message: string
  tone: 'success' | 'error' | 'info'
}

/* =========================================================
   AUTH HELPERS
========================================================= */

function getCookie(name: string) {
  if (typeof document === 'undefined') return ''

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length !== 2) return ''

  try {
    return decodeURIComponent(
      parts.pop()!.split(';').shift() || '',
    )
  } catch {
    return ''
  }
}

function getToken() {
  if (typeof window === 'undefined') return ''

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('authToken') ||
    getCookie('token') ||
    getCookie('accessToken') ||
    getCookie('authToken') ||
    ''
  )
}

function decodeJwtPayload(token: string) {
  try {
    const part = token.split('.')[1]

    if (!part) return null

    const normalized = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map(
          char =>
            `%${`00${char.charCodeAt(0).toString(16)}`.slice(
              -2,
            )}`,
        )
        .join(''),
    )

    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function getUserIdFromToken() {
  const token = getToken()

  if (!token) return 0

  const payload = decodeJwtPayload(token)

  if (!payload) return 0

  const candidates = [
    payload[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    ],
    payload.nameid,
    payload.NameIdentifier,
    payload.userId,
    payload.UserId,
    payload.userid,
    payload.sub,
  ]

  for (const value of candidates) {
    const parsed = Number(value)

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

/* =========================================================
   API HELPER
========================================================= */

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken()

  if (!token) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,

    cache: 'no-store',

    headers: {
      Accept: 'application/json',
      ...(options?.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  })

  if (response.status === 401) {
    throw new Error(
      'Your login session has expired. Please sign in again.',
    )
  }

  let result: unknown

  try {
    result = await response.json()
  } catch {
    result = null
  }

  if (!response.ok) {
    const obj = result as Record<string, unknown> | null

    throw new Error(
      String(
        obj?.message ||
          `Request failed (${response.status}).`,
      ),
    )
  }

  return result as T
}

/* =========================================================
   STORAGE
========================================================= */

function readRecentGameIds() {
  if (typeof window === 'undefined') return [] as number[]

  try {
    const raw = localStorage.getItem(RECENT_GAME_KEY)

    if (!raw) return []

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed
      .map(Number)
      .filter(value => Number.isInteger(value) && value > 0)
      .slice(0, 10)
  } catch {
    return []
  }
}

function saveRecentGameId(gameSessionId: number) {
  if (
    typeof window === 'undefined' ||
    !Number.isInteger(gameSessionId) ||
    gameSessionId <= 0
  ) {
    return
  }

  const current = readRecentGameIds()

  const next = [
    gameSessionId,
    ...current.filter(id => id !== gameSessionId),
  ].slice(0, 10)

  localStorage.setItem(
    RECENT_GAME_KEY,
    JSON.stringify(next),
  )
}

/* =========================================================
   OTHER HELPERS
========================================================= */

function formatDate(value?: string | null) {
  if (!value) return 'Just now'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function gameStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Waiting'
    case 'active':
      return 'Live'
    case 'completed':
      return 'Finished'
    case 'declined':
      return 'Declined'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

function extractGameFromSignal(
  payload: unknown,
): GameSession | null {
  if (!payload || typeof payload !== 'object') return null

  const value = payload as Record<string, unknown>

  if (
    value.game &&
    typeof value.game === 'object'
  ) {
    return value.game as GameSession
  }

  if (
    value.gameSessionId &&
    value.player1Id &&
    value.player2Id
  ) {
    return value as unknown as GameSession
  }

  return null
}

/* =========================================================
   PAGE
========================================================= */

export default function BuddyGamesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hubRef =
    useRef<signalR.HubConnection | null>(null)

  const joinedGameRef = useRef<number | null>(null)

  const toastCounter = useRef(0)

  const [currentUserId, setCurrentUserId] =
    useState(0)

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting')

  const [pageLoading, setPageLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [actionKey, setActionKey] =
    useState<string | null>(null)

  const [incoming, setIncoming] = useState<
    GameChallenge[]
  >([])

  const [outgoing, setOutgoing] = useState<
    OutgoingChallenge[]
  >([])

  const [recentGames, setRecentGames] = useState<
    GameSession[]
  >([])

  const [selectedGame, setSelectedGame] =
    useState<GameSession | null>(null)

  const [selectedMoves, setSelectedMoves] = useState<
    GameMove[]
  >([])

  const [opponentUserId, setOpponentUserId] =
    useState('')

  const [opponentName, setOpponentName] =
    useState('')

  const [toasts, setToasts] = useState<Toast[]>([])

  /* =======================================================
     QUERY PARAM SUPPORT

     /buddygames?buddyId=14&buddyName=Rahul
  ======================================================= */

  useEffect(() => {
    const buddyId =
      searchParams.get('buddyId') ||
      searchParams.get('userId')

    const buddyName =
      searchParams.get('buddyName') || ''

    if (buddyId) {
      setOpponentUserId(buddyId)
    }

    if (buddyName) {
      setOpponentName(buddyName)
    }
  }, [searchParams])

  useEffect(() => {
    setCurrentUserId(getUserIdFromToken())
  }, [])

  /* =======================================================
     TOAST
  ======================================================= */

  const notify = useCallback(
    (
      title: string,
      message: string,
      tone: Toast['tone'] = 'info',
    ) => {
      toastCounter.current += 1

      const id = toastCounter.current

      setToasts(current => [
        ...current,
        {
          id,
          title,
          message,
          tone,
        },
      ])

      window.setTimeout(() => {
        setToasts(current =>
          current.filter(item => item.id !== id),
        )
      }, 4200)
    },
    [],
  )

  /* =======================================================
     LOAD CHALLENGES
  ======================================================= */

  const loadChallenges = useCallback(async () => {
    const [incomingResult, outgoingResult] =
      await Promise.all([
        apiFetch<GameChallengesResponse>(
          '/api/BuddyGames/challenges/incoming',
        ),

        apiFetch<OutgoingGameChallengesResponse>(
          '/api/BuddyGames/challenges/outgoing',
        ),
      ])

    setIncoming(incomingResult.challenges || [])
    setOutgoing(outgoingResult.challenges || [])
  }, [])

  /* =======================================================
     OPEN GAME
  ======================================================= */

  const openGame = useCallback(
    async (
      gameSessionId: number,
      showError = true,
    ) => {
      try {
        const result =
          await apiFetch<GameSessionResponse>(
            `/api/BuddyGames/games/${gameSessionId}`,
          )

        if (result.code !== 1 || !result.game) {
          if (showError) {
            notify(
              'Unable to open game',
              result.message ||
                'Game session could not be loaded.',
              'error',
            )
          }

          return null
        }

        saveRecentGameId(gameSessionId)

        setSelectedGame(result.game)

        setSelectedMoves(result.moves || [])

        return result.game
      } catch (error) {
        if (showError) {
          notify(
            'Unable to open game',
            error instanceof Error
              ? error.message
              : 'Game could not be loaded.',
            'error',
          )
        }

        return null
      }
    },
    [notify],
  )

  /* =======================================================
     LOAD RECENT
  ======================================================= */

  const loadRecentGames = useCallback(async () => {
    const ids = readRecentGameIds()

    if (ids.length === 0) {
      setRecentGames([])
      return
    }

    const results = await Promise.all(
      ids.map(async id => {
        try {
          const result =
            await apiFetch<GameSessionResponse>(
              `/api/BuddyGames/games/${id}`,
            )

          return result.code === 1
            ? result.game
            : null
        } catch {
          return null
        }
      }),
    )

    setRecentGames(
      results.filter(
        (item): item is GameSession => Boolean(item),
      ),
    )
  }, [])

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshEverything = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setRefreshing(true)
        }

        await Promise.all([
          loadChallenges(),
          loadRecentGames(),
        ])
      } catch (error) {
        if (!silent) {
          notify(
            'Could not refresh games',
            error instanceof Error
              ? error.message
              : 'Something went wrong.',
            'error',
          )
        }
      } finally {
        if (!silent) {
          setRefreshing(false)
        }
      }
    },
    [loadChallenges, loadRecentGames, notify],
  )

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await Promise.all([
          loadChallenges(),
          loadRecentGames(),
        ])
      } catch (error) {
        if (mounted) {
          notify(
            'Buddy Games unavailable',
            error instanceof Error
              ? error.message
              : 'Could not load games.',
            'error',
          )
        }
      } finally {
        if (mounted) {
          setPageLoading(false)
        }
      }
    }

    void init()

    return () => {
      mounted = false
    }
  }, [
    loadChallenges,
    loadRecentGames,
    notify,
  ])

  /* =======================================================
     SIGNALR
  ======================================================= */

  useEffect(() => {
    const token = getToken()

    if (!token) {
      setConnectionState('offline')
      return
    }

    const connection =
      new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => getToken(),
        })
        .withAutomaticReconnect([
          0,
          2000,
          5000,
          10000,
        ])
        .configureLogging(
          signalR.LogLevel.Warning,
        )
        .build()

    hubRef.current = connection

    connection.onreconnecting(() => {
      setConnectionState('reconnecting')
    })

    connection.onreconnected(async () => {
      setConnectionState('connected')

      if (joinedGameRef.current) {
        try {
          await connection.invoke(
            'JoinGame',
            joinedGameRef.current,
          )
        } catch {
          // ignore reconnect race
        }
      }

      void refreshEverything(true)
    })

    connection.onclose(() => {
      setConnectionState('offline')
    })

    connection.on(
      'ChallengeReceived',
      (payload: Record<string, unknown>) => {
        notify(
          'New game challenge 🎮',
          `Buddy #${payload.challengerUserId ?? ''} challenged you to Tic-Tac-Toe.`,
          'info',
        )

        void loadChallenges()
      },
    )

    connection.on(
      'ChallengeAccepted',
      (payload: unknown) => {
        const game =
          extractGameFromSignal(payload)

        if (game) {
          saveRecentGameId(
            game.gameSessionId,
          )

          notify(
            'Challenge accepted ⚡',
            'Your Tic-Tac-Toe game is ready.',
            'success',
          )

          void openGame(
            game.gameSessionId,
            false,
          )
        }

        void refreshEverything(true)
      },
    )

    connection.on(
      'ChallengeDeclined',
      () => {
        notify(
          'Challenge declined',
          'Your buddy declined the game challenge.',
          'info',
        )

        void refreshEverything(true)
      },
    )

    connection.on(
      'ChallengeCancelled',
      () => {
        notify(
          'Challenge cancelled',
          'The pending challenge was cancelled.',
          'info',
        )

        void refreshEverything(true)
      },
    )

    connection.on(
      'GameUpdated',
      (payload: unknown) => {
        const game =
          extractGameFromSignal(payload)

        if (!game) return

        saveRecentGameId(
          game.gameSessionId,
        )

        setSelectedGame(current => {
          if (
            current?.gameSessionId !==
            game.gameSessionId
          ) {
            return current
          }

          return {
            ...current,
            ...game,
          }
        })

        setRecentGames(current => {
          const exists = current.some(
            item =>
              item.gameSessionId ===
              game.gameSessionId,
          )

          if (!exists) {
            return [game, ...current].slice(
              0,
              10,
            )
          }

          return current.map(item =>
            item.gameSessionId ===
            game.gameSessionId
              ? { ...item, ...game }
              : item,
          )
        })
      },
    )

    connection.on(
      'GameCompleted',
      (payload: unknown) => {
        const game =
          extractGameFromSignal(payload)

        if (!game) return

        const winner =
          game.winnerUserId

        notify(
          winner
            ? winner === getUserIdFromToken()
              ? 'You won! 🏆'
              : 'Game finished'
            : 'It’s a draw 🤝',
          winner
            ? winner === getUserIdFromToken()
              ? 'Great game. Victory secured!'
              : 'Your buddy won this round.'
            : 'Nobody takes the crown this time.',
          winner === getUserIdFromToken()
            ? 'success'
            : 'info',
        )

        void openGame(
          game.gameSessionId,
          false,
        )

        void loadRecentGames()
      },
    )

    const start = async () => {
      try {
        setConnectionState('connecting')

        await connection.start()

        setConnectionState('connected')
      } catch (error) {
        console.error(
          'SignalR connection error:',
          error,
        )

        setConnectionState('offline')
      }
    }

    void start()

    return () => {
      hubRef.current = null

      void connection.stop()
    }
  }, [
    loadChallenges,
    loadRecentGames,
    notify,
    openGame,
    refreshEverything,
  ])

  /* =======================================================
     JOIN CURRENT GAME ROOM
  ======================================================= */

  useEffect(() => {
    const connection = hubRef.current

    const nextId =
      selectedGame?.gameSessionId || null

    if (
      !connection ||
      connection.state !==
        signalR.HubConnectionState.Connected
    ) {
      return
    }

    const updateRoom = async () => {
      try {
        if (
          joinedGameRef.current &&
          joinedGameRef.current !== nextId
        ) {
          await connection.invoke(
            'LeaveGame',
            joinedGameRef.current,
          )
        }

        joinedGameRef.current = null

        if (nextId) {
          await connection.invoke(
            'JoinGame',
            nextId,
          )

          joinedGameRef.current = nextId
        }
      } catch (error) {
        console.error(
          'SignalR room error:',
          error,
        )
      }
    }

    void updateRoom()
  }, [selectedGame?.gameSessionId])

  /* =======================================================
     CREATE CHALLENGE
  ======================================================= */

  const createChallenge = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const buddyId =
      Number(opponentUserId)

    if (
      !Number.isInteger(buddyId) ||
      buddyId <= 0
    ) {
      notify(
        'Choose a buddy',
        'Enter a valid matched buddy ID.',
        'error',
      )

      return
    }

    try {
      setActionKey('create')

      const response =
        await apiFetch<GameChallengeResponse>(
          '/api/BuddyGames/challenge',
          {
            method: 'POST',

            body: JSON.stringify({
              opponentUserId: buddyId,
              gameType: 'TicTacToe',
            }),
          },
        )

      if (response.code !== 1) {
        notify(
          'Challenge not sent',
          response.message,
          'error',
        )

        return
      }

      saveRecentGameId(
        response.gameSessionId,
      )

      notify(
        'Challenge sent 🎮',
        opponentName
          ? `${opponentName} has been challenged to Tic-Tac-Toe.`
          : `Buddy #${buddyId} has been challenged to Tic-Tac-Toe.`,
        'success',
      )

      await refreshEverything(true)
    } catch (error) {
      notify(
        'Challenge failed',
        error instanceof Error
          ? error.message
          : 'Could not create challenge.',
        'error',
      )
    } finally {
      setActionKey(null)
    }
  }

  /* =======================================================
     ACCEPT
  ======================================================= */

  const acceptChallenge = async (
    gameSessionId: number,
  ) => {
    try {
      setActionKey(
        `accept-${gameSessionId}`,
      )

      const response =
        await apiFetch<AcceptGameResponse>(
          `/api/BuddyGames/challenges/${gameSessionId}/accept`,
          {
            method: 'POST',
          },
        )

      if (
        response.code !== 1 ||
        !response.game
      ) {
        notify(
          'Could not accept',
          response.message,
          'error',
        )

        return
      }

      saveRecentGameId(
        gameSessionId,
      )

      notify(
        'Game on! ⚡',
        'Challenge accepted. You are O.',
        'success',
      )

      await openGame(gameSessionId)

      await refreshEverything(true)
    } catch (error) {
      notify(
        'Could not accept',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
        'error',
      )
    } finally {
      setActionKey(null)
    }
  }

  /* =======================================================
     DECLINE
  ======================================================= */

  const declineChallenge = async (
    gameSessionId: number,
  ) => {
    try {
      setActionKey(
        `decline-${gameSessionId}`,
      )

      const response =
        await apiFetch<GameActionResponse>(
          `/api/BuddyGames/challenges/${gameSessionId}/decline`,
          {
            method: 'POST',
          },
        )

      if (response.code !== 1) {
        notify(
          'Could not decline',
          response.message,
          'error',
        )

        return
      }

      notify(
        'Challenge declined',
        'The challenge has been removed.',
        'info',
      )

      await refreshEverything(true)
    } catch (error) {
      notify(
        'Unable to decline',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
        'error',
      )
    } finally {
      setActionKey(null)
    }
  }

  /* =======================================================
     CANCEL
  ======================================================= */

  const cancelChallenge = async (
    gameSessionId: number,
  ) => {
    try {
      setActionKey(
        `cancel-${gameSessionId}`,
      )

      const response =
        await apiFetch<GameActionResponse>(
          `/api/BuddyGames/challenges/${gameSessionId}/cancel`,
          {
            method: 'POST',
          },
        )

      if (response.code !== 1) {
        notify(
          'Could not cancel',
          response.message,
          'error',
        )

        return
      }

      notify(
        'Challenge cancelled',
        'Your pending challenge has been cancelled.',
        'info',
      )

      await refreshEverything(true)
    } catch (error) {
      notify(
        'Unable to cancel',
        error instanceof Error
          ? error.message
          : 'Something went wrong.',
        'error',
      )
    } finally {
      setActionKey(null)
    }
  }

  /* =======================================================
     MOVE
  ======================================================= */

  const makeMove = async (
    position: number,
  ) => {
    if (!selectedGame) return

    if (
      selectedGame.status.toLowerCase() !==
      'active'
    ) {
      return
    }

    if (
      selectedGame.currentTurnUserId !==
      currentUserId
    ) {
      notify(
        'Wait for your buddy',
        'It is not your turn yet.',
        'info',
      )

      return
    }

    const board =
      (
        selectedGame.boardState ||
        '---------'
      )
        .padEnd(9, '-')
        .slice(0, 9)

    if (board[position] !== '-') {
      return
    }

    try {
      setActionKey(
        `move-${position}`,
      )

      const response =
        await apiFetch<TicTacToeMoveResponse>(
          `/api/BuddyGames/games/${selectedGame.gameSessionId}/move`,
          {
            method: 'POST',

            body: JSON.stringify({
              position,
            }),
          },
        )

      if (
        response.code !== 1 ||
        !response.game
      ) {
        notify(
          'Move rejected',
          response.message,
          'error',
        )

        await openGame(
          selectedGame.gameSessionId,
          false,
        )

        return
      }

      setSelectedGame(response.game)

      saveRecentGameId(
        response.game.gameSessionId,
      )

      if (
        response.isWinner ||
        response.isDraw
      ) {
        await openGame(
          response.game.gameSessionId,
          false,
        )
      }
    } catch (error) {
      notify(
        'Move failed',
        error instanceof Error
          ? error.message
          : 'Could not make move.',
        'error',
      )
    } finally {
      setActionKey(null)
    }
  }

  /* =======================================================
     COMPUTED
  ======================================================= */

  const board = useMemo(() => {
    return (
      selectedGame?.boardState ||
      '---------'
    )
      .padEnd(9, '-')
      .slice(0, 9)
      .split('')
  }, [selectedGame?.boardState])

  const mySymbol = useMemo(() => {
    if (!selectedGame) return null

    if (
      selectedGame.player1Id ===
      currentUserId
    ) {
      return selectedGame.player1Symbol
    }

    if (
      selectedGame.player2Id ===
      currentUserId
    ) {
      return selectedGame.player2Symbol
    }

    return null
  }, [currentUserId, selectedGame])

  const opponentId = useMemo(() => {
    if (!selectedGame) return 0

    return selectedGame.player1Id ===
      currentUserId
      ? selectedGame.player2Id
      : selectedGame.player1Id
  }, [currentUserId, selectedGame])

  const isMyTurn =
    selectedGame?.status.toLowerCase() ===
      'active' &&
    selectedGame.currentTurnUserId ===
      currentUserId

  const buddyLabel = useCallback(
    (userId: number) => {
      if (userId === currentUserId) {
        return 'You'
      }

      if (
        Number(opponentUserId) === userId &&
        opponentName.trim()
      ) {
        return opponentName.trim()
      }

      return `Buddy #${userId}`
    },
    [
      currentUserId,
      opponentName,
      opponentUserId,
    ],
  )

  /* =======================================================
     LOADING
  ======================================================= */

  if (pageLoading) {
    return (
      <div className="bg-loading">
        <div className="bg-loader-ring">
          🎮
        </div>

        <strong>Opening Buddy Arcade</strong>

        <span>
          Loading challenges and game rooms…
        </span>

        <style jsx>{`
          .bg-loading {
            min-height: 62vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 10px;
            color: #f8fafc;
            text-align: center;
          }

          .bg-loading span {
            color: rgba(148, 163, 184, 0.68);
            font-size: 12px;
          }

          .bg-loader-ring {
            width: 68px;
            height: 68px;
            border-radius: 22px;
            display: grid;
            place-items: center;
            font-size: 28px;
            background: linear-gradient(
              145deg,
              rgba(99, 102, 241, 0.18),
              rgba(34, 211, 238, 0.08)
            );
            border: 1px solid
              rgba(129, 140, 248, 0.22);
            animation: float 1.7s ease-in-out
              infinite;
          }

          @keyframes float {
            50% {
              transform: translateY(-7px);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="bg-page">
      {/* =====================================================
          TOASTS
      ===================================================== */}

      <div className="bg-toast-stack">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`bg-toast ${toast.tone}`}
          >
            <div>
              {toast.tone === 'success'
                ? '✓'
                : toast.tone === 'error'
                  ? '!'
                  : '✦'}
            </div>

            <section>
              <strong>{toast.title}</strong>

              <span>{toast.message}</span>
            </section>
          </div>
        ))}
      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="bg-hero">
        <div className="bg-hero-glow one" />
        <div className="bg-hero-glow two" />

        <div className="bg-hero-main">
          <div className="bg-eyebrow">
            <span>🎮</span>
            BUDDY ARCADE
          </div>

          <h1>
            Play together.
            <br />
            <span>Know each other better.</span>
          </h1>

          <p>
            Challenge your matched buddies,
            compete live, build streaks and turn
            every match into something memorable.
          </p>

          <div className="bg-hero-actions">
            <button
              type="button"
              className="bg-primary"
              onClick={() => {
                document
                  .getElementById('challenge-zone')
                  ?.scrollIntoView({
                    behavior: 'smooth',
                  })
              }}
            >
              <span>⚔️</span>
              Challenge a buddy
            </button>

            <button
              type="button"
              className="bg-secondary"
              onClick={() =>
                router.push('/usersfilters')
              }
            >
              👥 Find buddies
            </button>
          </div>
        </div>

        <div className="bg-hero-side">
          <div className="bg-live-card">
            <div
              className={`bg-live-dot ${connectionState}`}
            />

            <div>
              <strong>
                {connectionState === 'connected'
                  ? 'Arcade online'
                  : connectionState ===
                      'reconnecting'
                    ? 'Reconnecting…'
                    : connectionState ===
                        'connecting'
                      ? 'Connecting…'
                      : 'Realtime offline'}
              </strong>

              <span>
                SignalR multiplayer connection
              </span>
            </div>
          </div>

          <div className="bg-stat-row">
            <div>
              <strong>{incoming.length}</strong>
              <span>Incoming</span>
            </div>

            <div>
              <strong>{outgoing.length}</strong>
              <span>Waiting</span>
            </div>

            <div>
              <strong>
                {
                  recentGames.filter(
                    game =>
                      game.status.toLowerCase() ===
                      'active',
                  ).length
                }
              </strong>
              <span>Live</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          GAME CATALOG
      ===================================================== */}

      <div className="bg-section-head">
        <div>
          <span>PLAY SOMETHING</span>
          <h2>Buddy games</h2>
        </div>

        <button
          type="button"
          onClick={() =>
            void refreshEverything()
          }
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <section className="bg-game-grid">
        <article className="bg-game-card featured">
          <div className="bg-game-top">
            <span className="bg-game-icon">
              ✕○
            </span>

            <span className="bg-ready">
              LIVE
            </span>
          </div>

          <div>
            <h3>Tic-Tac-Toe</h3>

            <p>
              Classic 1v1 battle with live turns,
              instant updates and rematch-worthy
              bragging rights.
            </p>
          </div>

          <footer>
            <span>⚡ Real-time</span>
            <span>2 players</span>
          </footer>
        </article>

        <article className="bg-game-card coming">
          <div className="bg-game-top">
            <span className="bg-game-icon">
              🧬
            </span>

            <span className="bg-coming">
              SOON
            </span>
          </div>

          <div>
            <h3>Buddy Sync</h3>

            <p>
              Answer together and discover how
              similarly you and your buddy think.
            </p>
          </div>

          <footer>
            <span>❤️ Compatibility</span>
          </footer>
        </article>

        <article className="bg-game-card coming">
          <div className="bg-game-top">
            <span className="bg-game-icon">
              🧠
            </span>

            <span className="bg-coming">
              SOON
            </span>
          </div>

          <div>
            <h3>Trivia Battle</h3>

            <p>
              Fast questions, categories and
              head-to-head score battles.
            </p>
          </div>

          <footer>
            <span>🏆 Competitive</span>
          </footer>
        </article>

        <article className="bg-game-card coming">
          <div className="bg-game-top">
            <span className="bg-game-icon">
              ✏️
            </span>

            <span className="bg-coming">
              SOON
            </span>
          </div>

          <div>
            <h3>Draw & Guess</h3>

            <p>
              Sketch clues live while your buddy
              races to figure them out.
            </p>
          </div>

          <footer>
            <span>🎨 Creative</span>
          </footer>
        </article>
      </section>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <section className="bg-main-grid">
        <div className="bg-left-column">
          {/* =================================================
              CHALLENGE COMPOSER
          ================================================= */}

          <section
            id="challenge-zone"
            className="bg-panel bg-challenge"
          >
            <div className="bg-panel-title">
              <div>
                <span>⚔️</span>

                <div>
                  <strong>
                    Start a challenge
                  </strong>

                  <small>
                    Choose one of your matched
                    buddies
                  </small>
                </div>
              </div>

              <span className="bg-chip">
                Tic-Tac-Toe
              </span>
            </div>

            <form
              onSubmit={createChallenge}
              className="bg-challenge-form"
            >
              <label>
                <span>Buddy ID</span>

                <input
                  type="number"
                  min="1"
                  value={opponentUserId}
                  onChange={event =>
                    setOpponentUserId(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. 14"
                />
              </label>

              <label>
                <span>
                  Buddy name
                  <i> optional</i>
                </span>

                <input
                  value={opponentName}
                  onChange={event =>
                    setOpponentName(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Rahul"
                />
              </label>

              <button
                type="submit"
                disabled={
                  actionKey === 'create'
                }
              >
                {actionKey === 'create'
                  ? 'Sending…'
                  : '🎮 Send challenge'}
              </button>
            </form>

            <div className="bg-challenge-hint">
              <span>💡</span>

              <div>
                <strong>
                  Better flow from buddy cards
                </strong>

                <p>
                  Open this page as
                  {' '}
                  <code>
                    /buddygames?buddyId=14&buddyName=Rahul
                  </code>
                  {' '}
                  and the challenge form is filled
                  automatically.
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              LIVE GAME ROOM
          ================================================= */}

          <section className="bg-panel bg-arena">
            <div className="bg-panel-title">
              <div>
                <span>🕹️</span>

                <div>
                  <strong>Game room</strong>

                  <small>
                    Real-time Tic-Tac-Toe
                  </small>
                </div>
              </div>

              {selectedGame ? (
                <span
                  className={`bg-status ${selectedGame.status.toLowerCase()}`}
                >
                  {gameStatusLabel(
                    selectedGame.status,
                  )}
                </span>
              ) : (
                <span className="bg-chip">
                  No room selected
                </span>
              )}
            </div>

            {!selectedGame ? (
              <div className="bg-no-game">
                <div>🎮</div>

                <strong>
                  Your next battle starts here
                </strong>

                <p>
                  Accept a challenge or open one
                  of your recent sessions to enter
                  the game room.
                </p>
              </div>
            ) : (
              <div className="bg-arena-layout">
                <div className="bg-board-zone">
                  <div className="bg-match-head">
                    <div>
                      <span
                        className={`bg-player-symbol ${
                          mySymbol === 'X'
                            ? 'x'
                            : 'o'
                        }`}
                      >
                        {mySymbol || '?'}
                      </span>

                      <section>
                        <small>
                          Your mark
                        </small>

                        <strong>You</strong>
                      </section>
                    </div>

                    <span className="bg-vs">
                      VS
                    </span>

                    <div>
                      <section>
                        <small>Opponent</small>

                        <strong>
                          {buddyLabel(
                            opponentId,
                          )}
                        </strong>
                      </section>

                      <span
                        className={`bg-player-symbol ${
                          mySymbol === 'X'
                            ? 'o'
                            : 'x'
                        }`}
                      >
                        {mySymbol === 'X'
                          ? 'O'
                          : 'X'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`bg-turn-banner ${
                      isMyTurn
                        ? 'mine'
                        : ''
                    }`}
                  >
                    {selectedGame.status.toLowerCase() ===
                    'completed' ? (
                      selectedGame.winnerUserId ? (
                        selectedGame.winnerUserId ===
                        currentUserId ? (
                          <>
                            🏆 You won this round!
                          </>
                        ) : (
                          <>
                            🤝{' '}
                            {buddyLabel(
                              selectedGame.winnerUserId,
                            )}{' '}
                            won the game
                          </>
                        )
                      ) : (
                        <>🤝 Draw game</>
                      )
                    ) : isMyTurn ? (
                      <>⚡ Your turn</>
                    ) : (
                      <>
                        Waiting for{' '}
                        {buddyLabel(
                          selectedGame.currentTurnUserId ||
                            opponentId,
                        )}
                        …
                      </>
                    )}
                  </div>

                  <div className="bg-board">
                    {board.map(
                      (cell, index) => {
                        const disabled =
                          cell !== '-' ||
                          !isMyTurn ||
                          selectedGame.status.toLowerCase() !==
                            'active' ||
                          actionKey !== null

                        return (
                          <button
                            type="button"
                            key={index}
                            disabled={disabled}
                            className={[
                              'bg-square',
                              cell === 'X'
                                ? 'x'
                                : '',
                              cell === 'O'
                                ? 'o'
                                : '',
                              isMyTurn &&
                              cell === '-'
                                ? 'playable'
                                : '',
                            ].join(' ')}
                            onClick={() =>
                              void makeMove(index)
                            }
                            aria-label={`Board position ${index + 1}`}
                          >
                            {cell === '-'
                              ? ''
                              : cell}
                          </button>
                        )
                      },
                    )}
                  </div>

                  <div className="bg-board-index">
                    Positions 0–8 · server
                    validates every move
                  </div>
                </div>

                <aside className="bg-game-info">
                  <div className="bg-session-title">
                    <span>GAME</span>

                    <strong>
                      #
                      {
                        selectedGame.gameSessionId
                      }
                    </strong>
                  </div>

                  <div className="bg-info-row">
                    <span>Status</span>

                    <strong>
                      {gameStatusLabel(
                        selectedGame.status,
                      )}
                    </strong>
                  </div>

                  <div className="bg-info-row">
                    <span>Your symbol</span>

                    <strong>
                      {mySymbol || '—'}
                    </strong>
                  </div>

                  <div className="bg-info-row">
                    <span>Moves</span>

                    <strong>
                      {selectedMoves.length}
                    </strong>
                  </div>

                  <div className="bg-info-row">
                    <span>Board</span>

                    <code>
                      {
                        selectedGame.boardState
                      }
                    </code>
                  </div>

                  <div className="bg-game-buttons">
                    <button
                      type="button"
                      onClick={() =>
                        void openGame(
                          selectedGame.gameSessionId,
                        )
                      }
                    >
                      ↻ Refresh game
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedGame(null)
                        setSelectedMoves([])
                      }}
                    >
                      Leave room
                    </button>
                  </div>

                  {selectedMoves.length > 0 && (
                    <div className="bg-move-log">
                      <span>MOVE HISTORY</span>

                      <div>
                        {selectedMoves
                          .slice()
                          .reverse()
                          .slice(0, 5)
                          .map(move => (
                            <article
                              key={move.moveId}
                            >
                              <strong>
                                #{move.moveNumber}
                              </strong>

                              <span>
                                {buddyLabel(
                                  move.userId,
                                )}
                              </span>

                              <i>
                                {move.symbol} ·{' '}
                                {move.position}
                              </i>
                            </article>
                          ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        </div>

        {/* ===================================================
            CHALLENGES
        =================================================== */}

        <aside className="bg-right-column">
          <section className="bg-panel">
            <div className="bg-panel-title">
              <div>
                <span>🔥</span>

                <div>
                  <strong>
                    Incoming challenges
                  </strong>

                  <small>
                    Buddies waiting for you
                  </small>
                </div>
              </div>

              {incoming.length > 0 && (
                <span className="bg-count">
                  {incoming.length}
                </span>
              )}
            </div>

            <div className="bg-challenge-list">
              {incoming.length === 0 ? (
                <div className="bg-empty-mini">
                  <span>✨</span>

                  <strong>
                    All caught up
                  </strong>

                  <p>
                    No buddy is challenging you
                    right now.
                  </p>
                </div>
              ) : (
                incoming.map(item => (
                  <article
                    key={item.gameSessionId}
                    className="bg-request-card"
                  >
                    <div className="bg-request-top">
                      <div className="bg-request-avatar">
                        🎮
                      </div>

                      <section>
                        <strong>
                          {buddyLabel(
                            item.challengerUserId,
                          )}
                        </strong>

                        <span>
                          challenged you to
                          Tic-Tac-Toe
                        </span>
                      </section>
                    </div>

                    <div className="bg-request-meta">
                      <span>
                        Game #
                        {item.gameSessionId}
                      </span>

                      <span>
                        {formatDate(
                          item.createdDate,
                        )}
                      </span>
                    </div>

                    <div className="bg-request-actions">
                      <button
                        type="button"
                        className="accept"
                        disabled={
                          actionKey !== null
                        }
                        onClick={() =>
                          void acceptChallenge(
                            item.gameSessionId,
                          )
                        }
                      >
                        {actionKey ===
                        `accept-${item.gameSessionId}`
                          ? 'Starting…'
                          : '⚡ Accept'}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionKey !== null
                        }
                        onClick={() =>
                          void declineChallenge(
                            item.gameSessionId,
                          )
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="bg-panel">
            <div className="bg-panel-title">
              <div>
                <span>⏳</span>

                <div>
                  <strong>
                    Sent challenges
                  </strong>

                  <small>
                    Waiting for buddies
                  </small>
                </div>
              </div>
            </div>

            <div className="bg-challenge-list compact">
              {outgoing.length === 0 ? (
                <div className="bg-empty-mini">
                  <span>🎯</span>

                  <strong>
                    Nothing pending
                  </strong>

                  <p>
                    Challenge someone and their
                    invite appears here.
                  </p>
                </div>
              ) : (
                outgoing.map(item => (
                  <article
                    key={item.gameSessionId}
                    className="bg-outgoing"
                  >
                    <div>
                      <strong>
                        {buddyLabel(
                          item.opponentUserId,
                        )}
                      </strong>

                      <span>
                        Waiting for response…
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        actionKey !== null
                      }
                      onClick={() =>
                        void cancelChallenge(
                          item.gameSessionId,
                        )
                      }
                    >
                      Cancel
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>

      {/* =====================================================
          RECENT GAMES
      ===================================================== */}

      <div className="bg-section-head recent-head">
        <div>
          <span>YOUR ARCADE</span>
          <h2>Recent game rooms</h2>
        </div>
      </div>

      <section className="bg-recent-grid">
        {recentGames.length === 0 ? (
          <div className="bg-recent-empty">
            <span>🕹️</span>

            <strong>No game rooms yet</strong>

            <p>
              Send or accept a challenge and your
              sessions will appear here.
            </p>
          </div>
        ) : (
          recentGames.map(game => {
            const opponent =
              game.player1Id === currentUserId
                ? game.player2Id
                : game.player1Id

            const won =
              game.winnerUserId === currentUserId

            const draw =
              game.status.toLowerCase() ===
                'completed' &&
              !game.winnerUserId

            return (
              <button
                type="button"
                key={game.gameSessionId}
                className="bg-recent-card"
                onClick={() =>
                  void openGame(
                    game.gameSessionId,
                  )
                }
              >
                <div className="bg-recent-icon">
                  ✕○
                </div>

                <div className="bg-recent-copy">
                  <small>
                    TIC-TAC-TOE · #
                    {game.gameSessionId}
                  </small>

                  <strong>
                    vs {buddyLabel(opponent)}
                  </strong>

                  <span>
                    {game.status.toLowerCase() ===
                    'active'
                      ? game.currentTurnUserId ===
                        currentUserId
                        ? '⚡ Your turn'
                        : 'Waiting for buddy'
                      : game.status.toLowerCase() ===
                          'pending'
                        ? 'Challenge pending'
                        : won
                          ? '🏆 You won'
                          : draw
                            ? '🤝 Draw'
                            : game.status.toLowerCase() ===
                                'completed'
                              ? 'Game finished'
                              : gameStatusLabel(
                                  game.status,
                                )}
                  </span>
                </div>

                <span className="bg-open">
                  ›
                </span>
              </button>
            )
          })
        )}
      </section>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx>{`
        .bg-page {
          width: 100%;
          color: #e2e8f0;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .bg-toast-stack {
          position: fixed;
          top: 82px;
          right: 20px;
          z-index: 999;
          width: min(360px, calc(100vw - 24px));
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .bg-toast {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(8, 13, 27, 0.97);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(20px);
          display: flex;
          gap: 10px;
          animation: toast-in 0.24s ease;
        }

        .bg-toast > div {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          background: rgba(99, 102, 241, 0.14);
          color: #a5b4fc;
          font-weight: 900;
        }

        .bg-toast.success > div {
          background: rgba(34, 197, 94, 0.11);
          color: #86efac;
        }

        .bg-toast.error > div {
          background: rgba(239, 68, 68, 0.11);
          color: #fca5a5;
        }

        .bg-toast section {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .bg-toast strong {
          font-size: 12px;
          color: #f8fafc;
        }

        .bg-toast span {
          margin-top: 2px;
          font-size: 10px;
          line-height: 1.45;
          color: rgba(148, 163, 184, 0.72);
        }

        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(18px);
          }
        }

        .bg-hero {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          padding: 28px;
          border-radius: 22px;
          border: 1px solid rgba(129, 140, 248, 0.16);
          background:
            linear-gradient(
              130deg,
              rgba(99, 102, 241, 0.14),
              rgba(34, 211, 238, 0.04) 48%,
              rgba(15, 23, 42, 0.42)
            ),
            rgba(8, 12, 24, 0.75);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 30px;
          align-items: center;
        }

        .bg-hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(10px);
          pointer-events: none;
        }

        .bg-hero-glow.one {
          width: 280px;
          height: 280px;
          right: 5%;
          top: -160px;
          background: rgba(99, 102, 241, 0.12);
        }

        .bg-hero-glow.two {
          width: 220px;
          height: 220px;
          left: 28%;
          bottom: -170px;
          background: rgba(34, 211, 238, 0.08);
        }

        .bg-hero-main,
        .bg-hero-side {
          position: relative;
          z-index: 1;
        }

        .bg-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #a5b4fc;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .bg-hero h1 {
          margin: 12px 0 0;
          max-width: 660px;
          color: #f8fafc;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1.03;
          letter-spacing: -0.045em;
        }

        .bg-hero h1 span {
          background: linear-gradient(
            90deg,
            #a5b4fc,
            #67e8f9
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .bg-hero p {
          max-width: 600px;
          margin: 14px 0 0;
          color: rgba(148, 163, 184, 0.72);
          font-size: 13px;
          line-height: 1.65;
        }

        .bg-hero-actions {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .bg-primary,
        .bg-secondary {
          height: 42px;
          padding: 0 15px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          transition: 0.18s ease;
        }

        .bg-primary {
          border: 1px solid rgba(129, 140, 248, 0.28);
          background: linear-gradient(
            135deg,
            #6366f1,
            #4f46e5 55%,
            #0891b2
          );
          color: white;
          box-shadow: 0 10px 30px rgba(79, 70, 229, 0.22);
        }

        .bg-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 35px rgba(79, 70, 229, 0.28);
        }

        .bg-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: #cbd5e1;
        }

        .bg-hero-side {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bg-live-card {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(5, 9, 20, 0.58);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bg-live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #64748b;
          box-shadow: 0 0 0 5px rgba(100, 116, 139, 0.08);
        }

        .bg-live-dot.connected {
          background: #4ade80;
          box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.08);
        }

        .bg-live-dot.connecting,
        .bg-live-dot.reconnecting {
          background: #fbbf24;
          box-shadow: 0 0 0 5px rgba(251, 191, 36, 0.08);
          animation: pulse 1.2s infinite;
        }

        @keyframes pulse {
          50% {
            opacity: 0.45;
          }
        }

        .bg-live-card > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .bg-live-card strong {
          font-size: 12px;
          color: #f8fafc;
        }

        .bg-live-card span {
          margin-top: 2px;
          color: rgba(148, 163, 184, 0.58);
          font-size: 10px;
        }

        .bg-stat-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .bg-stat-row > div {
          padding: 12px 8px;
          border-radius: 14px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          display: flex;
          flex-direction: column;
        }

        .bg-stat-row strong {
          color: #f8fafc;
          font-size: 18px;
        }

        .bg-stat-row span {
          margin-top: 2px;
          color: rgba(148, 163, 184, 0.56);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .bg-section-head {
          margin: 27px 2px 13px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }

        .bg-section-head > div {
          display: flex;
          flex-direction: column;
        }

        .bg-section-head span {
          color: #818cf8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .bg-section-head h2 {
          margin: 4px 0 0;
          color: #f8fafc;
          font-size: 19px;
          letter-spacing: -0.025em;
        }

        .bg-section-head > button {
          padding: 7px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: #94a3b8;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        .bg-game-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .bg-game-card {
          min-height: 184px;
          padding: 17px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(7, 11, 23, 0.55);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 20px;
          transition: 0.2s ease;
        }

        .bg-game-card.featured {
          border-color: rgba(99, 102, 241, 0.24);
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(99, 102, 241, 0.14),
              transparent 55%
            ),
            rgba(7, 11, 23, 0.7);
        }

        .bg-game-card:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 140, 248, 0.2);
        }

        .bg-game-card.coming {
          opacity: 0.72;
        }

        .bg-game-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bg-game-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.17);
          color: #c7d2fe;
          font-weight: 900;
        }

        .bg-ready,
        .bg-coming {
          padding: 4px 7px;
          border-radius: 99px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .bg-ready {
          color: #86efac;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.17);
        }

        .bg-coming {
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .bg-game-card h3 {
          margin: 0;
          color: #f1f5f9;
          font-size: 15px;
        }

        .bg-game-card p {
          margin: 6px 0 0;
          color: rgba(148, 163, 184, 0.62);
          font-size: 10px;
          line-height: 1.55;
        }

        .bg-game-card footer {
          display: flex;
          gap: 10px;
          color: rgba(148, 163, 184, 0.6);
          font-size: 9px;
        }

        .bg-main-grid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.75fr);
          gap: 14px;
          align-items: start;
        }

        .bg-left-column,
        .bg-right-column {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .bg-panel {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(6, 10, 21, 0.56);
          overflow: hidden;
        }

        .bg-panel-title {
          min-height: 60px;
          padding: 13px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .bg-panel-title > div {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .bg-panel-title > div > span {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(99, 102, 241, 0.09);
        }

        .bg-panel-title > div > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .bg-panel-title strong {
          color: #f1f5f9;
          font-size: 12px;
        }

        .bg-panel-title small {
          margin-top: 2px;
          color: rgba(148, 163, 184, 0.55);
          font-size: 9px;
        }

        .bg-chip,
        .bg-count,
        .bg-status {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 99px;
          font-size: 8px;
          font-weight: 900;
        }

        .bg-chip {
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.18);
          background: rgba(99, 102, 241, 0.07);
        }

        .bg-count {
          min-width: 24px;
          text-align: center;
          color: #fff;
          background: linear-gradient(135deg, #6366f1, #0891b2);
        }

        .bg-status.active {
          color: #86efac;
          background: rgba(34, 197, 94, 0.08);
        }

        .bg-status.completed {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.09);
        }

        .bg-status.pending {
          color: #fde68a;
          background: rgba(245, 158, 11, 0.08);
        }

        .bg-challenge-form {
          padding: 15px;
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 9px;
          align-items: end;
        }

        .bg-challenge-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bg-challenge-form label > span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
        }

        .bg-challenge-form label i {
          color: rgba(148, 163, 184, 0.42);
          font-style: normal;
          font-weight: 500;
        }

        .bg-challenge-form input {
          width: 100%;
          height: 40px;
          padding: 0 11px;
          outline: 0;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: #e2e8f0;
          font-size: 11px;
        }

        .bg-challenge-form input:focus {
          border-color: rgba(129, 140, 248, 0.38);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.07);
        }

        .bg-challenge-form button {
          height: 40px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(99, 102, 241, 0.28);
          background: linear-gradient(135deg, #6366f1, #0891b2);
          color: #fff;
          cursor: pointer;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 900;
        }

        .bg-challenge-hint {
          margin: 0 15px 15px;
          padding: 11px;
          border-radius: 12px;
          border: 1px solid rgba(34, 211, 238, 0.09);
          background: rgba(34, 211, 238, 0.025);
          display: flex;
          gap: 8px;
        }

        .bg-challenge-hint > span {
          flex: 0 0 auto;
        }

        .bg-challenge-hint strong {
          display: block;
          color: #cbd5e1;
          font-size: 9px;
        }

        .bg-challenge-hint p {
          margin: 3px 0 0;
          color: rgba(148, 163, 184, 0.55);
          font-size: 9px;
          line-height: 1.5;
        }

        .bg-challenge-hint code {
          color: #67e8f9;
          font-size: 8px;
        }

        .bg-no-game {
          min-height: 370px;
          display: grid;
          place-items: center;
          align-content: center;
          text-align: center;
          padding: 25px;
        }

        .bg-no-game > div {
          width: 64px;
          height: 64px;
          margin-bottom: 10px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 27px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.14);
        }

        .bg-no-game strong {
          color: #e2e8f0;
          font-size: 13px;
        }

        .bg-no-game p {
          max-width: 360px;
          margin: 6px 0 0;
          color: rgba(148, 163, 184, 0.56);
          font-size: 10px;
          line-height: 1.6;
        }

        .bg-arena-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          min-height: 470px;
        }

        .bg-board-zone {
          padding: 19px;
          border-right: 1px solid rgba(255, 255, 255, 0.055);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bg-match-head {
          width: min(470px, 100%);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
        }

        .bg-match-head > div {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bg-match-head > div:last-child {
          justify-content: flex-end;
          text-align: right;
        }

        .bg-match-head section {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .bg-match-head small {
          color: rgba(148, 163, 184, 0.5);
          font-size: 8px;
        }

        .bg-match-head strong {
          margin-top: 1px;
          color: #e2e8f0;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bg-player-symbol {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .bg-player-symbol.x {
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.17);
        }

        .bg-player-symbol.o {
          color: #67e8f9;
          background: rgba(34, 211, 238, 0.08);
          border: 1px solid rgba(34, 211, 238, 0.15);
        }

        .bg-vs {
          color: rgba(148, 163, 184, 0.35);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .bg-turn-banner {
          margin-top: 19px;
          min-height: 34px;
          padding: 0 13px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(148, 163, 184, 0.05);
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }

        .bg-turn-banner.mine {
          color: #c7d2fe;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.12);
        }

        .bg-board {
          width: min(330px, 82vw);
          aspect-ratio: 1;
          margin-top: 18px;
          padding: 7px;
          border-radius: 23px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          background: rgba(2, 6, 23, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.055);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.23);
        }

        .bg-square {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          color: #fff;
          cursor: default;
          font-size: clamp(35px, 5vw, 56px);
          font-weight: 900;
          transition: 0.16s ease;
        }

        .bg-square.x {
          color: #818cf8;
          text-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
        }

        .bg-square.o {
          color: #22d3ee;
          text-shadow: 0 0 30px rgba(34, 211, 238, 0.25);
        }

        .bg-square.playable {
          cursor: pointer;
        }

        .bg-square.playable:hover:not(:disabled) {
          transform: scale(0.96);
          background: rgba(99, 102, 241, 0.07);
          border-color: rgba(129, 140, 248, 0.24);
        }

        .bg-board-index {
          margin-top: 10px;
          color: rgba(148, 163, 184, 0.38);
          font-size: 8px;
        }

        .bg-game-info {
          padding: 16px;
          background: rgba(2, 6, 23, 0.14);
        }

        .bg-session-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .bg-session-title span {
          color: rgba(148, 163, 184, 0.44);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .bg-session-title strong {
          color: #c7d2fe;
          font-size: 10px;
        }

        .bg-info-row {
          min-height: 38px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .bg-info-row span {
          color: rgba(148, 163, 184, 0.55);
          font-size: 9px;
        }

        .bg-info-row strong,
        .bg-info-row code {
          color: #cbd5e1;
          font-size: 9px;
        }

        .bg-info-row code {
          color: #67e8f9;
        }

        .bg-game-buttons {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .bg-game-buttons button {
          min-height: 35px;
          border-radius: 10px;
          border: 1px solid rgba(99, 102, 241, 0.18);
          background: rgba(99, 102, 241, 0.08);
          color: #c7d2fe;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .bg-game-buttons button.ghost {
          border-color: rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #94a3b8;
        }

        .bg-move-log {
          margin-top: 18px;
        }

        .bg-move-log > span {
          color: rgba(148, 163, 184, 0.4);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .bg-move-log > div {
          margin-top: 7px;
          display: flex;
          flex-direction: column;
        }

        .bg-move-log article {
          min-height: 29px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.035);
          display: grid;
          grid-template-columns: 25px 1fr auto;
          gap: 5px;
          align-items: center;
          font-size: 8px;
        }

        .bg-move-log article strong {
          color: #818cf8;
        }

        .bg-move-log article span {
          color: #94a3b8;
        }

        .bg-move-log article i {
          color: #64748b;
          font-style: normal;
        }

        .bg-challenge-list {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bg-empty-mini {
          padding: 22px 15px;
          text-align: center;
        }

        .bg-empty-mini > span {
          display: block;
          margin-bottom: 6px;
          font-size: 21px;
        }

        .bg-empty-mini strong {
          color: #cbd5e1;
          font-size: 10px;
        }

        .bg-empty-mini p {
          max-width: 220px;
          margin: 4px auto 0;
          color: rgba(148, 163, 184, 0.5);
          font-size: 9px;
          line-height: 1.5;
        }

        .bg-request-card {
          padding: 11px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(255, 255, 255, 0.02);
        }

        .bg-request-top {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bg-request-avatar {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.17),
            rgba(34, 211, 238, 0.08)
          );
        }

        .bg-request-top section {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .bg-request-top strong {
          color: #e2e8f0;
          font-size: 10px;
        }

        .bg-request-top span {
          margin-top: 2px;
          color: rgba(148, 163, 184, 0.52);
          font-size: 8px;
        }

        .bg-request-meta {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          justify-content: space-between;
          color: rgba(148, 163, 184, 0.4);
          font-size: 8px;
        }

        .bg-request-actions {
          margin-top: 9px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .bg-request-actions button {
          min-height: 32px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: #94a3b8;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .bg-request-actions button.accept {
          border-color: rgba(34, 197, 94, 0.18);
          background: rgba(34, 197, 94, 0.07);
          color: #86efac;
        }

        .bg-outgoing {
          min-height: 55px;
          padding: 9px 10px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.045);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .bg-outgoing > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .bg-outgoing strong {
          color: #cbd5e1;
          font-size: 9px;
        }

        .bg-outgoing span {
          margin-top: 2px;
          color: rgba(148, 163, 184, 0.45);
          font-size: 8px;
        }

        .bg-outgoing button {
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid rgba(248, 113, 113, 0.13);
          background: rgba(248, 113, 113, 0.05);
          color: #fca5a5;
          cursor: pointer;
          font-size: 8px;
          font-weight: 800;
        }

        .recent-head {
          margin-top: 27px;
        }

        .bg-recent-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .bg-recent-empty {
          grid-column: 1 / -1;
          min-height: 120px;
          padding: 20px;
          border-radius: 16px;
          border: 1px dashed rgba(148, 163, 184, 0.13);
          display: grid;
          place-items: center;
          align-content: center;
          text-align: center;
        }

        .bg-recent-empty span {
          font-size: 24px;
        }

        .bg-recent-empty strong {
          margin-top: 5px;
          color: #cbd5e1;
          font-size: 11px;
        }

        .bg-recent-empty p {
          margin: 4px 0 0;
          color: rgba(148, 163, 184, 0.48);
          font-size: 9px;
        }

        .bg-recent-card {
          min-height: 83px;
          padding: 12px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: rgba(6, 10, 21, 0.48);
          color: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          transition: 0.18s ease;
        }

        .bg-recent-card:hover {
          border-color: rgba(99, 102, 241, 0.2);
          background: rgba(99, 102, 241, 0.045);
          transform: translateY(-1px);
        }

        .bg-recent-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: rgba(99, 102, 241, 0.09);
          color: #c7d2fe;
          font-weight: 900;
        }

        .bg-recent-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .bg-recent-copy small {
          color: rgba(129, 140, 248, 0.68);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .bg-recent-copy strong {
          margin-top: 2px;
          color: #e2e8f0;
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bg-recent-copy span {
          margin-top: 3px;
          color: rgba(148, 163, 184, 0.52);
          font-size: 8px;
        }

        .bg-open {
          color: rgba(148, 163, 184, 0.38);
          font-size: 20px;
        }

        button:disabled {
          cursor: not-allowed !important;
          opacity: 0.55;
        }

        button:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(103, 232, 249, 0.7);
          outline-offset: 2px;
        }

        @media (max-width: 1150px) {
          .bg-game-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bg-main-grid {
            grid-template-columns: minmax(0, 1fr) 290px;
          }
        }

        @media (max-width: 900px) {
          .bg-hero {
            grid-template-columns: 1fr;
          }

          .bg-hero-side {
            width: 100%;
          }

          .bg-main-grid {
            grid-template-columns: 1fr;
          }

          .bg-right-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .bg-recent-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .bg-hero {
            padding: 20px;
            border-radius: 17px;
          }

          .bg-hero h1 {
            font-size: 31px;
          }

          .bg-game-grid {
            grid-template-columns: 1fr 1fr;
          }

          .bg-challenge-form {
            grid-template-columns: 1fr;
          }

          .bg-challenge-form button {
            width: 100%;
          }

          .bg-arena-layout {
            grid-template-columns: 1fr;
          }

          .bg-board-zone {
            border-right: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .bg-game-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0 14px;
          }

          .bg-session-title,
          .bg-game-buttons,
          .bg-move-log {
            grid-column: 1 / -1;
          }

          .bg-right-column {
            grid-template-columns: 1fr;
          }

          .bg-recent-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 470px) {
          .bg-game-grid {
            grid-template-columns: 1fr;
          }

          .bg-hero-actions {
            flex-direction: column;
          }

          .bg-primary,
          .bg-secondary {
            width: 100%;
          }

          .bg-stat-row {
            gap: 5px;
          }

          .bg-match-head {
            gap: 5px;
          }

          .bg-board-zone {
            padding: 13px;
          }

          .bg-board {
            width: 100%;
          }

          .bg-game-info {
            grid-template-columns: 1fr;
          }

          .bg-session-title,
          .bg-game-buttons,
          .bg-move-log {
            grid-column: auto;
          }

          .bg-toast-stack {
            top: 12px;
            left: 12px;
            right: 12px;
            width: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}