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

const CHALK_POOL: Idea[] = [
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

const COOKING_POOL: Idea[] = [
  { title: 'One-pot everything', why: 'Pick a pot, fill it once, walk away — dinner with a single thing to wash.' },
  { title: 'Fridge amnesty', why: 'Cook only what is already open; the constraint picks the recipe for you.' },
  { title: 'Master one sauce', why: 'Same sauce three nights running — by night three your hands know it cold.' },
  { title: 'Tadka practice', why: 'Five minutes, whole spices, hot ghee — the highest flavour-per-effort in the kitchen.' },
  { title: 'Knife drill night', why: 'Dice one onion slowly and properly; the rest of the meal can be toast.' },
  { title: 'Breakfast for dinner', why: 'Eggs forgive everything, so it is the safest night to try a new technique.' },
  { title: 'Steal a restaurant dish', why: 'Recreate something you ate out this month — you already know the target.' },
  { title: 'Double it, freeze half', why: 'Same effort, two dinners; future-you logs a session for free.' },
  { title: 'No-recipe soup', why: 'Aromatics, liquid, whatever is left — soup is where improvising is lowest-stakes.' },
]

const CLEANING_POOL: Idea[] = [
  { title: 'One surface only', why: 'Pick a single counter and stop there — the rest of the room is not today’s problem.' },
  { title: 'Fifteen-minute sprint', why: 'Set a timer, move fast, quit when it rings; whatever got done, got done.' },
  { title: 'The drawer you avoid', why: 'One drawer, start to finish — small enough to actually reach the bottom of.' },
  { title: 'Ten things out', why: 'Find ten things to bin or donate and the room loosens without any real tidying.' },
  { title: 'Floor first', why: 'Clear only what is on the floor; the room reads clean long before it is.' },
  { title: 'Reset one room', why: 'Put everything back where it lives — no scrubbing, just returning things home.' },
  { title: 'Clean while it heats', why: 'Piggyback on the oven or kettle; the timer is already running anyway.' },
  { title: 'Wipe the forgotten thing', why: 'Light switch, door handle, fridge front — two minutes for the bits nobody does.' },
  { title: 'Music-length tidy', why: 'One album, one pass through the flat; stop when the last track ends.' },
]

/** Prompts that work for any craft hobby we have no curated pool for. */
const GENERIC_POOL: Idea[] = [
  { title: 'The ten-minute version', why: 'Do the smallest possible version today — starting is the whole battle.' },
  { title: 'Repeat with one change', why: 'Redo the last thing you made, altering exactly one choice.' },
  { title: 'Deliberately unfinished', why: 'Set a timer and stop when it rings — no pressure to make it good.' },
  { title: 'Copy something you love', why: 'Imitate a piece you admire; the shortcuts you find become your own.' },
  { title: 'Use only what is here', why: 'No shopping, no setup — whatever is within arm’s reach is the material.' },
  { title: 'Make it for someone', why: 'Pick a person to give it to and the decisions make themselves.' },
  { title: 'Half the size', why: 'Shrink the idea you have been putting off until it fits in one sitting.' },
  { title: 'Practice the boring part', why: 'Drill the step you always rush — the one that limits everything else.' },
]

/** Curated fallback pools, keyed by lowercased hobby name. */
const SPARK_POOLS: Record<string, Idea[]> = {
  'chalk drawing': CHALK_POOL,
  'cooking': COOKING_POOL,
  'cleaning': CLEANING_POOL,
}

export const poolFor = (hobbyName: string): Idea[] =>
  SPARK_POOLS[hobbyName.trim().toLowerCase()] ?? GENERIC_POOL

export function pickFromPool(hobbyName: string, excludeTitles: string[]): Idea[] {
  const sparks = poolFor(hobbyName)
  const exclude = new Set(excludeTitles.map((t) => t.toLowerCase()))
  const candidates = sparks.filter((s) => !exclude.has(s.title.toLowerCase()))
  // Fisher–Yates on a copy; if over-excluded, top back up from the full pool
  const pool = candidates.length >= 3 ? [...candidates] : [...sparks]
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
    `You suggest ideas for someone's "${ctx.hobbyName}" hobby — concrete things they could make or do today.`,
    'Voice: warm, concrete, a little playful. Each idea has a title of at most 5 words',
    'and a "why" of exactly one sentence that makes the idea feel doable today',
    '(a twist, a constraint, or a detail that lowers the stakes).',
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
    lines.push(`What they actually did recently: ${done}`)
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
    return { ideas: pickFromPool(ctx.hobbyName, ctx.excludeTitles), source: 'pool' }
  }
  try {
    return { ideas: await callOpenAI(env.OPENAI_API_KEY, ctx), source: 'openai' }
  } catch (error) {
    // The muse never fails the request over a model problem — fall back.
    console.error('Muse OpenAI call failed, using pool:', error)
    return { ideas: pickFromPool(ctx.hobbyName, ctx.excludeTitles), source: 'pool' }
  }
}
