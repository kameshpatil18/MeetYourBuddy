/* Required packages: npm install @microsoft/signalr html2canvas jspdf */

'use client'

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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

// A single visual card rendered under a bot reply — exercise, food item, etc.
type BotCard = {
  image?: string
  title: string
  subtitle?: string
  meta?: string[]
  link?: string
  kind?: 'exercise' | 'food' | 'gym' | 'youtube'
  actionLabel?: string
}

type GymResult = {
  id: string
  name: string
  address?: string
  rating?: number
  reviewCount?: number
  mapsUrl?: string
  photoUrl?: string
  priceLevel?: string
  estimatedMonthlyFee?: string
  feeNote?: string
  openNow?: boolean
}

type YouTubeVideo = {
  videoId: string
  title: string
  channelTitle?: string
  thumbnail?: string
  publishedAt?: string
  url: string
}

type AiServerReply = {
  reply: string
  category?: string
  suggestions?: FollowUpSuggestion[]
  provider?: string
  model?: string
  responseTimeMs?: number
}

type BotMessage = {
  id: string
  role: 'user' | 'bot'
  text: string
  time: string
  cards?: BotCard[]
  category?: string
  provider?: string
  model?: string
  responseTimeMs?: number
}

type FollowUpSuggestion = {
  label: string
  prompt: string
  category?: string
}

type FitnessProfile = {
  goal?: 'weight-gain' | 'fat-loss' | 'muscle-gain' | 'general-fitness'
  weightKg?: number
  heightCm?: number
  age?: number
  diet?: 'vegetarian' | 'non-vegetarian' | 'vegan'
  trainingDays?: number
  experience?: 'beginner' | 'intermediate' | 'advanced'
  equipment?: 'gym' | 'home' | 'bodyweight'
  injuries?: string[]
}

type ExerciseDbExercise = {
  exerciseId?: string
  id?: string
  name: string
  gifUrl?: string
  targetMuscles?: string[]
  bodyParts?: string[]
  equipments?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  target?: string
  bodyPart?: string
  equipment?: string
}

type OffProduct = {
  name: string
  brand?: string
  image?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CHAT_API_BASE = (
  process.env.NEXT_PUBLIC_CHAT_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'https://localhost:7250'
    : '')
).replace(/\/+$/, '')

const REQUEST_TIMEOUT_MS = 15_000
const STATUS_TIMEOUT_MS = 8_000
const AI_STREAM_TIMEOUT_MS = 75_000

function chatApiUrl(path: string): string {
  if (!CHAT_API_BASE) {
    throw new Error(
      'Chat API is not configured. Set NEXT_PUBLIC_CHAT_API_URL.',
    )
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${CHAT_API_BASE}${normalizedPath}`
}

const SIGNALR_HUB = CHAT_API_BASE ? `${CHAT_API_BASE}/chatHub` : ''
const EXERCISE_RESULT_LIMIT = 5
// Second public API — free, no key required, CORS-friendly. Used for real
// per-100g nutrition lookups (calories/protein/carbs/fat) with product photos.
const OPEN_FOOD_FACTS_BASE = 'https://world.openfoodfacts.org'
const FOOD_RESULT_LIMIT = 5
const BUDDY_AI_API = CHAT_API_BASE ? `${CHAT_API_BASE}/api/BuddyAi` : ''
const GYM_RESULT_LIMIT = 6
const YOUTUBE_RESULT_LIMIT = 4
const ACTIVE_CHAT_STORAGE_KEY = 'meetyourbuddy.activeChatUserId'

const POPULAR_INDIAN_CITIES = [
  'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Ahmedabad', 'Nashik', 'Nagpur', 'Thane', 'Jaipur',
]

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

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    )

    const decoded = decodeURIComponent(
      Array.from(atob(padded))
        .map(char =>
          `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
        )
        .join(''),
    )

    const payload: unknown = JSON.parse(decoded)

    return payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null
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

  const candidate =
    p.name ??
    p.unique_name ??
    p.given_name ??
    p.fullName

  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : 'Me'
}

