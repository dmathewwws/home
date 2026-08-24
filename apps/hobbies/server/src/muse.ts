/**
 * The muse: AI ideation for craft hobbies, living at the exact moment you're
 * committed but stuck — inside the chalk picker.
 *
 * This is one LLM call: context in (recent pieces, recent sessions, titles to
 * avoid), strict-JSON {title, why} ideas out. When OPENAI_API_KEY is absent
 * (the dev default) or the call fails for any reason, we fall back to the
 * curated SPARK_POOL so the flow always works — the client can't tell the
 * difference beyond the `source` field.
 */

import type { Env } from './types'

export interface Idea {
  title: string
  why: string
}

export interface MuseContext {
  hobbyName: string
  recentPieceNames: string[]
  recentSessions: Array<{ pieceName: string | null; date: string }>
  excludeTitles: string[]
}

// The designated model swap point.
const MUSE_MODEL = 'gpt-5-mini'
const MUSE_TIMEOUT_MS = 10_000

export const SPARK_POOL: Idea[] = [
  { title: 'Rain shadow', why: 'Draw around a dry patch just after drizzle — the sidewalk does half the work.' },
  { title: 'Giant koi pond', why: "Orange + white koi read beautifully on grey concrete, and kids walk 'across' it." },
  { title: 'Doorway to somewhere', why: 'A trompe-l’œil trapdoor or staircase — your seawall mural idea, miniaturized.' },
  { title: 'Botanical alphabet', why: 'One chalk letter wrapped in local plants — practice for lettering *and* foliage.' },
  { title: 'Sun-fade experiment', why: 'Same motif in 3 spots with different sun; photograph the fade over a week.' },
  { title: 'Hopscotch remix', why: 'A playable drawing — chalk art people can use, not just look at.' },
  { title: 'Portrait of your shadow', why: 'Trace your 6pm shadow, then fill it with pattern. Free proportions, zero pressure.' },
  { title: 'Crosswalk constellations', why: 'Tiny star maps in pavement cracks — low effort, high delight for passers-by.' },
  { title: 'Chai & chalk', why: 'Draw a steaming cup with Hindi lettering — two hobbies, one square of pavement.' },
]

export function pickFromPool(excludeTitles: string[]): Idea[] {
  const exclude = new Set(excludeTitles.map((t) => t.toLowerCase()))
  const candidates = SPARK_POOL.filter((s) => !exclude.has(s.title.toLowerCase()))
  // Fisher–Yates on a copy; if over-excluded, top back up from the full pool
  const pool = candidates.length >= 3 ? [...candidates] : [...SPARK_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

const RESPONSE_SCHEMA = {
  name: 'muse_ideas',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ideas'],
    properties: {
      ideas: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'why'],
          properties: {
            title: { type: 'string' },
            why: { type: 'string' },
          },
        },
      },
    },
  },
}

function buildMessages(ctx: MuseContext) {
  const system = [
    `You suggest ideas for someone's "${ctx.hobbyName}" hobby — sidewalk chalk-style drawing prompts.`,
    'Voice: warm, concrete, a little playful. Each idea has a title of at most 5 words',
    'and a "why" of exactly one sentence that makes the idea feel doable today',
    '(mention the surface, the light, passers-by, or a twist that lowers the stakes).',
    'Never repeat or lightly rephrase an excluded or recent title.',
  ].join(' ')

  const lines: string[] = []
  if (ctx.recentPieceNames.length > 0) {
    lines.push(`Their saved prompts/pieces: ${ctx.recentPieceNames.join('; ')}`)
  }
  if (ctx.recentSessions.length > 0) {
    const done = ctx.recentSessions
      .map((s) => `${s.pieceName ?? 'general practice'} (${s.date})`)
      .join('; ')
    lines.push(`What they actually drew recently: ${done}`)
  }
  if (ctx.excludeTitles.length > 0) {
    lines.push(`Do not suggest anything like: ${ctx.excludeTitles.join('; ')}`)
  }
  lines.push('Suggest 3 fresh ideas.')

  return [
    { role: 'system', content: system },
    { role: 'user', content: lines.join('\n') },
  ]
}

async function callOpenAI(apiKey: string, ctx: MuseContext): Promise<Idea[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MUSE_MODEL,
      messages: buildMessages(ctx),
      // gpt-5-series: default temperature only; use max_completion_tokens
      max_completion_tokens: 2000,
      response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
    }),
    signal: AbortSignal.timeout(MUSE_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  const parsed = JSON.parse(content) as { ideas?: Idea[] }
  const ideas = parsed.ideas
  if (
    !Array.isArray(ideas) ||
    ideas.length !== 3 ||
    ideas.some((i) => typeof i?.title !== 'string' || typeof i?.why !== 'string')
  ) {
    throw new Error('OpenAI response did not match the ideas shape')
  }
  return ideas
}

export async function generateIdeas(
  env: Env,
  ctx: MuseContext,
): Promise<{ ideas: Idea[]; source: 'openai' | 'pool' }> {
  if (!env.OPENAI_API_KEY) {
    return { ideas: pickFromPool(ctx.excludeTitles), source: 'pool' }
  }
  try {
    return { ideas: await callOpenAI(env.OPENAI_API_KEY, ctx), source: 'openai' }
  } catch (error) {
    // The muse never fails the request over a model problem — fall back.
    console.error('Muse OpenAI call failed, using pool:', error)
    return { ideas: pickFromPool(ctx.excludeTitles), source: 'pool' }
  }
}
