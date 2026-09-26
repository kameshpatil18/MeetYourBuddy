import { NextRequest, NextResponse } from 'next/server'

const EXERCISE_DB_BASE = 'https://oss.exercisedb.dev/api/v1'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')?.trim() || ''
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') || 5), 1),
    10,
  )

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const urls = search
      ? [
          `${EXERCISE_DB_BASE}/exercises/search?search=${encodeURIComponent(search)}`,
          `${EXERCISE_DB_BASE}/exercises/search?q=${encodeURIComponent(search)}`,
          `${EXERCISE_DB_BASE}/exercises?search=${encodeURIComponent(search)}`,
        ]
      : [`${EXERCISE_DB_BASE}/exercises`]

    let lastStatus = 502
    let lastBody = ''

    for (const url of urls) {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })

      lastStatus = response.status
      lastBody = await response.text()

      if (!response.ok) continue

      try {
        return NextResponse.json(JSON.parse(lastBody), {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        })
      } catch {
        return NextResponse.json(
          { message: 'ExerciseDB returned invalid JSON.' },
          { status: 502 },
        )
      }
    }

    return NextResponse.json(
      {
        message: 'ExerciseDB request failed.',
        providerStatus: lastStatus,
        providerResponse: lastBody,
      },
      { status: lastStatus || 502 },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'ExerciseDB request timed out.' },
        { status: 504 },
      )
    }

    return NextResponse.json(
      {
        message: 'ExerciseDB could not be reached.',
        detail:
          error instanceof Error
            ? error.message
            : 'Unknown ExerciseDB error.',
      },
      { status: 502 },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