function getStoredUserName(): string {
  if (typeof window === 'undefined') return ''

  const candidates = [
    localStorage.getItem('user'),
    sessionStorage.getItem('user'),
    getCookie('user'),
  ].filter(Boolean)

  for (const raw of candidates) {
    try {
      const user = JSON.parse(raw as string)
      const firstName = user.firstName ?? user.FirstName ?? user.first_name ?? ''
      const lastName = user.lastName ?? user.LastName ?? user.last_name ?? ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

      if (fullName) return fullName
      const fallbackName = user.fullName ?? user.FullName ?? user.name ?? user.Name
      if (fallbackName) return String(fallbackName).trim()
    } catch {
      // Ignore an invalid user object and try the next storage location.
    }
  }

  return ''
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text()
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

function getApiMessage(
  body: unknown,
  fallbackMessage: string,
): string {
  if (typeof body === 'string' && body.trim()) {
    return body.trim()
  }

  const message = getRecordValue(body, ['message', 'Message'])

  return typeof message === 'string' && message.trim()
    ? message.trim()
    : fallbackMessage
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function requireSuccessfulResponse(
  response: Response,
  fallbackMessage: string,
): Promise<void> {
  if (response.ok) return

  const body = await readJson(response)

  throw new ApiError(
    response.status,
    getApiMessage(
      body,
      `${fallbackMessage} returned HTTP ${response.status}`,
    ),
  )
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

function sanitizeBuddyReply(value: string): string {
  let text = String(value || '').trim()
  if (!text) return ''

  text = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*Thinking\.\.\.[\s\S]*?\.\.\.done thinking\.\s*/i, '')
    .replace(/^\s*follow-up question\*{0,2}\s*:?\s*/gim, '')
    .replace(/^\s*\d+\.\s*refine against persona guidelines.*$/gim, '')
    .replace(/^\s*(system prompt|hidden instructions|internal workflow)\s*:.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

function extractArray(
  result: unknown,
  ...keys: string[]
): unknown[] {
  if (Array.isArray(result)) return result
  if (!isRecord(result)) return []

  for (const key of keys) {
    const direct = result[key]
    if (Array.isArray(direct)) return direct

    const data = getRecordValue(result, ['data', 'Data'])
    if (isRecord(data) && Array.isArray(data[key])) {
      return data[key] as unknown[]
    }
  }

  const data = getRecordValue(result, ['data', 'Data'])
  if (Array.isArray(data)) return data

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

// ─── Buddy AI coach config ────────────────────────────────────────────────────
// Sent to the ASP.NET BuddyAiController, which calls the local Ollama model.
function normalizeServerSuggestions(value: unknown): FollowUpSuggestion[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()

  return value
    .filter(isRecord)
    .map(item => ({
      label: String(item.label ?? '').trim(),
      prompt: String(item.prompt ?? '').trim(),
      category: item.category ? String(item.category).trim() : undefined,
    }))
    .filter(item => {
      if (!item.label || !item.prompt) return false

      const key = `${item.label.toLowerCase()}|${item.prompt.toLowerCase()}`
      if (seen.has(key)) return false

      seen.add(key)
      return true
    })
    .slice(0, 6)
}

// First-run discovery shortcuts only.
// After the user sends the first message, these disappear and all subsequent
// follow-up suggestions come only from the ASP.NET BuddyAiController.
const INITIAL_BUDDY_SUGGESTIONS: FollowUpSuggestion[] = [
  {
    label: '🏢 Find nearby gyms',
    prompt: 'Find gyms near me.',
    category: 'gym-search',
  },
  {
    label: '🏋️ Explore chest exercises',
    prompt: 'Show me beginner-friendly chest exercises.',
    category: 'workout',
  },
  {
    label: '🎥 Watch squat form',
    prompt: 'Show me beginner squat technique videos.',
    category: 'youtube',
  },
  {
    label: '💪 3-day workout plan',
    prompt: 'Create a simple 3-day beginner gym workout plan.',
    category: 'beginner-workout',
  },
  {
    label: '🥗 Create a diet plan',
    prompt: 'Create a simple healthy diet plan for my fitness goal.',
    category: 'nutrition',
  },
  {
    label: '🍗 Check food nutrition',
    prompt: 'How much protein is in chicken breast?',
    category: 'nutrition',
  },
  {
    label: '📈 Build muscle',
    prompt: 'Help me build muscle as a beginner.',
    category: 'muscle-gain',
  },
  {
    label: '🔥 Lose fat',
    prompt: 'Give me a beginner-friendly fat loss plan.',
    category: 'fat-loss',
  },
  {
    label: '😴 Improve recovery',
    prompt: 'Give me practical recovery advice after gym workouts.',
    category: 'recovery',
  },
  {
    label: '💊 Supplements',
    prompt: 'Explain creatine and whey protein for beginners.',
    category: 'supplements',
  },
]

function extractFitnessProfile(messages: BotMessage[]): FitnessProfile {
  const userText = messages
    .filter(message => message.role === 'user')
    .map(message => message.text)
    .join(' ')
    .toLowerCase()

  const profile: FitnessProfile = {}

  if (/gain weight|weight gain|underweight|too (?:low|thin)|bulk/.test(userText)) {
    profile.goal = 'weight-gain'
  } else if (/gain muscle|muscle gain|build muscle/.test(userText)) {
    profile.goal = 'muscle-gain'
  } else if (/lose weight|weight loss|fat loss|cutting/.test(userText)) {
    profile.goal = 'fat-loss'
  }

  const weightMatches = [...userText.matchAll(/(?:weight(?: is)?|weigh|i am|i'm)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)/g)]
  const weight = weightMatches.at(-1)?.[1]
  if (weight) {
    const value = Number(weight)
    if (value >= 25 && value <= 350) profile.weightKg = value
  }

  const heightCmMatches = [...userText.matchAll(/(?:height(?: is)?|i am|i'm)?\s*(1\d{2}|2[0-4]\d)\s*(?:cm|centimeters?)/g)]
  const heightCm = heightCmMatches.at(-1)?.[1]
  if (heightCm) profile.heightCm = Number(heightCm)

  const ageMatches = [...userText.matchAll(/(?:age(?: is)?|i am|i'm)\s*(\d{1,2})\s*(?:years? old|yrs?|yo)?/g)]
  const age = ageMatches.at(-1)?.[1]
  if (age) {
    const value = Number(age)
    if (value >= 13 && value <= 100) profile.age = value
  }

  const daysMatches = [...userText.matchAll(/(\d)\s*days?(?:\s+per\s+week|\s+weekly|\s+a\s+week)?/g)]
  const days = daysMatches.at(-1)?.[1]
  if (days) {
    const value = Number(days)
    if (value >= 1 && value <= 7) profile.trainingDays = value
  }

  if (/\bvegan\b/.test(userText)) {
    profile.diet = 'vegan'
  } else if (/\bvegetarian\b|\bveg\b/.test(userText)) {
    profile.diet = 'vegetarian'
  } else if (/non[- ]?veg|chicken|fish|meat|egg/.test(userText)) {
    profile.diet = 'non-vegetarian'
  }

  if (/\bbeginner\b|new to gym|just started|first time/.test(userText)) {
    profile.experience = 'beginner'
  } else if (/\bintermediate\b|training for [1-3] years?/.test(userText)) {
    profile.experience = 'intermediate'
  } else if (/\badvanced\b|training for [4-9] years?/.test(userText)) {
    profile.experience = 'advanced'
  }

  if (/home workout|workout at home|home training/.test(userText)) {
    profile.equipment = 'home'
  } else if (/bodyweight|no equipment/.test(userText)) {
    profile.equipment = 'bodyweight'
  } else if (/\bgym\b|dumbbell|barbell|machine/.test(userText)) {
    profile.equipment = 'gym'
  }

  const injuries: string[] = []
  if (/knee pain|knee injury/.test(userText)) injuries.push('knee')
  if (/shoulder pain|shoulder injury/.test(userText)) injuries.push('shoulder')
  if (/back pain|lower back/.test(userText)) injuries.push('back')
  if (/wrist pain|wrist injury/.test(userText)) injuries.push('wrist')
  if (injuries.length) profile.injuries = [...new Set(injuries)]

  return profile
}

function calculateProteinRange(weightKg?: number): string | null {
  if (!weightKg) return null

  const minimum = Math.round(weightKg * 1.6)
  const maximum = Math.round(weightKg * 2)
  return `${minimum}–${maximum} g`
}

function detectFitnessCategory(message: string): string {
  const text = message.toLowerCase()

  if (/calorie|calories|nutrition|nutritional|macros|protein in|carbs in|fat in|food label/.test(text)) {
    return 'nutrition'
  }

  if (text.includes('beginner') || text.includes('workout plan') || text.includes('routine')) {
    return 'beginner-workout'
  }

  if (text.includes('bulk') || text.includes('muscle') || text.includes('gain')) {
    return 'muscle-gain'
  }

  if (text.includes('fat') || text.includes('weight loss') || text.includes('cutting')) {
    return 'fat-loss'
  }

  if (text.includes('recover') || text.includes('sleep') || text.includes('sore') || text.includes('rest')) {
    return 'recovery'
  }

  if (text.includes('supplement') || text.includes('creatine') || text.includes('whey') || text.includes('protein powder')) {
    return 'supplements'
  }

  if (text.includes('form') || text.includes('technique') || text.includes('posture')) {
    return 'exercise-form'
  }

  if (/exercise|workout|chest|back|shoulder|arm|leg|glute|abs|squat|deadlift|press|curl|row|push.?up|pull.?up/.test(text)) {
    return 'workout'
  }

  return 'general'
}

const BODY_PART_ALIASES: Record<string, string> = {
  abs: 'waist',
  abdominal: 'waist',
  abdominals: 'waist',
  arms: 'upper arms',
  arm: 'upper arms',
  bicep: 'upper arms',
  biceps: 'upper arms',
  tricep: 'upper arms',
  triceps: 'upper arms',
  leg: 'upper legs',
  legs: 'upper legs',
  quad: 'upper legs',
  quads: 'upper legs',
  hamstring: 'upper legs',
  hamstrings: 'upper legs',
  calf: 'lower legs',
  calves: 'lower legs',
  shoulder: 'shoulders',
  chest: 'chest',
  back: 'back',
  cardio: 'cardio',
  neck: 'neck',
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'best', 'can', 'create', 'do', 'effective', 'exercise',
  'exercises', 'for', 'give', 'gym', 'help', 'how', 'i', 'me', 'my', 'of', 'plan',
  'please', 'routine', 'show', 'some', 'suggest', 'the', 'to', 'training', 'want',
  'what', 'with', 'workout', 'much', 'many', 'is', 'in', 'are',
])

// Foods checked before falling back to keyword extraction, so common items
// route to Open Food Facts reliably even inside a longer sentence.
const FOOD_KEYWORDS = [
  'chicken', 'egg', 'eggs', 'paneer', 'rice', 'banana', 'oats', 'milk', 'curd',
  'yogurt', 'dal', 'lentil', 'lentils', 'soy', 'soya', 'tofu', 'fish', 'beef',
  'pork', 'bread', 'apple', 'almond', 'almonds', 'peanut', 'peanuts', 'peanut butter',
  'whey', 'oil', 'ghee', 'potato', 'sweet potato', 'chapati', 'roti', 'quinoa', 'cheese',
]

function normalizeExercise(raw: any): ExerciseDbExercise | null {
  const name = String(raw?.name ?? raw?.exerciseName ?? '').trim()
  if (!name) return null

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean)
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    return []
  }

  return {
    exerciseId: raw.exerciseId ?? raw.id,
    id: raw.id ?? raw.exerciseId,
    name,
    gifUrl: raw.gifUrl ?? raw.imageUrl,
    targetMuscles: toArray(raw.targetMuscles ?? raw.target),
    bodyParts: toArray(raw.bodyParts ?? raw.bodyPart),
    equipments: toArray(raw.equipments ?? raw.equipment),
    secondaryMuscles: toArray(raw.secondaryMuscles),
    instructions: toArray(raw.instructions),
    target: raw.target,
    bodyPart: raw.bodyPart,
    equipment: raw.equipment,
  }
}

function extractExercises(payload: any): ExerciseDbExercise[] {
  const candidates = extractArray(payload, 'exercises', 'items', 'results')
  return candidates.map(normalizeExercise).filter(Boolean) as ExerciseDbExercise[]
}

function getExerciseSearchTerm(message: string): string {
  const lower = message.toLowerCase()
  const bodyPart = Object.keys(BODY_PART_ALIASES).find(part => lower.includes(part))
  if (bodyPart) return BODY_PART_ALIASES[bodyPart]

  return lower
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 4)
    .join(' ')
    .trim()
}

function exerciseMatches(exercise: ExerciseDbExercise, term: string): boolean {
  if (!term) return true
  const haystack = [
    exercise.name,
    ...(exercise.targetMuscles ?? []),
    ...(exercise.bodyParts ?? []),
    ...(exercise.equipments ?? []),
    ...(exercise.secondaryMuscles ?? []),
  ].join(' ').toLowerCase()

  return term.toLowerCase().split(/\s+/).some(word => haystack.includes(word))
}

async function fetchExerciseDbExercises(
  message: string,
): Promise<ExerciseDbExercise[]> {
  const term = getExerciseSearchTerm(message)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 18000)

  try {
    const response = await fetch(
      `/api/exercises?search=${encodeURIComponent(term)}&limit=${EXERCISE_RESULT_LIMIT}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      },
    )

    const payload = await readJson(response)

 if (!response.ok) {
  throw new Error(
    getApiMessage(
      payload,
      `Exercise search returned HTTP ${response.status}`,
    ),
  )
}

    return extractExercises(payload).slice(0, EXERCISE_RESULT_LIMIT)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function buildExerciseCards(exercises: ExerciseDbExercise[]): BotCard[] {
  return exercises.map(exercise => ({
    kind: 'exercise',
    image: exercise.gifUrl,
    title: exercise.name,
    subtitle: [
      exercise.bodyParts?.[0] || exercise.bodyPart,
      exercise.equipments?.[0] || exercise.equipment,
    ].filter(Boolean).join(' • ') || undefined,
    meta: (exercise.instructions ?? [])
      .slice(0, 2)
      .map(step => step.replace(/^Step:\d+\s*/i, '')),
  }))
}

function formatExerciseReplyText(exercises: ExerciseDbExercise[], message: string): string {
  if (!exercises.length) {
    return `I couldn't find a matching exercise in ExerciseDB for **${message}**. Try a body part or movement such as chest, back, shoulders, squats, curls, or push-ups.`
  }

  return `🏋️ Found a few moves that match **${message}** — swipe through the cards below. Start with a manageable weight, controlled reps, and stop if you feel sharp pain.\n\n_Data: ExerciseDB by AscendAPI._`
}

function shouldQueryExerciseDb(
  message: string,
  category: string,
): boolean {
  const text = message.toLowerCase()

  const asksForPlan =
    /workout plan|training plan|weekly routine|program|schedule|split|3-day|4-day|5-day/i.test(
      text,
    )

  if (asksForPlan) return false
  if (category === 'exercise-form') return true

  return /show exercises|suggest exercises|exercise for|exercises for|chest exercises|back exercises|shoulder exercises|arm exercises|leg exercises|bicep|tricep|glute|abs|squat|deadlift|bench press|push.?up|pull.?up|curl|row/i.test(
    text,
  )
}

// ─── Open Food Facts integration ───────────────────────────────────────────────
// Second public API, free and key-free. Used for real per-100g nutrition data
// (calories/protein/carbs/fat) plus a product photo, instead of Buddy AI guessing.
function shouldQueryOpenFoodFacts(message: string, _category: string): boolean {
  const text = message.toLowerCase()

  const explicitlyRequestsNutritionData =
    /calories?\s+(?:in|of)|protein\s+(?:in|of)|carbs?\s+(?:in|of)|fat\s+(?:in|of)|macros?\s+(?:in|of)|nutrition(?:al)?\s+(?:value|information)|per\s*100\s*g/i.test(text)

  if (explicitlyRequestsNutritionData) return true

  if (/how much .* should i eat|how much .* should i take|daily|diet plan|meal plan|muscle gain|weight gain|fat loss/i.test(text)) {
    return false
  }

  return false
}

function getFoodSearchTerm(message: string): string {
  const lower = message.toLowerCase()
  const found = FOOD_KEYWORDS.find(food => lower.includes(food))
  if (found) return found

  return lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 3)
    .join(' ')
    .trim()
}

function normalizeOffProduct(raw: any): OffProduct | null {
  const name = raw?.product_name || raw?.product_name_en || raw?.generic_name
  if (!name) return null

  const n = raw.nutriments || {}

  return {
    name: String(name).trim(),
    brand: raw.brands ? String(raw.brands).split(',')[0].trim() : undefined,
    image: raw.image_front_small_url || raw.image_small_url || raw.image_url,
    calories: n['energy-kcal_100g'] ?? n['energy-kcal'],
    protein: n['proteins_100g'],
    carbs: n['carbohydrates_100g'],
    fat: n['fat_100g'],
  }
}

async function fetchOpenFoodFactsProducts(message: string): Promise<OffProduct[]> {
  const term = getFoodSearchTerm(message)
  if (!term) return []

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)

  try {
    const url = `${OPEN_FOOD_FACTS_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8&sort_by=unique_scans_n`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}`)

    const payload = await readJson(response)
    const products = extractArray(payload, 'products')

    const normalized = products
      .map(normalizeOffProduct)
      // Only keep entries that actually have usable calorie/protein data.
      .filter((p): p is OffProduct => !!p && (p.calories != null || p.protein != null))

    return normalized.slice(0, FOOD_RESULT_LIMIT)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function buildFoodCards(products: OffProduct[]): BotCard[] {
  return products.map(product => ({
    kind: 'food',
    image: product.image,
    title: product.brand ? `${product.name} — ${product.brand}` : product.name,
    subtitle: 'Per 100 g',
    meta: [
      product.calories != null ? `${Math.round(product.calories)} kcal` : null,
      product.protein != null ? `${product.protein.toFixed(1)} g protein` : null,
      product.carbs != null ? `${product.carbs.toFixed(1)} g carbs` : null,
      product.fat != null ? `${product.fat.toFixed(1)} g fat` : null,
    ].filter(Boolean) as string[],
  }))
}

function estimateGymFee(priceLevel?: string, city?: string): { fee: string; note: string } {
  const metro = /mumbai|delhi|bengaluru|bangalore|pune|hyderabad|chennai/i.test(city || '')
  const bands: Record<string, [number, number]> = {
    PRICE_LEVEL_INEXPENSIVE: metro ? [800, 1800] : [600, 1400],
    PRICE_LEVEL_MODERATE: metro ? [1800, 3500] : [1200, 2600],
    PRICE_LEVEL_EXPENSIVE: metro ? [3500, 7000] : [2500, 5500],
    PRICE_LEVEL_VERY_EXPENSIVE: metro ? [7000, 15000] : [5000, 11000],
  }
  const [low, high] = bands[priceLevel || ''] || (metro ? [1500, 4000] : [1000, 3000])
  return {
    fee: `₹${low.toLocaleString('en-IN')}–₹${high.toLocaleString('en-IN')}/month`,
    note: 'Tentative estimate only. Confirm joining fees, taxes, personal training, and offers directly with the gym.',
  }
}

async function fetchGymsByCity(city: string, token: string): Promise<GymResult[]> {
  if (!BUDDY_AI_API) {
    throw new Error('Chat API is not configured.')
  }

  const response = await fetchWithTimeout(`${BUDDY_AI_API}/gyms?city=${encodeURIComponent(city)}&limit=${GYM_RESULT_LIMIT}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  await requireSuccessfulResponse(response, 'Gym search')
  const payload = await readJson(response)
  const rows = extractArray(payload, 'gyms', 'places', 'results')
  return rows.slice(0, GYM_RESULT_LIMIT).map((gym: any, index: number) => {
    const priceLevel = gym.priceLevel ?? gym.price_level
    const estimate = estimateGymFee(priceLevel, city)
    return {
      id: String(gym.id ?? gym.placeId ?? gym.place_id ?? `${city}-${index}`),
      name: String(gym.name ?? gym.displayName?.text ?? gym.displayName ?? 'Gym'),
      address: gym.address ?? gym.formattedAddress ?? gym.formatted_address,
      rating: Number(gym.rating || 0) || undefined,
      reviewCount: Number(gym.reviewCount ?? gym.userRatingCount ?? gym.user_ratings_total ?? 0) || undefined,
      mapsUrl: gym.mapsUrl ?? gym.googleMapsUri ?? gym.url,
      photoUrl: gym.photoUrl ?? gym.photo,
      priceLevel,
      estimatedMonthlyFee: gym.estimatedMonthlyFee ?? estimate.fee,
      feeNote: gym.feeNote ?? estimate.note,
      openNow: gym.openNow ?? gym.currentOpeningHours?.openNow,
    }
  })
}

function buildGymCards(gyms: GymResult[]): BotCard[] {
  return gyms.map(gym => ({
    kind: 'gym',
    image: gym.photoUrl,
    title: gym.name,
    subtitle: gym.address,
    meta: [
      gym.rating ? `⭐ ${gym.rating}${gym.reviewCount ? ` (${gym.reviewCount})` : ''}` : null,
      gym.openNow === true ? 'Open now' : null,
      gym.estimatedMonthlyFee ? `Est. ${gym.estimatedMonthlyFee}` : null,
    ].filter(Boolean) as string[],
    link: gym.mapsUrl,
    actionLabel: 'Open in Maps',
  }))
}

function shouldSearchGyms(message: string): boolean {
  const text = message.toLowerCase().trim()

  const mentionsGym =
    /\bgyms?\b|\bfitness\s+cent(?:er|re)s?\b/.test(text)

  if (!mentionsGym) {
    return false
  }

  // If a supported city is explicitly mentioned, this is definitely a
  // location lookup and must go to Google Places instead of Ollama.
  const mentionsKnownCity =
    POPULAR_INDIAN_CITIES.some(city =>
      text.includes(city.toLowerCase()),
    )

  if (mentionsKnownCity) {
    return true
  }

  return (
    /\bnear me\b|\bnearby\b/.test(text) ||
    /\bfind\b|\bshow\b|\bgive\b|\blist\b|\bsearch\b|\bavailable\b/.test(text) ||
    /\b(?:in|from|at|near|around)\b/.test(text)
  )
}

function extractCity(message: string): string {
  const text = message.trim()

  // Prefer exact known-city matches first.
  const knownCity =
    POPULAR_INDIAN_CITIES.find(city =>
      text.toLowerCase().includes(city.toLowerCase()),
    )

  if (knownCity) {
    return knownCity
  }

  // Handles natural variants such as:
  // "gyms in Nashik"
  // "give gyms from Nashik"
  // "show gyms around Pune"
  // "find a gym near Mumbai"
  // "fitness centres at Thane"
  const patterns = [
    /\bgyms?\s+(?:in|from|at|near|around)\s+([a-zA-Z][a-zA-Z .'-]{1,40})/i,
    /\b(?:find|show|give|list|search(?:\s+for)?)\s+(?:me\s+)?(?:a\s+|some\s+)?gyms?\s+(?:in|from|at|near|around)\s+([a-zA-Z][a-zA-Z .'-]{1,40})/i,
    /\bfitness\s+cent(?:er|re)s?\s+(?:in|from|at|near|around)\s+([a-zA-Z][a-zA-Z .'-]{1,40})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match?.[1]) {
      return match[1]
        .replace(/\b(?:please|for me|now|today)\b.*$/i, '')
        .replace(/[?.!,]+$/g, '')
        .trim()
    }
  }

  // Also support short forms like "gyms Nashik".
  const shortForm =
    text.match(/\bgyms?\s+([a-zA-Z][a-zA-Z .'-]{1,40})$/i)

  if (shortForm?.[1]) {
    return shortForm[1]
      .replace(/[?.!,]+$/g, '')
      .trim()
  }

  return ''
}

function shouldSearchYouTube(message: string): boolean {
  return /youtube|video|watch|tutorial|technique|how to do|form demo|demonstration|suryanamaskar|surya namaskar|yoga pose/i.test(message)
}

async function fetchYouTubeVideos(query: string, token: string): Promise<YouTubeVideo[]> {
  if (!BUDDY_AI_API) {
    throw new Error('Chat API is not configured.')
  }

  const response = await fetchWithTimeout(`${BUDDY_AI_API}/youtube?q=${encodeURIComponent(query)}&limit=${YOUTUBE_RESULT_LIMIT}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  await requireSuccessfulResponse(response, 'YouTube search')
  const payload = await readJson(response)
  const rows = extractArray(payload, 'videos', 'items', 'results')
  return rows.slice(0, YOUTUBE_RESULT_LIMIT).map((video: any) => {
    const videoId = String(video.videoId ?? video.id?.videoId ?? video.id ?? '')
    return {
      videoId,
      title: String(video.title ?? video.snippet?.title ?? 'YouTube video'),
      channelTitle: video.channelTitle ?? video.snippet?.channelTitle,
      thumbnail: video.thumbnail ?? video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url,
      publishedAt: video.publishedAt ?? video.snippet?.publishedAt,
      url: video.url ?? `https://www.youtube.com/watch?v=${videoId}`,
    }
  }).filter((video: YouTubeVideo) => video.videoId)
}

function buildYouTubeCards(videos: YouTubeVideo[]): BotCard[] {
  return videos.map(video => ({
    kind: 'youtube',
    image: video.thumbnail,
    title: video.title,
    subtitle: video.channelTitle,
    meta: video.publishedAt ? [new Date(video.publishedAt).toLocaleDateString('en-IN')] : [],
    link: video.url,
    actionLabel: 'Watch on YouTube',
  }))
}

async function fetchBuddyAiReply(
  message: string,
  history: BotMessage[],
  profile: FitnessProfile,
  token: string,
  onDelta?: (text: string) => void,
): Promise<AiServerReply> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AI_STREAM_TIMEOUT_MS)

  try {
    if (!BUDDY_AI_API) {
      throw new Error('Chat API is not configured.')
    }

    const response = await fetch(`${BUDDY_AI_API}/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        message,
        profile,
        // Keep context intentionally small. Fitness profile already carries
        // durable facts, so only recent turns are needed for conversational flow.
        history: history
          .filter(item => item.id !== '0' && item.text.trim())
          .slice(-4)
          .map(item => ({
            role: item.role === 'bot' ? 'assistant' : 'user',
            content: item.text.slice(-700),
          })),
      }),
    })

    await requireSuccessfulResponse(response, 'Buddy AI')

    if (!response.body) {
      throw new Error('Buddy AI streaming response is unavailable.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let reply = ''
    let meta: AiServerReply = { reply: '' }

    const consumeLine = (line: string) => {
      const clean = line.trim()
      if (!clean) return

      const event = JSON.parse(clean)

      if (event.type === 'delta') {
        const delta = String(event.delta ?? '')
        if (!delta) return
        reply += delta
        onDelta?.(sanitizeBuddyReply(reply))
        return
      }

      if (event.type === 'done') {
        meta = {
          reply: sanitizeBuddyReply(reply || String(event.reply ?? '')),
          category: event.category ? String(event.category) : undefined,
          suggestions: normalizeServerSuggestions(event.suggestions),
          provider: event.provider ? String(event.provider) : 'ollama',
          model: event.model ? String(event.model) : undefined,
          responseTimeMs: Number(event.responseTimeMs) || undefined,
        }
        return
      }

      if (event.type === 'error') {
        throw new Error(String(event.message ?? 'Buddy AI failed to generate a response.'))
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) consumeLine(line)
    }

    buffer += decoder.decode()
    if (buffer.trim()) consumeLine(buffer)

    return {
      ...meta,
      reply: sanitizeBuddyReply(meta.reply || reply),
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function buildPlainChat(messages: BotMessage[]): string {
  return messages.map(message => `${message.role === 'bot' ? 'Buddy AI' : 'You'}: ${message.text.replace(/\*\*/g, '')}`).join('\n\n')
}

function formatFoodReplyText(products: OffProduct[], message: string): string {
  if (!products.length) {
    return `I couldn't find clean nutrition data for **${message}** on Open Food Facts. Try a more common or packaged food name, or ask me for a general estimate instead.`
  }

  return `🍽️ Here's real nutrition data for **${message}** — values are per 100 g, so scale to your actual portion.\n\n_Data: Open Food Facts (community-sourced, key-free)._`
}

function getRecentFitnessContext(messages: BotMessage[]): string {
  return messages.slice(-6).map(message => message.text).join(' ').toLowerCase()
}

function resolveFitnessCategory(message: string, forcedCategory: string | undefined, recentContext: string): string {
  if (forcedCategory) return forcedCategory
  const detected = detectFitnessCategory(message)
  if (detected !== 'general') return detected
  if (/bulk|muscle gain|gain weight|weight gain|calorie surplus|underweight/.test(recentContext)) return 'muscle-gain'
  if (/fat loss|weight loss|cutting|calorie deficit/.test(recentContext)) return 'fat-loss'
  return detected
}

function getRequestedWorkoutDays(message: string): number | null {
  const text = message.toLowerCase()
  const digitMatch = text.match(/\b([1-7])\s*[- ]?days?\b/)
  if (digitMatch) return Number(digitMatch[1])

  const wordDays: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  }

  const wordMatch = text.match(/\b(one|two|three|four|five|six|seven)\s*[- ]?days?\b/)
  return wordMatch ? wordDays[wordMatch[1]] : null
}

function isWorkoutPlanRequest(message: string, category: string): boolean {
  const text = message.toLowerCase()
  return (
    category === 'beginner-workout' ||
    /\b(?:workout|training|gym|exercise)\s+(?:plan|program|routine|schedule)\b/i.test(text) ||
    /\b(?:plan|program|routine|schedule)\s+(?:for\s+)?(?:gym|workout|training)\b/i.test(text) ||
    /\b(?:[1-7]|one|two|three|four|five|six|seven)\s*[- ]?days?\b/i.test(text) ||
    /\bpush pull legs\b|\bppl\b|\bupper lower\b|\bfull body\b/i.test(text)
  )
}

function isCompleteWorkoutPlanReply(reply: string, requestedDays: number | null): boolean {
  if (!reply.trim()) return false

  const normalized = reply.toLowerCase()
  if (requestedDays) {
    for (let day = 1; day <= requestedDays; day += 1) {
      if (!new RegExp(`\\bday\\s*${day}\\b`, 'i').test(normalized)) return false
    }
  }

  const exerciseRows = reply.split('\n').filter(line => /^\s*[-•*]\s+/.test(line))
  const hasSetsOrReps = /\b\d+\s*[x×]\s*\d+|\bsets?\b|\breps?\b/i.test(reply)
  const hasProgression = /progress|increase.*weight|add.*reps|progressive overload/i.test(reply)

  if (requestedDays) {
    return exerciseRows.length >= requestedDays * 3 && hasSetsOrReps && hasProgression
  }

  return exerciseRows.length >= 6 && hasSetsOrReps
}

// Always-available fallback when both public APIs are busy, unavailable, or
// the question isn't a lookup (e.g. workout plans, recovery, supplements).
function getOfflineFitnessReply(message: string, category: string, recentContext = ''): string {
  const text = message.toLowerCase()

  if (/chest pain|faint|can't breathe|cannot breathe|severe pain|broken|fracture/.test(text)) {
    return '⚠️ Stop exercising and seek urgent medical help, especially for chest pain, fainting, breathing trouble, or a suspected fracture. Buddy AI cannot diagnose emergencies.'
  }

  const requestedWorkoutDays = getRequestedWorkoutDays(message)

  if (category === 'beginner-workout' && requestedWorkoutDays === 7) {
    return `💪 **7-Day Beginner Workout Plan**

This schedule uses **five training days and two active-recovery days** so you can exercise daily without training hard every day. Sessions should take about **45–60 minutes**.

**Day 1 — Upper Body Push**
- Dumbbell bench press — 3 × 8–12
- Incline dumbbell press — 3 × 8–12
- Seated shoulder press — 3 × 8–12
- Cable or dumbbell lateral raise — 2 × 12–15
- Rope triceps pushdown — 2 × 10–15

**Day 2 — Lower Body A**
- Goblet squat — 3 × 8–12
- Leg press — 3 × 10–12
- Dumbbell Romanian deadlift — 3 × 8–12
- Standing calf raise — 3 × 12–15
- Plank — 3 × 25–45 seconds

**Day 3 — Upper Body Pull**
- Lat pulldown — 3 × 8–12
- Seated cable row — 3 × 8–12
- One-arm dumbbell row — 2 × 10 each side
- Face pull — 2 × 12–15
- Dumbbell curl — 2 × 10–15

**Day 4 — Active Recovery**
- Easy walking or cycling — 25–35 minutes
- Hip, shoulder, and ankle mobility — 10 minutes
- Keep the effort light enough to hold a conversation

**Day 5 — Full Body Strength**
- Smith-machine squat or goblet squat — 3 × 8–10
- Dumbbell bench press — 3 × 8–10
- Assisted pull-up or lat pulldown — 3 × 8–10
- Hip thrust — 3 × 10–12
- Farmer carry — 3 × 30–40 seconds

**Day 6 — Conditioning and Core**
- Treadmill incline walk, cycle, or cross-trainer — 20–25 minutes
- Walking lunges — 2 × 10 each leg
- Dead bug — 3 × 8 each side
- Side plank — 2 × 20–30 seconds each side
- Bird dog — 2 × 8 each side

**Day 7 — Rest and Mobility**
- Complete rest, or an easy 15–20 minute walk
- Gentle full-body stretching — 8–10 minutes
- Prepare meals, hydrate, and aim for 7–9 hours of sleep

**Warm-up before strength days**
- 5 minutes of easy cardio
- One or two light practice sets before the first big exercise

**Rest between sets**
- 60–90 seconds for most exercises
- Up to 2 minutes after squats, presses, rows, and Romanian deadlifts

**How hard should you train?**
Choose a weight that leaves about **2 good repetitions in reserve** at the end of each set. Do not train every set to failure.

**Weekly progression**
When you reach the top of the repetition range with clean form on every set, increase the weight by the smallest available amount. Follow the plan for **6–8 weeks** before changing it.

Stop any movement that causes sharp pain. A trainer can help you learn the exercise technique safely.`
  }

  if (category === 'beginner-workout') {
    return `💪 **3-Day Beginner Gym Plan**\n\nTrain on non-consecutive days, such as **Monday, Wednesday, and Friday**. Each session should take about **45–60 minutes**.\n\n**Warm-up — 5 to 8 minutes**\n- Easy treadmill, cycle, or rowing\n- One light practice set before each main exercise\n\n**Day 1 — Full Body A**\n- Goblet squat — 3 × 8–12\n- Dumbbell bench press — 3 × 8–12\n- Lat pulldown — 3 × 8–12\n- Dumbbell Romanian deadlift — 2 × 10\n- Plank — 3 × 20–40 seconds\n\n**Day 2 — Full Body B**\n- Leg press — 3 × 10–12\n- Seated cable row — 3 × 8–12\n- Dumbbell shoulder press — 3 × 8–12\n- Walking lunges — 2 × 8 each leg\n- Dead bug — 3 × 8 each side\n\n**Day 3 — Full Body C**\n- Smith-machine squat or goblet squat — 3 × 8–12\n- Incline dumbbell press — 3 × 8–12\n- Assisted pull-up or lat pulldown — 3 × 8–12\n- Hip thrust — 3 × 10–12\n- Cable curl — 2 × 10–15\n- Rope triceps pushdown — 2 × 10–15\n\n**Rest and effort**\n- Rest 60–90 seconds between most sets and up to 2 minutes after leg exercises.\n- Finish each set with about **2 good reps left in reserve**. Technique matters more than heavy weight.\n\n**Progress each week**\nWhen you can complete the top of the rep range with clean form on every set, increase the weight by the smallest available amount.\n\n**Beginner rule**\nFollow this plan for **6–8 weeks**. Stop any exercise that causes sharp pain and ask a qualified trainer to check your form.`
  }

  const profile = extractFitnessProfile(
    recentContext
      ? [
          { id: 'context', role: 'user', text: recentContext, time: '' },
          { id: 'current', role: 'user', text: message, time: '' },
        ]
      : [{ id: 'current', role: 'user', text: message, time: '' }],
  )
  const proteinRange = calculateProteinRange(profile.weightKg)

  if (/protein.*(need|daily|day|target|how much)/.test(text) && !FOOD_KEYWORDS.some(f => text.includes(f))) {
    if (!profile.weightKg) {
      return `💪 To calculate your daily protein target, tell me your **body weight in kilograms**. For muscle or healthy weight gain, a commonly used practical range is around **1.6–2.0 g per kg per day**.`
    }

    return `💪 At **${profile.weightKg} kg**, your estimated daily protein target is approximately **${proteinRange}** for muscle or healthy weight gain. Divide it across 3–5 meals using a mix of dal, dairy, eggs, chicken, fish, paneer, or soy.`
  }

  if (/full.?day|diet plan|meal plan|what should i eat/.test(text) && category === 'muscle-gain') {
    const weightLine = profile.weightKg
      ? `This example is a starting point for **${profile.weightKg} kg**.`
      : 'Share your weight afterward so I can adjust the quantities.'

    return `🥗 **Simple Indian weight-gain day**\n\n${weightLine}\n\n**Breakfast**\n- Oats or poha/upma\n- 2–4 eggs, or paneer/soy\n- 1 banana and milk\n\n**Lunch**\n- Rice or 3–4 rotis\n- Dal\n- 150 g cooked chicken, or paneer/soy\n- Vegetables and curd\n\n**Snack**\n- Banana shake, peanut chikki, roasted chana, or a peanut-butter sandwich\n\n**Dinner**\n- Rice or rotis\n- Dal plus eggs/chicken/paneer/soy\n- Vegetables\n\nIncrease portions gradually so your weekly average weight rises slowly.`
  }

  if (category === 'muscle-gain') {
    const personalization = profile.weightKg
      ? `\n- At **${profile.weightKg} kg**, an estimated protein target is **${proteinRange} daily**.`
      : '\n- Tell me your body weight so I can calculate your protein target.'

    return `🥗 **Simple muscle-gain approach**\n- Eat about 200–300 calories above maintenance.\n- Protein: roughly 1.6–2.0 g per kg of body weight daily.${personalization}\n- Build meals around rice/roti/oats, dal/eggs/chicken/paneer, vegetables, fruit, and curd.\n- Aim for slow, steady weight gain rather than forcing food.\n- Strength train consistently and progressively add reps or weight.`
  }

  if (category === 'fat-loss') {
    return `🔥 **Practical fat-loss basics**\n- Use a moderate calorie deficit, not a crash diet.\n- Include protein and vegetables in each main meal.\n- Strength train 3–4 times weekly.\n- Walk 7,000–10,000 steps most days.\n- Sleep 7–9 hours.\n- Track your weekly average weight; adjust food only when progress stalls for 2–3 weeks.`
  }

  if (category === 'recovery') {
    return `😴 **Recovery checklist**\n- Sleep 7–9 hours.\n- Leave at least 48 hours before training the same muscle hard again.\n- Eat enough protein and carbohydrates.\n- Use light walking or mobility work for soreness.\n- Reduce volume for a week if performance, motivation, and sleep all decline.\n\nSharp or worsening pain is not normal soreness — stop the exercise and get it assessed.`
  }

  if (category === 'supplements') {
    return `💊 **Beginner supplement guide**\n- **Creatine monohydrate:** 3–5 g daily.\n- **Protein powder:** only to help meet your protein target.\n- **Caffeine:** optional; start low and avoid near bedtime.\n- Skip "test boosters," fat burners, and proprietary blends.\n\nCheck with a doctor or pharmacist if you have a medical condition, take medication, are pregnant, or are under 18.`
  }

  if (category === 'exercise-form') {
    return `🏋️ For better form: use a manageable weight, move through a pain-free range, brace your core, and control both the lifting and lowering phases. Record a side-view set or ask a qualified trainer to check you. Stop if you feel sharp pain rather than normal muscular effort.`
  }

  return `🤖 I can help with workout plans, fat loss, muscle gain, exercise form, recovery, real nutrition lookups, and basic supplement guidance. Tell me your goal, experience level, training days per week, available equipment, and any injuries or limitations.`
}

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
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.42,
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.5px',
          boxShadow: '0 0 0 2px rgba(124,58,237,0.25)',
        }}
      >
        B
      </div>
    )
  }

  if (src && src !== 'null' && src !== '') {
    return (
      <img
        src={src}
        alt={name || 'User'}
        loading="lazy"
        referrerPolicy="no-referrer"
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
function TypingDots({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="ai-thinking-row">
      <div className="ai-thinking-dots" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="ai-thinking-label">{label}</span>
    </div>
  )
}

// ─── Bot Card Gallery ──────────────────────────────────────────────────────────
// Renders exercise / nutrition results as a horizontally-scrolling gallery of
// image cards underneath a Buddy AI reply, instead of a text-only bullet list.
function BotCardGallery({ cards }: { cards: BotCard[] }) {
  if (!cards.length) return null

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        padding: '10px 2px 4px',
        marginTop: 2,
      }}
    >
      {cards.map((card, i) => (
        <div
          key={`${card.title}-${i}`}
          style={{
            minWidth: 176,
            maxWidth: 176,
            flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {card.image ? (
            <img
              src={card.image}
              alt={card.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: 104, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 104,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {card.kind === 'gym'
                ? '🏢'
                : card.kind === 'youtube'
                  ? '▶️'
                  : card.kind === 'exercise'
                    ? '🏋️'
                    : '🍽️'}
            </div>
          )}

          <div style={{ padding: '9px 10px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {card.title}
            </div>

            {card.subtitle && (
              <div style={{ fontSize: 10, color: 'rgba(200,210,230,0.5)', marginTop: 2, textTransform: 'capitalize' }}>
                {card.subtitle}
              </div>
            )}

            {card.meta && card.meta.length > 0 && (
              <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {card.meta.map((m, j) => (
                  <span
                    key={j}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: 'rgba(124,58,237,0.14)',
                      color: 'rgba(196,181,253,0.95)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}

            {card.link && (
              <a
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', marginTop: 9, fontSize: 10, fontWeight: 800,
                  color: '#67e8f9', textDecoration: 'none',
                }}
              >
                {card.actionLabel || 'Open'} ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const router = useRouter()

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
  const [chatError, setChatError] = useState('')

  // Buddy AI (AI coach)
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: '0',
      role: 'bot',
      text: `## Welcome to Buddy AI 👋

Your personal fitness assistant inside MeetYourBuddy.

I can help you **build workout plans, discover exercises with visual demos, check food nutrition, watch technique videos, find nearby gyms, improve recovery, and work toward muscle-gain or fat-loss goals.**

Choose a quick action below or ask me anything about fitness.`, 
      time: fmtTime(now()),
    },
  ])
  const [botInput, setBotInput] = useState('')
  const [botTyping, setBotTyping] = useState(false)
  const [botEmoji, setBotEmoji] = useState(false)
  const [buddyAiOnline, setBuddyAiOnline] = useState<boolean | null>(null)
  const [selectedCity, setSelectedCity] = useState('')
  const [gymSearchOpen, setGymSearchOpen] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'ai'>('chat')
  const [botFollowUps, setBotFollowUps] = useState<FollowUpSuggestion[]>(
    INITIAL_BUDDY_SUGGESTIONS,
  )
  const [buddyRuntime, setBuddyRuntime] = useState<{
    provider?: string
    model?: string
    responseTimeMs?: number
  }>({})
  const [chatPanelPercent, setChatPanelPercent] = useState(60)
  const [isResizingPanels, setIsResizingPanels] = useState(false)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const botEndRef = useRef<HTMLDivElement>(null)
  const botTranscriptRef = useRef<HTMLDivElement>(null)
  const signalRRef = useRef<import('@microsoft/signalr').HubConnection | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const botInputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Important scroll refs
  const msgBodyRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Init auth
  const handleUnauthorized = useCallback(() => {
    if (typeof window !== 'undefined') {
      ;['token', 'authToken', 'accessToken'].forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
        document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`
      })
    }

    setToken('')
    setMyId(0)
    setSignalRStatus('error')
    router.replace('/login')
  }, [router])

  useEffect(() => {
    const t = getToken()

    if (!t) {
      handleUnauthorized()
      return
    }

    const userId = getUserIdFromToken(t)

    if (!userId) {
      handleUnauthorized()
      return
    }

    setToken(t)
    setMyId(userId)
    setMyName(getStoredUserName() || getUserNameFromToken(t))
  }, [handleUnauthorized])



  useEffect(() => {
    if (!token) return

    let cancelled = false

    const checkBuddyAi = async () => {
      try {
        if (!BUDDY_AI_API) {
          if (!cancelled) setBuddyAiOnline(false)
          return
        }

        const response = await fetchWithTimeout(
          `${BUDDY_AI_API}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
          STATUS_TIMEOUT_MS,
        )

        if (response.status === 401) {
          handleUnauthorized()
          return
        }

        const data = await readJson(response)

        if (!cancelled) {
          const online = getRecordValue(data, ['online', 'Online'])
          const provider = getRecordValue(data, ['provider', 'Provider'])
          const model = getRecordValue(data, ['model', 'Model'])

          setBuddyAiOnline(
            response.ok && online === true,
          )

          setBuddyRuntime(prev => ({
            ...prev,
            provider:
              typeof provider === 'string'
                ? provider
                : prev.provider,
            model:
              typeof model === 'string'
                ? model
                : prev.model,
          }))
        }
      } catch {
        if (!cancelled) setBuddyAiOnline(false)
      }
    }

    void checkBuddyAi()

    const interval = window.setInterval(
      () => void checkBuddyAi(),
      30_000,
    )

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [token, handleUnauthorized])

  const authHeaders = useMemo<Record<string, string>>(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  // Live-updating goal chip shown in Buddy AI's header, derived from conversation so far.
  const detectedProfile = useMemo(() => extractFitnessProfile(botMessages), [botMessages])

  // Detect whether user is near bottom
  const handleMessageScroll = () => {
    const el = msgBodyRef.current
    if (!el) return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight

    // If user scrolls up, stop forced auto-scroll.
    shouldAutoScrollRef.current = distanceFromBottom < 120
  }

  const startPanelResize = () => {
    setIsResizingPanels(true)
  }

  useEffect(() => {
    if (!isResizingPanels) return

    const handleMouseMove = (event: MouseEvent) => {
      const root = rootRef.current
      if (!root) return

      const rect = root.getBoundingClientRect()
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100
      const clampedPercent = Math.min(76, Math.max(44, nextPercent))

      setChatPanelPercent(clampedPercent)
    }

    const handleMouseUp = () => {
      setIsResizingPanels(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingPanels])

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!token) return

    setChatLoading(true)
    setChatError('')

    try {
      const res = await fetchWithTimeout(
        chatApiUrl('/api/Chat/conversations'),
        {
          headers: authHeaders,
          cache: 'no-store',
        },
      )

      await requireSuccessfulResponse(
        res,
        'Failed to load conversations',
      )

      const result = await readJson(res)
      const arr = extractArray(
        result,
        'conversations',
        'items',
        'data',
      )

      const normalizedConversations: Conversation[] = arr
        .filter(isRecord)
        .map(c => {
          const otherUserName = String(
            c.otherUserName ??
              c.OtherUserName ??
              c.userName ??
              c.UserName ??
              c.name ??
              c.Name ??
              'Buddy',
          ).trim()

          return {
            userId: Number(
              c.otherUserId ??
                c.OtherUserId ??
                c.userId ??
                c.UserId ??
                0,
            ),
            userName: otherUserName || 'Buddy',
            userPhoto:
              String(
                c.otherUserPhoto ??
                  c.OtherUserPhoto ??
                  c.userPhoto ??
                  c.UserPhoto ??
                  c.profileImage ??
                  c.ProfileImage ??
                  '',
              ) || undefined,
            lastMessage:
              String(
                c.lastMessage ??
                  c.LastMessage ??
                  c.lastMessageText ??
                  c.LastMessageText ??
                  '',
              ) || undefined,
            lastMessageDate:
              String(
                c.lastMessageTime ??
                  c.LastMessageTime ??
                  c.lastMessageDate ??
                  c.LastMessageDate ??
                  c.createdDate ??
                  c.CreatedDate ??
                  '',
              ) || undefined,
            unreadCount: Number(
              c.unreadCount ??
                c.UnreadCount ??
                0,
            ),
          } satisfies Conversation
        })
        .filter(c => c.userId > 0)

      setConversations(normalizedConversations)

      // Preserve the selected buddy across browser refreshes. If there is no
      // saved selection yet, automatically open the first available buddy so
      // history and the message composer are visible immediately.
      setActiveConvo(current => {
        const currentMatch = current
          ? normalizedConversations.find(
              item => item.userId === current.userId,
            )
          : undefined

        if (currentMatch) {
          return currentMatch
        }

        let savedUserId = 0

        try {
          savedUserId = Number(
            window.localStorage.getItem(
              ACTIVE_CHAT_STORAGE_KEY,
            ) ?? 0,
          )
        } catch {
          savedUserId = 0
        }

        const restored =
          normalizedConversations.find(
            item => item.userId === savedUserId,
          ) ??
          normalizedConversations[0] ??
          null

        if (restored) {
          try {
            window.localStorage.setItem(
              ACTIVE_CHAT_STORAGE_KEY,
              String(restored.userId),
            )
          } catch {
            // Storage may be unavailable in restrictive browser modes.
          }
        }

        return restored
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized()
        return
      }

      console.error('Conversations error:', error)
      setChatError(
        error instanceof Error
          ? error.message
          : 'Unable to load conversations.',
      )
    } finally {
      setChatLoading(false)
    }
  }, [token, authHeaders, handleUnauthorized])

  useEffect(() => {
    if (token) void loadConversations()
  }, [token, loadConversations])

  useEffect(() => {
    if (!activeConvo?.userId) return

    try {
      window.localStorage.setItem(
        ACTIVE_CHAT_STORAGE_KEY,
        String(activeConvo.userId),
      )
    } catch {
      // Ignore storage failures.
    }
  }, [activeConvo?.userId])

  // Load chat history
  const loadHistory = useCallback(
    async (otherUserId: number, silent = false) => {
      if (!token || otherUserId <= 0) return

      const el = msgBodyRef.current
      const oldScrollHeight = el?.scrollHeight ?? 0
      const oldScrollTop = el?.scrollTop ?? 0
      const wasNearBottom = shouldAutoScrollRef.current

      if (!silent) {
        setMsgLoading(true)
        setMessages([])
        setChatError('')
        shouldAutoScrollRef.current = true
      }

      try {
        const res = await fetchWithTimeout(
          chatApiUrl(`/api/Chat/history/${otherUserId}`),
          {
            headers: authHeaders,
            cache: 'no-store',
          },
        )

        await requireSuccessfulResponse(
          res,
          'Failed to load chat history',
        )

        const result = await readJson(res)
        const arr = extractArray(
          result,
          'messages',
          'items',
          'history',
        )

        const resolvedMyId =
          myId || getUserIdFromToken(token)

        const mappedMessages: Message[] = arr
          .filter(isRecord)
          .map(m => {
            const sid = Number(
              m.senderId ?? m.SenderId ?? 0,
            )
            const rawReceiverId = Number(
              m.receiverId ?? m.ReceiverId ?? 0,
            )

            // GetChatHistory currently returns Message objects that may not
            // include ReceiverId. Infer it from the two chat participants so
            // persisted messages are not incorrectly discarded.
            const rid =
              rawReceiverId > 0
                ? rawReceiverId
                : sid === resolvedMyId
                  ? otherUserId
                  : resolvedMyId

            const createdDate = String(
              m.createdDate ??
                m.CreatedDate ??
                m.sentAt ??
                m.SentAt ??
                now(),
            )

            return {
              id: String(
                m.id ??
                  m.Id ??
                  m.messageId ??
                  m.MessageId ??
                  `${sid}-${rid}-${createdDate}`,
              ),
              senderId: sid,
              receiverId: rid,
              message: String(
                m.messageText ??
                  m.MessageText ??
                  m.message ??
                  m.Message ??
                  m.content ??
                  m.Content ??
                  m.text ??
                  m.Text ??
                  '',
              ),
              createdDate,
              isMine: sid === resolvedMyId,
            }
          })
          .filter(
            message =>
              message.senderId > 0 &&
              message.receiverId > 0 &&
              Boolean(message.message.trim()),
          )

        setMessages(prev => {
          if (
            messagesKey(prev) ===
            messagesKey(mappedMessages)
          ) {
            return prev
          }

          return mappedMessages
        })

        if (silent && el && !wasNearBottom) {
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight
            const diff =
              newScrollHeight - oldScrollHeight
            el.scrollTop = oldScrollTop + diff
          })
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          handleUnauthorized()
          return
        }

        console.error('History error:', error)

        if (!silent) {
          setChatError(
            error instanceof Error
              ? error.message
              : 'Unable to load chat history.',
          )
        }
      } finally {
        if (!silent) setMsgLoading(false)
      }
    },
    [
      token,
      authHeaders,
      myId,
      handleUnauthorized,
    ],
  )

  // Poll as a fallback. When SignalR is healthy, poll less often.
  useEffect(() => {
    const activeUserId = activeConvo?.userId
    if (!activeUserId) return

    shouldAutoScrollRef.current = true
    void loadHistory(activeUserId)

    const pollMs =
      signalRStatus === 'connected'
        ? 15_000
        : 3_000

    const interval = window.setInterval(() => {
      void loadHistory(activeUserId, true)
    }, pollMs)

    return () => window.clearInterval(interval)
  }, [
    activeConvo?.userId,
    loadHistory,
    signalRStatus,
  ])

  // SignalR
  useEffect(() => {
    if (!token) return

    let connection: any = null

    const initSignalR = async () => {
      try {
        const signalR = await import('@microsoft/signalr')

        if (!SIGNALR_HUB) {
          setSignalRStatus('error')
          return
        }

        connection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB, {
            accessTokenFactory: () => token,
          })
          .withAutomaticReconnect([
            0,
            2_000,
            5_000,
            10_000,
            30_000,
          ])
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
              ? senderIdOrObj.sentAt ??
                senderIdOrObj.SentAt ??
                senderIdOrObj.createdDate ??
                senderIdOrObj.CreatedDate ??
                now()
              : createdDateArg ?? now()

            if (!sid || !rid || !msgText) return

            const resolvedMyId = myId || getUserIdFromToken(token)
            const activeUserId = activeConvo?.userId

            const incoming: Message = {
              id: String(
                isObjectPayload
                  ? senderIdOrObj.messageId ??
                    senderIdOrObj.MessageId ??
                    senderIdOrObj.id ??
                    senderIdOrObj.Id ??
                    Date.now()
                  : Date.now(),
              ),
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
              shouldAutoScrollRef.current = true

              setMessages(prev => {
                const exists = prev.some(
                  x => x.id === incoming.id,
                )
                if (exists) return prev

                if (incoming.isMine) {
                  const optimisticIndex =
                    prev.findIndex(
                      item =>
                        item.id.startsWith('opt-') &&
                        item.receiverId ===
                          incoming.receiverId &&
                        item.message ===
                          incoming.message,
                    )

                  if (optimisticIndex >= 0) {
                    const next = [...prev]
                    next[optimisticIndex] = incoming
                    return next
                  }
                }

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

        connection.onreconnecting(() => {
          setSignalRStatus('connecting')
        })

        connection.onreconnected(() => {
          setSignalRStatus('connected')
          void loadConversations()

          if (activeConvo?.userId) {
            void loadHistory(
              activeConvo.userId,
              true,
            )
          }
        })

        connection.onclose(() => {
          signalRRef.current = null
          setSignalRStatus('error')
        })

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
      if (signalRRef.current === connection) {
        signalRRef.current = null
      }

      void connection?.stop()
    }
  }, [token, myId, activeConvo?.userId, loadConversations, loadHistory])

  // Send real message. Prefer SignalR so both users receive it
  // immediately; use the REST endpoint as a resilient fallback.
  const sendMessage = async () => {
    if (
      !chatInput.trim() ||
      !activeConvo ||
      sendingMsg
    ) {
      return
    }

    const text = chatInput.trim()
    const receiverId = activeConvo.userId

    setChatInput('')
    setSendingMsg(true)
    setChatError('')
    shouldAutoScrollRef.current = true

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderId: myId,
      receiverId,
      message: text,
      createdDate: now(),
      isMine: true,
    }

    setMessages(prev => [...prev, optimistic])

    setConversations(prev =>
      prev.map(c =>
        c.userId === receiverId
          ? {
              ...c,
              lastMessage: text,
              lastMessageDate:
                optimistic.createdDate,
            }
          : c,
      ),
    )

    try {
      const hub = signalRRef.current

      if (
        hub &&
        signalRStatus === 'connected'
      ) {
        try {
          await hub.invoke(
            'SendMessage',
            receiverId,
            text,
          )
          return
        } catch (hubError) {
          console.warn(
            'SignalR send failed; using REST fallback:',
            hubError,
          )
        }
      }

      const res = await fetchWithTimeout(
        chatApiUrl('/api/Chat/send'),
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            receiverId,
            message: text,
          }),
        },
      )

      await requireSuccessfulResponse(
        res,
        'Failed to send message',
      )

      const result = await readJson(res)
      const serverId =
        typeof result === 'number'
          ? result
          : Number(
              getRecordValue(result, [
                'id',
                'Id',
                'messageId',
                'MessageId',
              ]) ?? 0,
            )

      if (serverId > 0) {
        setMessages(prev =>
          prev.map(message =>
            message.id === optimistic.id
              ? {
                  ...message,
                  id: String(serverId),
                }
              : message,
          ),
        )
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        handleUnauthorized()
        return
      }

      console.error('Send message error:', error)

      setMessages(prev =>
        prev.filter(
          message =>
            message.id !== optimistic.id,
        ),
      )

      setChatInput(text)
      setChatError(
        error instanceof Error
          ? error.message
          : 'Message could not be sent.',
      )
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
  }, [botMessages, botTyping])

  const copyBuddyChat = async () => {
    const plainText = buildPlainChat(botMessages)

    try {
      await navigator.clipboard.writeText(plainText)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = plainText
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }

    setCopyStatus('Copied')
    window.setTimeout(() => setCopyStatus(''), 1800)
  }

  const exportBuddyChat = async (format: 'png' | 'pdf' | 'share') => {
    const element = botTranscriptRef.current
    if (!element || shareBusy) return
    setShareBusy(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(element, {
        backgroundColor: '#0b1020',
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: clonedDocument => {
          const clonedElement = clonedDocument.querySelector('.bot-messages') as HTMLElement | null
          if (clonedElement) {
            clonedElement.style.height = 'auto'
            clonedElement.style.maxHeight = 'none'
            clonedElement.style.overflow = 'visible'
          }
        },
      })
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed')), 'image/png', 0.95),
      )
      const pngFile = new File([blob], `buddy-ai-chat-${Date.now()}.png`, { type: 'image/png' })

      if (format === 'share' && navigator.share && (!navigator.canShare || navigator.canShare({ files: [pngFile] }))) {
        await navigator.share({ title: 'Buddy AI fitness chat', text: 'My Buddy AI fitness chat', files: [pngFile] })
        return
      }

      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const image = canvas.toDataURL('image/jpeg', 0.92)
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const imageHeight = canvas.height * pageWidth / canvas.width
        let remaining = imageHeight
        let offset = 0
        pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight)
        remaining -= pageHeight
        while (remaining > 0) {
          offset = remaining - imageHeight
          pdf.addPage()
          pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight)
          remaining -= pageHeight
        }
        pdf.save(`buddy-ai-chat-${Date.now()}.pdf`)
        return
      }

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = pngFile.name
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Buddy AI export failed:', error)
    } finally {
      setShareBusy(false)
    }
  }

  // Buddy AI router:
  // Specialized lookups never call Ollama unnecessarily.
  // - gym      -> Google Places only
  // - youtube  -> YouTube only
  // - exercise -> ExerciseDB only
  // - food     -> Open Food Facts only
  // - coaching/plans/general fitness -> Buddy AI / Ollama
  const sendBotMessage = async (text?: string, forcedCategory?: string) => {
    const input = (text ?? botInput).trim()

    if (!input || botTyping) return

    setBotInput('')
    setBotEmoji(false)
    setBotFollowUps([])
    setBuddyRuntime(prev => ({ ...prev, responseTimeMs: undefined }))

    const userMsg: BotMessage = {
      id: String(Date.now()),
      role: 'user',
      text: input,
      time: fmtTime(now()),
    }

    setBotMessages(prev => [...prev, userMsg])
    setBotTyping(true)

    const conversationWithCurrentMessage = [...botMessages, userMsg]
    const recentContext = getRecentFitnessContext(botMessages)
    const category = resolveFitnessCategory(input, forcedCategory, recentContext)
    const profile = extractFitnessProfile(conversationWithCurrentMessage)
    const requestedCity = extractCity(input) || selectedCity
    let streamedMessageId: string | null = null

    try {
      let replyText = ''
      let cards: BotCard[] = []
      let serverSuggestions: FollowUpSuggestion[] = []
      let aiMeta: Pick<AiServerReply, 'category' | 'provider' | 'model' | 'responseTimeMs'> = {}

      // ================================================================
      // 1. GYM SEARCH -> GOOGLE PLACES ONLY
      // ================================================================
      if (shouldSearchGyms(input)) {
        if (!requestedCity) {
          setGymSearchOpen(true)
          replyText = '📍 **Where should I search?**\n\nChoose a city below and I’ll show nearby gyms with ratings, map links, opening status, and estimated monthly fee ranges.'
          serverSuggestions = []
          aiMeta = { category: 'gym-search', provider: 'google-places' }
        } else {
          setSelectedCity(requestedCity)
          const startedAt = performance.now()
          const gyms = await fetchGymsByCity(requestedCity, token)
          const elapsed = Math.round(performance.now() - startedAt)

          cards = buildGymCards(gyms)
          replyText = gyms.length
            ? `🏢 **Gyms in ${requestedCity}**\n\nI found ${gyms.length} options. Compare ratings, location and opening status in the cards below. Fee ranges are estimates, so confirm the final membership price directly with the gym.`
            : `I couldn't find gym listings for **${requestedCity}**. Try a nearby major city or a more specific area.`

          serverSuggestions = [
            { label: '🏢 Search another city', prompt: 'Find gyms in Pune.', category: 'gym-search' },
            { label: '💪 Build a gym plan', prompt: 'Create a 3-day beginner gym workout plan.', category: 'beginner-workout' },
          ]

          aiMeta = {
            category: 'gym-search',
            provider: 'google-places',
            responseTimeMs: elapsed,
          }
        }
      }

      // ================================================================
      // 2. YOUTUBE -> YOUTUBE ONLY (NO /chat, NO OLLAMA)
      // ================================================================
      else if (shouldSearchYouTube(input) || forcedCategory === 'youtube') {
        const startedAt = performance.now()
        const videos = await fetchYouTubeVideos(
          `${input} beginner proper form technique`,
          token,
        ).catch(error => {
          console.warn('YouTube search unavailable:', error)
          return [] as YouTubeVideo[]
        })
        const elapsed = Math.round(performance.now() - startedAt)

        cards = buildYouTubeCards(videos)
        replyText = videos.length
          ? `▶️ **Technique videos**\n\nI found ${videos.length} YouTube demonstrations for **${input}**. Use a light load while learning the movement and stop if anything feels sharp or painful.`
          : `I couldn't find YouTube videos for **${input}** right now. Try a shorter movement name such as **squat form**, **bench press technique**, or **deadlift tutorial**.`

        serverSuggestions = [
          { label: '🎥 Squat form', prompt: 'Show beginner squat form videos.', category: 'youtube' },
          { label: '🎥 Bench press form', prompt: 'Show beginner bench press technique videos.', category: 'youtube' },
          { label: '🏋️ Browse exercises', prompt: 'Show me beginner chest exercises.', category: 'workout' },
        ]

        aiMeta = {
          category: 'youtube',
          provider: 'youtube',
          responseTimeMs: elapsed,
        }
      }

      // ================================================================
      // 3. EXERCISE LOOKUP -> EXERCISEDB ONLY
      // ================================================================
      else if (shouldQueryExerciseDb(input, category)) {
        const startedAt = performance.now()
        const exercises = await fetchExerciseDbExercises(input).catch(error => {
          console.warn('ExerciseDB unavailable:', error)
          return [] as ExerciseDbExercise[]
        })
        const elapsed = Math.round(performance.now() - startedAt)

        cards = buildExerciseCards(exercises)
        replyText = exercises.length
          ? formatExerciseReplyText(exercises, input)
          : `I couldn't find a clean ExerciseDB match for **${input}**. Try a body part or movement such as **chest**, **back**, **shoulders**, **squat**, **curl**, or **push-up**.`

        serverSuggestions = [
          { label: '🎥 Watch technique', prompt: `Show technique videos for ${getExerciseSearchTerm(input) || 'this exercise'}.`, category: 'youtube' },
          { label: '🏋️ More exercises', prompt: 'Show me beginner-friendly back exercises.', category: 'workout' },
          { label: '💪 Build a routine', prompt: 'Create a 3-day beginner workout plan.', category: 'beginner-workout' },
        ]

        aiMeta = {
          category: category === 'exercise-form' ? 'exercise-form' : 'workout',
          provider: 'exercise-db',
          responseTimeMs: elapsed,
        }
      }

      // ================================================================
      // 4. FOOD DATA -> OPEN FOOD FACTS ONLY
      // ================================================================
      else if (shouldQueryOpenFoodFacts(input, category)) {
        const startedAt = performance.now()
        const products = await fetchOpenFoodFactsProducts(input).catch(error => {
          console.warn('Open Food Facts unavailable:', error)
          return [] as OffProduct[]
        })
        const elapsed = Math.round(performance.now() - startedAt)

        cards = buildFoodCards(products)
        replyText = products.length
          ? formatFoodReplyText(products, input)
          : `I couldn't find reliable product nutrition for **${input}**. Try a simpler food or packaged-product name.`

        serverSuggestions = [
          { label: '🥗 Build a meal plan', prompt: 'Create a simple full-day diet plan for my goal.', category: 'nutrition' },
          { label: '💪 Protein target', prompt: 'Calculate my daily protein target.', category: 'nutrition' },
        ]

        aiMeta = {
          category: 'nutrition',
          provider: 'open-food-facts',
          responseTimeMs: elapsed,
        }
      }

      // ================================================================
      // 5. COACHING / PLANS / GENERAL FITNESS -> OLLAMA
      // ================================================================
      else {
        streamedMessageId = `buddy-stream-${Date.now()}`

        setBuddyRuntime({
          provider: 'ollama',
          model: undefined,
          responseTimeMs: undefined,
        })

        // Keep the thinking indicator visible long enough to be perceived.
        // Fast first tokens are buffered, then the UI transitions from
        // "Buddy AI is thinking" directly into the streamed answer.
        const MIN_THINKING_VISIBLE_MS = 650
        const thinkingStartedAt = performance.now()

        let streamMessageCreated = false
        let latestStreamText = ''
        let revealTimer: number | null = null

        const revealStreamMessage = () => {
          const textToShow = latestStreamText
          if (!textToShow.trim()) return

          setBotTyping(false)

          if (!streamMessageCreated) {
            streamMessageCreated = true

            setBotMessages(prev => [
              ...prev,
              {
                id: streamedMessageId!,
                role: 'bot',
                text: textToShow,
                time: fmtTime(now()),
                category,
                provider: 'ollama',
              },
            ])

            return
          }

          setBotMessages(prev =>
            prev.map(message =>
              message.id === streamedMessageId
                ? { ...message, text: textToShow }
                : message,
            ),
          )
        }

        const ai = await fetchBuddyAiReply(
          input,
          botMessages,
          profile,
          token,
          partial => {
            if (!partial.trim()) return

            latestStreamText = partial

            // Once the response bubble exists, update it immediately.
            if (streamMessageCreated) {
              revealStreamMessage()
              return
            }

            // Schedule exactly one transition from thinking -> answer.
            if (revealTimer !== null) return

            const elapsed = performance.now() - thinkingStartedAt
            const remaining = Math.max(0, MIN_THINKING_VISIBLE_MS - elapsed)

            if (remaining === 0) {
              revealStreamMessage()
              return
            }

            revealTimer = window.setTimeout(() => {
              revealTimer = null
              revealStreamMessage()
            }, remaining)
          },
        )

        // The request may finish before the minimum thinking duration.
        // In that case, wait only for the remaining few milliseconds so the
        // loader does not flash/disappear instantly.
        if (revealTimer !== null) {
          window.clearTimeout(revealTimer)
          revealTimer = null
        }

        if (!streamMessageCreated) {
          latestStreamText = ai.reply || latestStreamText

          const elapsed = performance.now() - thinkingStartedAt
          const remaining = Math.max(0, MIN_THINKING_VISIBLE_MS - elapsed)

          if (remaining > 0) {
            await new Promise<void>(resolve => {
              window.setTimeout(resolve, remaining)
            })
          }

          revealStreamMessage()
        }

        replyText = ai.reply || getOfflineFitnessReply(input, category, recentContext)
        serverSuggestions = ai.suggestions ?? []
        aiMeta = {
          category: ai.category ?? category,
          provider: ai.provider ?? 'ollama',
          model: ai.model,
          responseTimeMs: ai.responseTimeMs,
        }
      }

      // Avoid a second Ollama round-trip. If a long workout plan is incomplete,
      // use the deterministic local planner immediately instead of making users wait
      // for another full model generation.
      const requestedDays = getRequestedWorkoutDays(input)
      const cameFromOllama = aiMeta.provider === 'ollama'

      if (
        cameFromOllama &&
        isWorkoutPlanRequest(input, category) &&
        !isCompleteWorkoutPlanReply(replyText, requestedDays)
      ) {
        replyText = getOfflineFitnessReply(input, category, recentContext)
      }

      if (aiMeta.provider || aiMeta.model || aiMeta.responseTimeMs) {
        setBuddyRuntime({
          provider: aiMeta.provider,
          model: aiMeta.model,
          responseTimeMs: aiMeta.responseTimeMs,
        })
      }

      setBotMessages(prev => {
        const finalMessage: BotMessage = {
          id: streamedMessageId ?? String(Date.now() + 1),
          role: 'bot',
          text: replyText,
          time: fmtTime(now()),
          cards,
          category: aiMeta.category ?? category,
          provider: aiMeta.provider,
          model: aiMeta.model,
          responseTimeMs: aiMeta.responseTimeMs,
        }

        if (streamedMessageId) {
          const exists = prev.some(message => message.id === streamedMessageId)

          if (exists) {
            return prev.map(message =>
              message.id === streamedMessageId ? finalMessage : message,
            )
          }

          // If Ollama completed without producing a visible delta,
          // append the final response now.
          return [...prev, finalMessage]
        }

        return [...prev, finalMessage]
      })

      setBotFollowUps(serverSuggestions)
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        handleUnauthorized()
        return
      }

      console.warn('Buddy AI request failed:', error)

      const fallback = getOfflineFitnessReply(input, category, recentContext)
      const isLiveLookup =
        shouldSearchGyms(input) ||
        shouldSearchYouTube(input) ||
        shouldQueryExerciseDb(input, category) ||
        shouldQueryOpenFoodFacts(input, category)

      setBotMessages(prev => {
        const errorMessage: BotMessage = {
          id: streamedMessageId ?? String(Date.now() + 1),
          role: 'bot',
          text: isLiveLookup
            ? `⚠️ I couldn't reach the live lookup service for that request. Please try again in a moment.`
            : fallback,
          time: fmtTime(now()),
          category,
          provider: isLiveLookup ? 'live-service' : 'offline',
        }

        if (streamedMessageId) {
          const exists = prev.some(message => message.id === streamedMessageId)

          if (exists) {
            return prev.map(message =>
              message.id === streamedMessageId ? errorMessage : message,
            )
          }

          return [...prev, errorMessage]
        }

        return [...prev, errorMessage]
      })

      setBotFollowUps([])
    } finally {
      setBotTyping(false)
    }
  }

  function renderInlineMarkdown(text: string) {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>
      }

      return <span key={index}>{part}</span>
    })
  }

  function renderBotText(text: string) {
    const lines = text.split('\n')
    const nodes: any[] = []
    let listItems: string[] = []

    const flushList = () => {
      if (!listItems.length) return

      nodes.push(
        <ul key={`list-${nodes.length}`} className="ai-list">
          {listItems.map((item, index) => (
            <li key={index}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      )

      listItems = []
    }

    lines.forEach((rawLine, index) => {
      const line = rawLine.trimEnd()
      const trimmed = line.trim()

      if (/^[-•*]\s+/.test(trimmed)) {
        listItems.push(trimmed.replace(/^[-•*]\s+/, ''))
        return
      }

      flushList()

      if (!trimmed) {
        nodes.push(<div key={`space-${index}`} className="ai-space" />)
        return
      }

      const h3 = trimmed.match(/^###\s+(.+)/)
      const h2 = trimmed.match(/^##\s+(.+)/)

      if (h2) {
        nodes.push(
          <h3 key={index} className="ai-heading">
            {renderInlineMarkdown(h2[1])}
          </h3>,
        )
        return
      }

      if (h3) {
        nodes.push(
          <h4 key={index} className="ai-subheading">
            {renderInlineMarkdown(h3[1])}
          </h4>,
        )
        return
      }

      const boldHeading = trimmed.match(/^\*\*(.+)\*\*$/)
      if (boldHeading) {
        nodes.push(
          <h4 key={index} className="ai-subheading">
            {boldHeading[1]}
          </h4>,
        )
        return
      }

      nodes.push(
        <div key={index} className="ai-paragraph">
          {renderInlineMarkdown(trimmed)}
        </div>,
      )
    })

    flushList()

    return nodes
  }

  const startNewBuddyChat = () => {
    if (botTyping) return

    setBotMessages([
      {
        id: '0',
        role: 'bot',
        text: `## Welcome to Buddy AI 👋

Your personal fitness assistant inside MeetYourBuddy.

I can help you **build workout plans, discover exercises with visual demos, check food nutrition, watch technique videos, find nearby gyms, improve recovery, and work toward muscle-gain or fat-loss goals.**

Choose a quick action below or ask me anything about fitness.`,
        time: fmtTime(now()),
      },
    ])

    setBotInput('')
    setBotEmoji(false)
    setBotTyping(false)
    setGymSearchOpen(false)
    setBotFollowUps(INITIAL_BUDDY_SUGGESTIONS)
    setBuddyRuntime({})

    window.setTimeout(() => {
      botInputRef.current?.focus()
      botEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }, 50)
  }

  const isBuddyWelcome =
    botMessages.length === 1 &&
    botMessages[0]?.id === '0'

  const canStartNewBuddyChat =
    !isBuddyWelcome &&
    botMessages.some(
      message =>
        message.id !== '0' &&
        message.role === 'bot' &&
        Boolean(message.text.trim()),
    )

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
          grid-template-columns: var(--chat-panel-width, 60%) 8px minmax(380px, 1fr);
          grid-template-areas: 'chat divider bot';
          height: 100dvh;
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

        .panel-resizer {
          grid-area: divider;
          width: 8px;
          cursor: col-resize;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
          position: relative;
          z-index: 8;
          transition: background 0.2s ease;
        }

        .panel-resizer::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 3px;
          height: 64px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
        }

        .panel-resizer:hover,
        .panel-resizer.active {
          background: rgba(124,58,237,0.16);
        }

        .bot-panel {
          grid-area: bot;
          display: flex;
          flex-direction: column;
          background: linear-gradient(160deg, #10121f 0%, #090c18 100%);
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
          background: radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%);
          pointer-events: none;
        }

        .bot-panel::after {
          content: '';
          position: absolute;
          bottom: -140px;
          right: -100px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
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
          min-width: 0;
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
          color: rgba(167,139,250,0.75);
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

        .bot-goal-chip {
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(6,182,212,0.1);
          border: 1px solid rgba(6,182,212,0.25);
          font-size: 11px;
          font-weight: 700;
          color: rgba(103,232,249,0.9);
          white-space: nowrap;
          text-transform: capitalize;
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
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          border-bottom-right-radius: 4px;
          color: #fff;
          box-shadow: 0 4px 16px rgba(124,58,237,0.28);
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
          background: rgba(124,58,237,0.09);
          border: 1px solid rgba(124,58,237,0.22);
          color: rgba(196,181,253,0.9);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .bot-chip:hover {
          background: rgba(124,58,237,0.18);
          border-color: rgba(124,58,237,0.42);
          transform: translateY(-1px);
        }

        .bot-chip,
        .icon-btn,
        .bot-send-btn,
        .chat-send-btn,
        .convo-item {
          transition: transform .18s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
        }

        .bot-header {
          box-shadow: 0 10px 32px rgba(0,0,0,.16);
        }

        .bot-bubble.bot-side {
          backdrop-filter: blur(14px);
          box-shadow: 0 10px 30px rgba(0,0,0,.12);
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
          border-color: rgba(124,58,237,0.45);
        }

        .bot-input::placeholder {
          color: rgba(200,210,230,0.28);
        }

        .bot-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(124,58,237,0.35);
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
          grid-area: chat;
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
          min-height: 0;
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
          flex: 1 1 auto;
          min-height: 0;
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
          min-height: 70px;
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

        /* Modern visual polish */
        .chat-root {
          background:
            radial-gradient(circle at 77% 8%, rgba(99,102,241,0.09), transparent 25%),
            radial-gradient(circle at 8% 0%, rgba(124,58,237,0.08), transparent 20%),
            #090d19;
        }

        .bot-panel, .chat-panel, .convo-list, .msg-area { min-width: 0; }

        .convo-item { margin: 4px 8px; border-radius: 14px; }

        .msg-header {
          background: rgba(11, 16, 32, 0.72);
          backdrop-filter: blur(18px);
        }

        .msg-body {
          background:
            radial-gradient(circle at 78% 10%, rgba(99,102,241,0.08), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.012), transparent 26%);
        }

        .chat-input-bar {
          background: rgba(10, 14, 28, 0.85);
          backdrop-filter: blur(18px);
        }

        /* 2026 Buddy AI visual refresh */
        .bot-panel {
          position: relative;
          background:
            radial-gradient(circle at 14% -4%, rgba(139,92,246,.25), transparent 34%),
            radial-gradient(circle at 102% 18%, rgba(34,211,238,.13), transparent 30%),
            linear-gradient(180deg, #0b1020 0%, #070b15 100%);
          border-left: 1px solid rgba(255,255,255,.07);
        }

        .bot-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.45), transparent 55%);
        }

        .bot-header {
          min-height: 82px;
          padding: 16px 20px;
          background: rgba(10,15,29,.72);
          border-bottom-color: rgba(255,255,255,.08);
        }

        .bot-header-name {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          letter-spacing: -.02em;
        }

        .bot-header-sub { color: rgba(203,213,225,.62); }

        .bot-goal-chip {
          background: linear-gradient(135deg, rgba(34,211,238,.12), rgba(139,92,246,.14));
          border-color: rgba(103,232,249,.22);
        }

        .bot-messages {
          padding: 22px 20px 18px;
          gap: 20px;
          scroll-padding-bottom: 20px;
        }

        .bot-msg-row > div { min-width: 0; max-width: min(92%, 720px); }

        .bot-bubble {
          max-width: 100%;
          padding: 13px 16px;
          border-radius: 20px;
          font-size: 14px;
          line-height: 1.7;
        }

        .bot-bubble.bot-side {
          background: linear-gradient(145deg, rgba(255,255,255,.082), rgba(255,255,255,.032));
          border-color: rgba(255,255,255,.11);
          box-shadow: 0 14px 36px rgba(0,0,0,.20), inset 0 1px rgba(255,255,255,.035);
          backdrop-filter: blur(18px);
        }

        .bot-message-author {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(226,232,240,.9);
        }

        .message-category, .runtime-pill {
          border: 1px solid rgba(148,163,184,.13);
          background: rgba(255,255,255,.035);
          backdrop-filter: blur(10px);
        }

        .bot-bubble.user-side {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 48%, #0891b2 100%);
          box-shadow: 0 12px 30px rgba(99,102,241,.24);
        }

        .bot-suggestions {
          position: relative;
          padding: 32px 18px 12px;
          gap: 8px;
          background: linear-gradient(180deg, transparent, rgba(8,12,24,.72));
          border-top: 0;
        }

        .bot-suggestions::before {
          content: 'Suggested next steps';
          position: absolute;
          top: 10px;
          left: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .11em;
          text-transform: uppercase;
          color: rgba(148,163,184,.62);
        }

        .bot-chip {
          padding: 9px 13px;
          border-radius: 12px;
          background: rgba(255,255,255,.045);
          border-color: rgba(255,255,255,.09);
          color: rgba(226,232,240,.88);
          font-size: 11px;
          box-shadow: inset 0 1px rgba(255,255,255,.025);
        }

        .bot-chip:hover {
          background: rgba(139,92,246,.14);
          border-color: rgba(167,139,250,.34);
          color: #fff;
        }

        .bot-input-row {
          margin: 0 14px 14px;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          background: rgba(15,23,42,.78);
          box-shadow: 0 16px 40px rgba(0,0,0,.28);
          backdrop-filter: blur(20px);
        }

        .bot-input {
          min-width: 0;
          padding: 12px 8px;
          background: transparent;
          border: 0;
          border-radius: 10px;
        }

        .bot-input:focus { border-color: transparent; }
        .bot-input-row .icon-btn { border: 0; background: transparent; }
        .bot-send-btn { border-radius: 12px; }

        .convo-list {
          background: rgba(8,12,23,.88);
        }

        .convo-list-header, .msg-header {
          min-height: 74px;
        }

        .convo-item.active {
          background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(139,92,246,.08));
          border: 1px solid rgba(129,140,248,.12);
        }

        .msg-bubble.mine {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
        }


        /* Professional chat refinement */
        .bot-header {
          gap: 12px;
          padding: 14px 18px;
        }

        .bot-header-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 750;
        }

        .ai-beta-badge {
          padding: 3px 7px;
          border-radius: 999px;
          border: 1px solid rgba(129,140,248,.2);
          background: rgba(99,102,241,.08);
          color: rgba(199,210,254,.78);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .09em;
        }

        .buddy-runtime {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 6px;
        }

        .runtime-pill {
          padding: 3px 7px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 999px;
          background: rgba(255,255,255,.035);
          color: rgba(148,163,184,.75);
          font-size: 9px;
          font-weight: 650;
          text-transform: lowercase;
        }

        .bot-message-shell {
          min-width: 0;
          max-width: min(92%, 760px);
        }

        .bot-message-author {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 5px 3px;
          color: rgba(203,213,225,.64);
          font-size: 10px;
          font-weight: 700;
        }

        .message-category {
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(139,92,246,.08);
          border: 1px solid rgba(139,92,246,.13);
          color: rgba(196,181,253,.7);
          font-size: 8px;
          font-weight: 750;
          text-transform: capitalize;
        }

        .bot-bubble.bot-side {
          border-radius: 16px;
          border-top-left-radius: 7px;
          background: rgba(18,24,42,.82);
          border-color: rgba(148,163,184,.10);
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
        }

        .bot-bubble.user-side {
          border-radius: 16px;
          border-top-right-radius: 7px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 25px rgba(79,70,229,.20);
        }

        .ai-paragraph {
          margin: 0;
          line-height: 1.7;
        }

        .ai-paragraph + .ai-paragraph {
          margin-top: 7px;
        }

        .ai-heading {
          margin: 4px 0 10px;
          color: #f8fafc;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 750;
          letter-spacing: -.01em;
        }

        .ai-subheading {
          margin: 10px 0 5px;
          color: rgba(241,245,249,.96);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 720;
        }

        .ai-list {
          display: grid;
          gap: 5px;
          margin: 7px 0 3px 18px;
          color: rgba(226,232,240,.9);
        }

        .ai-list li {
          padding-left: 2px;
          line-height: 1.6;
        }

        .ai-space {
          height: 7px;
        }

        .bot-bubble code {
          padding: 2px 5px;
          border-radius: 5px;
          background: rgba(15,23,42,.88);
          border: 1px solid rgba(148,163,184,.12);
          color: #c4b5fd;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: .9em;
        }

        .bot-suggestions {
          display: block;
          padding: 10px 14px 10px;
          background: rgba(7,11,22,.78);
          border-top: 1px solid rgba(255,255,255,.05);
        }

        .bot-suggestions::before {
          display: none;
        }

        .suggestions-heading {
          margin: 0 2px 8px;
          color: rgba(148,163,184,.58);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .bot-chip {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
          padding: 9px 11px;
          border-radius: 11px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(148,163,184,.09);
          color: rgba(226,232,240,.82);
          font-size: 10.5px;
          line-height: 1.35;
          font-weight: 600;
          text-align: left;
          white-space: normal;
        }

        .bot-chip:hover {
          background: rgba(99,102,241,.09);
          border-color: rgba(129,140,248,.22);
          color: #f8fafc;
        }

        .new-buddy-chat-wrap {
          margin-top: 9px;
          padding-top: 9px;
          border-top: 1px solid rgba(148,163,184,.08);
        }

        .new-buddy-chat-btn {
          position: relative;
          width: 100%;
          min-height: 50px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border: 1px solid rgba(129,140,248,.16);
          border-radius: 13px;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          color: #e8edff;
          background:
            radial-gradient(circle at 0% 0%, rgba(124,58,237,.17), transparent 38%),
            linear-gradient(135deg, rgba(99,102,241,.09), rgba(34,211,238,.045));
          transition:
            transform .18s ease,
            border-color .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }

        .new-buddy-chat-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              110deg,
              transparent 20%,
              rgba(255,255,255,.045) 48%,
              transparent 76%
            );
          transform: translateX(-70%);
          transition: transform .35s ease;
        }

        .new-buddy-chat-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(129,140,248,.34);
          background:
            radial-gradient(circle at 0% 0%, rgba(124,58,237,.24), transparent 40%),
            linear-gradient(135deg, rgba(99,102,241,.14), rgba(34,211,238,.07));
          box-shadow: 0 10px 26px rgba(2,6,23,.20);
        }

        .new-buddy-chat-btn:hover:not(:disabled)::after {
          transform: translateX(70%);
        }

        .new-buddy-chat-btn:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .new-buddy-chat-icon {
          position: relative;
          z-index: 1;
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #fff;
          font-size: 19px;
          font-weight: 500;
          background: linear-gradient(135deg, #7c3aed, #2563eb 55%, #06b6d4);
          box-shadow: 0 6px 16px rgba(99,102,241,.25);
        }

        .new-buddy-chat-copy {
          position: relative;
          z-index: 1;
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .new-buddy-chat-title {
          color: #eef2ff;
          font-size: 10.5px;
          line-height: 1.25;
          font-weight: 760;
        }

        .new-buddy-chat-subtitle {
          color: rgba(148,163,184,.52);
          font-size: 8.5px;
          line-height: 1.25;
          font-weight: 520;
        }

        .new-buddy-chat-arrow {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
          color: rgba(165,180,252,.78);
          font-size: 15px;
        }

        .suggestion-arrow {
          flex: 0 0 auto;
          color: rgba(165,180,252,.72);
          font-size: 16px;
          line-height: 1;
        }

        .suggestion-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .suggestion-label {
          color: inherit;
        }

        .suggestion-source {
          color: rgba(148,163,184,.48);
          font-size: 8.5px;
          line-height: 1.25;
          font-weight: 550;
        }

        .welcome-suggestions {
          padding-top: 11px;
          background:
            linear-gradient(180deg, rgba(15,23,42,.18), rgba(7,11,22,.94));
        }

        .welcome-suggestions .suggestions-heading {
          margin-bottom: 9px;
          color: rgba(199,210,254,.68);
        }

        .welcome-suggestions .suggestions-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-height: 265px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .welcome-suggestions .bot-chip {
          min-height: 48px;
          background:
            linear-gradient(145deg, rgba(99,102,241,.055), rgba(255,255,255,.025));
          border-color: rgba(129,140,248,.105);
        }

        .welcome-suggestions .bot-chip:hover {
          background:
            linear-gradient(145deg, rgba(99,102,241,.14), rgba(124,58,237,.075));
          border-color: rgba(129,140,248,.27);
        }

        .bot-input-row {
          gap: 7px;
          margin: 0;
          padding: 11px 14px 14px;
          border: 0;
          border-top: 1px solid rgba(255,255,255,.055);
          border-radius: 0;
          background: rgba(7,11,22,.94);
          box-shadow: 0 -12px 32px rgba(0,0,0,.13);
        }

        .bot-input-field {
          flex: 1;
          min-width: 0;
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 13px;
          background: rgba(255,255,255,.035);
          transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
        }

        .bot-input-field:focus-within {
          border-color: rgba(129,140,248,.34);
          background: rgba(255,255,255,.045);
          box-shadow: 0 0 0 3px rgba(99,102,241,.06);
        }

        .bot-input {
          padding: 12px 92px 12px 12px;
          background: transparent;
          border: 0;
          font-size: 13px;
        }

        .composer-hint {
          position: absolute;
          right: 10px;
          color: rgba(148,163,184,.35);
          font-size: 9px;
          font-weight: 600;
          pointer-events: none;
        }

        .bot-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          box-shadow: 0 8px 18px rgba(99,102,241,.20);
        }

        .icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          font-size: 14px;
        }

        .convo-list {
          background: #0b0f1b;
        }

        .convo-list-header {
          padding: 18px 16px 13px;
        }

        .convo-list-title {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 750;
          letter-spacing: -.02em;
        }

        .convo-item {
          margin: 3px 7px;
          padding: 11px 10px;
          border: 1px solid transparent;
          border-bottom: 0;
        }

        .convo-item.active {
          background: rgba(99,102,241,.09);
          border-color: rgba(129,140,248,.13);
        }

        .convo-item.active::before {
          display: none;
        }

        .msg-header {
          padding: 13px 18px;
        }

        .msg-header-name {
          font-size: 14px;
          font-weight: 700;
        }

        .msg-body {
          padding: 22px 22px 18px;
          gap: 8px;
        }

        .msg-row > div {
          max-width: min(72%, 620px);
        }

        .msg-bubble {
          padding: 10px 13px;
          border-radius: 15px;
          font-size: 13px;
          line-height: 1.55;
        }

        .msg-bubble.theirs {
          border-top-left-radius: 6px;
          background: rgba(30,41,59,.60);
          border-color: rgba(148,163,184,.10);
        }

        .msg-bubble.mine {
          border-top-right-radius: 6px;
          background: linear-gradient(135deg, #4f46e5, #6d28d9);
          box-shadow: 0 7px 18px rgba(79,70,229,.18);
        }

        .chat-input-bar {
          padding: 11px 14px 14px;
        }

        .chat-input {
          padding: 11px 13px;
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          border-color: rgba(148,163,184,.10);
          font-size: 13px;
        }

        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          box-shadow: 0 8px 18px rgba(79,70,229,.18);
        }



        .ai-thinking-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 30px;
          padding: 1px 2px;
        }

        .ai-thinking-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ai-thinking-dots span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, #a78bfa, #67e8f9);
          box-shadow: 0 0 10px rgba(103,232,249,.22);
          animation: bounce 1.05s infinite ease-in-out;
        }

        .ai-thinking-label {
          color: rgba(226,232,240,.70);
          font-size: 11px;
          font-weight: 650;
          letter-spacing: .005em;
          white-space: nowrap;
        }

        .bot-message-shell .bot-time {
          opacity: .48;
          transition: opacity .18s ease;
        }

        .bot-msg-row:hover .bot-time {
          opacity: .82;
        }

        .runtime-pill:first-child {
          color: rgba(165,243,252,.78);
          border-color: rgba(34,211,238,.13);
          background: rgba(34,211,238,.05);
        }

        @media (max-width: 1200px) {
          .chat-panel { grid-template-columns: 220px 1fr; }
          .bot-header .icon-btn:nth-last-child(2) { display: none; }
        }

        .mobile-switcher {
          display: none;
        }

        @media (max-width: 900px) {
          .chat-root {
            display: block;
            height: 100dvh;
          }

          .panel-resizer {
            display: none;
          }

          .bot-panel,
          .chat-panel {
            display: none;
            height: 100%;
          }

          .bot-panel.mobile-visible {
            display: flex;
          }

          .chat-panel.mobile-visible {
            display: grid;
            grid-template-columns: 110px 1fr;
          }

          .mobile-switcher {
            display: flex;
            position: fixed;
            left: 50%;
            bottom: 12px;
            transform: translateX(-50%);
            z-index: 500;
            padding: 4px;
            gap: 4px;
            border-radius: 999px;
            background: rgba(9, 13, 25, 0.94);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 12px 30px rgba(0,0,0,0.4);
            backdrop-filter: blur(14px);
          }

          .mobile-switcher button {
            border: 0;
            border-radius: 999px;
            padding: 8px 14px;
            background: transparent;
            color: rgba(226,232,248,0.7);
            font: 600 12px 'Outfit', sans-serif;
            cursor: pointer;
          }

          .mobile-switcher button.active {
            color: #fff;
            background: linear-gradient(135deg, #6366f1, #7c3aed);
          }

          .suggestions-grid {
            grid-template-columns: 1fr;
          }

          .welcome-suggestions .suggestions-grid {
            grid-template-columns: 1fr;
            max-height: 245px;
          }

          .composer-hint {
            display: none;
          }

          .bot-input {
            padding-right: 12px;
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

      <div className="mobile-switcher">
        <button
          type="button"
          className={mobilePanel === 'chat' ? 'active' : ''}
          onClick={() => setMobilePanel('chat')}
        >
          Messages
        </button>
        <button
          type="button"
          className={mobilePanel === 'ai' ? 'active' : ''}
          onClick={() => setMobilePanel('ai')}
        >
          Buddy AI
        </button>
      </div>

      <div
        ref={rootRef}
        className="chat-root"
        style={{ '--chat-panel-width': `${chatPanelPercent}%` } as CSSProperties}
      >
        {/* RIGHT PANEL — BUDDY AI COACH */}
        <div className={`bot-panel ${mobilePanel === 'ai' ? 'mobile-visible' : ''}`}>
          <div className="bot-header">
            <Avatar bot size={46} />

            <div className="bot-header-info">
              <div className="bot-header-name">
                Buddy AI
                <span className="ai-beta-badge">FITNESS COACH</span>
              </div>

              <div className="bot-header-sub">
                <span
                  className="bot-status-dot"
                  style={{
                    background:
                      buddyAiOnline === true
                        ? '#22c55e'
                        : buddyAiOnline === false
                          ? '#f59e0b'
                          : '#64748b',
                  }}
                />
                {buddyAiOnline === null
                  ? 'Checking Buddy AI availability…'
                  : buddyAiOnline === false
                    ? 'AI model unavailable — live tools still work'
                    : `Personal fitness assistant for ${myName}`}
              </div>

              <div className="buddy-runtime">
                <span className="runtime-pill">smart routing</span>
                {buddyRuntime.provider && <span className="runtime-pill">{buddyRuntime.provider}</span>}
                {buddyRuntime.model && <span className="runtime-pill">{buddyRuntime.model}</span>}
                {buddyRuntime.responseTimeMs != null && (
                  <span className="runtime-pill">{(buddyRuntime.responseTimeMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>

            {detectedProfile.goal && (
              <div className="bot-goal-chip">🎯 {detectedProfile.goal.replace('-', ' ')}</div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="icon-btn" title="Copy Buddy AI chat" onClick={copyBuddyChat}>
                {copyStatus || '⧉'}
              </button>
              <button type="button" className="icon-btn" title="Save chat as image" onClick={() => exportBuddyChat('png')} disabled={shareBusy}>▧</button>
              <button type="button" className="icon-btn" title="Save chat as PDF" onClick={() => exportBuddyChat('pdf')} disabled={shareBusy}>PDF</button>
              <button type="button" className="icon-btn" title="Share chat" onClick={() => exportBuddyChat('share')} disabled={shareBusy}>↗</button>
            </div>
          </div>

          <div ref={botTranscriptRef} className="bot-messages">
            {botMessages
              .filter(m => m.role === 'user' || Boolean(m.text.trim()) || Boolean(m.cards?.length))
              .map(m => (
              <div key={m.id} className={`bot-msg-row ${m.role === 'user' ? 'user' : ''}`}>
                {m.role === 'bot' && <Avatar bot size={30} />}

                <div className="bot-message-shell">
                  {m.role === 'bot' && (
                    <div className="bot-message-author">
                      <span>Buddy AI</span>
                      {m.category && <span className="message-category">{m.category.replace('-', ' ')}</span>}
                    </div>
                  )}

                  <div className={`bot-bubble ${m.role === 'bot' ? 'bot-side' : 'user-side'}`}>
                    {renderBotText(m.text)}
                  </div>

                  {m.role === 'bot' && m.cards && m.cards.length > 0 && (
                    <BotCardGallery cards={m.cards} />
                  )}

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

                <div className="bot-message-shell">
                  <div className="bot-message-author">Buddy AI</div>
                  <div
                    className="bot-bubble bot-side"
                    style={{
                      padding: '7px 14px',
                      minWidth: 174,
                      background:
                        'linear-gradient(145deg, rgba(124,58,237,.12), rgba(34,211,238,.055))',
                      borderColor: 'rgba(139,92,246,.18)',
                    }}
                  >
                    <TypingDots
                      label={
                        buddyRuntime.provider === 'youtube'
                          ? 'Searching YouTube'
                          : buddyRuntime.provider === 'google-places'
                            ? 'Finding gyms'
                            : buddyRuntime.provider === 'exercise-db'
                              ? 'Loading exercises'
                              : buddyRuntime.provider === 'open-food-facts'
                                ? 'Checking nutrition'
                                : 'Buddy AI is thinking'
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={botEndRef} />
          </div>


          {gymSearchOpen && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, marginBottom: 8, color: 'rgba(226,232,248,.7)' }}>Select city for nearby gyms</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedCity}
                  onChange={event => setSelectedCity(event.target.value)}
                  className="bot-input"
                  style={{ padding: '9px 12px' }}
                >
                  <option value="">Choose city</option>
                  {POPULAR_INDIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
                <button
                  className="bot-send-btn"
                  disabled={!selectedCity || botTyping}
                  onClick={() => { setGymSearchOpen(false); sendBotMessage(`Show me gyms in ${selectedCity}`) }}
                >⌕</button>
              </div>
            </div>
          )}

          {(botFollowUps.length > 0 || canStartNewBuddyChat) && (
            <div
              className={`bot-suggestions ${isBuddyWelcome ? 'welcome-suggestions' : ''}`}
              aria-label={
                isBuddyWelcome
                  ? 'Buddy AI capabilities'
                  : 'Suggested follow-up questions'
              }
            >
              {botFollowUps.length > 0 && (
                <>
                  <div className="suggestions-heading">
                    {isBuddyWelcome ? 'Try Buddy AI' : 'Continue the conversation'}
                  </div>

                  <div className="suggestions-grid">
                    {botFollowUps.map((suggestion, index) => (
                      <button
                        key={`${suggestion.prompt}-${index}`}
                        type="button"
                        className="bot-chip"
                        onClick={() =>
                          sendBotMessage(
                            suggestion.prompt,
                            suggestion.category,
                          )
                        }
                        disabled={botTyping}
                        title={suggestion.prompt}
                      >
                        <span className="suggestion-copy">
                          <span className="suggestion-label">
                            {suggestion.label}
                          </span>

                          {isBuddyWelcome && (
                            <span className="suggestion-source">
                              {suggestion.category === 'gym-search'
                                ? 'Nearby gym discovery'
                                : suggestion.category === 'youtube'
                                  ? 'Technique videos'
                                  : suggestion.prompt
                                        .toLowerCase()
                                        .includes('chicken')
                                    ? 'Food nutrition lookup'
                                    : suggestion.category === 'workout'
                                      ? 'ExerciseDB visual exercises'
                                      : suggestion.category ===
                                          'beginner-workout'
                                        ? 'AI workout planning'
                                        : suggestion.category === 'nutrition'
                                          ? 'AI nutrition coaching'
                                          : suggestion.category ===
                                              'muscle-gain'
                                            ? 'Goal coaching'
                                            : suggestion.category ===
                                                'fat-loss'
                                              ? 'Goal coaching'
                                              : suggestion.category ===
                                                  'recovery'
                                                ? 'Recovery coaching'
                                                : 'Supplement guidance'}
                            </span>
                          )}
                        </span>

                        <span className="suggestion-arrow">›</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {canStartNewBuddyChat && (
                <div className="new-buddy-chat-wrap">
                  <button
                    type="button"
                    className="new-buddy-chat-btn"
                    onClick={startNewBuddyChat}
                    disabled={botTyping}
                    title="Clear this Buddy AI conversation and start fresh"
                  >
                    <span className="new-buddy-chat-icon">＋</span>

                    <span className="new-buddy-chat-copy">
                      <span className="new-buddy-chat-title">
                        Start new chat with Buddy AI
                      </span>
                      <span className="new-buddy-chat-subtitle">
                        Clear this AI conversation and start fresh
                      </span>
                    </span>

                    <span className="new-buddy-chat-arrow">↗</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bot-input-row">
            {botEmoji && (
              <EmojiPicker
                onPick={e => setBotInput(prev => prev + e)}
                onClose={() => setBotEmoji(false)}
              />
            )}

            <button
              type="button"
              className="icon-btn"
              aria-label="Open Buddy AI emoji picker"
              onClick={() => setBotEmoji(v => !v)}
            >
              😊
            </button>

            <div className="bot-input-field">
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
                placeholder="Ask about training, nutrition, recovery, gyms…"
              />
              <span className="composer-hint">Enter to send</span>
            </div>

            <button
              type="button"
              className="bot-send-btn"
              onClick={() => sendBotMessage()}
              disabled={botTyping || !botInput.trim()}
              aria-label="Send message to Buddy AI"
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

        <div
          className={`panel-resizer ${isResizingPanels ? 'active' : ''}`}
          onMouseDown={startPanelResize}
          title="Drag to resize chat and Buddy AI panels"
        />

        {/* LEFT PANEL — CHAT */}
        <div className={`chat-panel ${mobilePanel === 'chat' ? 'mobile-visible' : ''}`}>
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
                      setChatError('')
                      setActiveConvo(c)

                      try {
                        window.localStorage.setItem(
                          ACTIVE_CHAT_STORAGE_KEY,
                          String(c.userId),
                        )
                      } catch {
                        // Ignore storage failures and continue normally.
                      }

                      setConversations(prev =>
                        prev.map(item =>
                          item.userId === c.userId
                            ? {
                                ...item,
                                unreadCount: 0,
                              }
                            : item,
                        ),
                      )
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
            {chatError && (
              <div
                role="alert"
                style={{
                  margin: '10px 14px 0',
                  padding: '9px 11px',
                  borderRadius: 10,
                  border: '1px solid rgba(248,113,113,.18)',
                  background: 'rgba(248,113,113,.07)',
                  color: '#fecaca',
                  fontSize: 11,
                  lineHeight: 1.45,
                }}
              >
                ⚠ {chatError}
              </div>
            )}

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
                      void loadHistory(activeConvo.userId)
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

                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Open message emoji picker"
                    onClick={() => setShowEmoji(v => !v)}
                  >
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
                    aria-label="Send chat message"
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