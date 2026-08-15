/**
 * Transcript → recipe parsing via the OpenAI API (structured output).
 *
 * Cards are asked for at ≤140 characters, but the model can run long — the
 * parse result is only a proposal. The review screen surfaces over-limit
 * cards ("Split in two") and the save endpoint's validation is what actually
 * enforces the limit.
 */

import type { Env } from './types'
import { MEALS, INGREDIENT_ROLES, type Meal, type IngredientRole } from './db/schema'

export class ParseUnavailableError extends Error {}
export class ParseFailedError extends Error {}

export interface ParsedIngredient {
  name: string
  role: IngredientRole
  amount?: string
  maybe: boolean
}

export interface ParsedRecipe {
  title: string
  meal: Meal
  minutes: number
  ingredients: ParsedIngredient[]
  cards: Array<{ text: string; timer?: string }>
  spokenSteps: number
}

const OPENAI_MODEL = 'gpt-5-mini'

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'meal', 'minutes', 'ingredients', 'cards', 'spokenSteps'],
  properties: {
    title: { type: 'string', description: 'Short dish name, not the video title verbatim' },
    meal: { type: 'string', enum: [...MEALS] },
    minutes: { type: 'integer', description: 'Realistic total active cooking minutes' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'role', 'amount', 'maybe'],
        properties: {
          name: { type: 'string', description: 'Singular, capitalized, e.g. "Firm tofu"' },
          role: { type: 'string', enum: [...INGREDIENT_ROLES] },
          amount: {
            type: ['string', 'null'],
            description: 'Amount as spoken, e.g. "400g", "2 cloves", "thumb"; null if unstated',
          },
          maybe: {
            type: 'boolean',
            description: 'true if only mentioned in passing or optional — the cook decides whether to keep it',
          },
        },
      },
    },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'timer'],
        properties: {
          text: { type: 'string', description: 'One step, imperative voice, 140 characters or fewer' },
          timer: {
            type: ['string', 'null'],
            description: 'Duration label when the step has one, e.g. "10 min", "90 sec"; else null',
          },
        },
      },
    },
    spokenSteps: {
      type: 'integer',
      description: 'How many distinct instructional steps the transcript contained before condensing',
    },
  },
} as const

const SYSTEM_PROMPT = `You turn cooking-video transcripts into recipe cards for a home recipe box.

Rules:
- Cards are the signature: each card is ONE step, imperative voice ("Brown the beef hard..."), and MUST be 140 characters or fewer. Condense ruthlessly; merge trivial steps; keep the why when it matters ("any longer and the garlic turns bitter").
- 4 to 8 cards for most recipes. Never pad.
- Set a card's timer only when the step has a stated duration ("10 min", "90 sec").
- Ingredients: role is protein (meat/fish/eggs/tofu/cheese), aromatic (garlic/onion/ginger/chilli), produce (vegetables/fruit/herbs), pantry (dry goods, oils, sauces, spices). Include amounts as spoken. Mark maybe:true for anything mentioned only in passing or clearly optional.
- title: the dish, short and appetising, not the video's clickbait title.
- minutes: realistic active time at the stove, not the video length.
- spokenSteps: count the distinct instructional steps in the transcript before you condensed them.`

export async function parseRecipe(
  env: Env,
  input: { title: string; author: string; transcript: string },
): Promise<ParsedRecipe> {
  if (!env.OPENAI_API_KEY) {
    throw new ParseUnavailableError('Video import is not configured (missing OPENAI_API_KEY)')
  }

  // Keep the prompt well inside context limits; long videos front-load the recipe anyway.
  const transcript = input.transcript.slice(0, 60_000)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Video title: ${input.title}\nChannel: ${input.author}\n\nTranscript:\n${transcript}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'parsed_recipe', strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new ParseFailedError(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`)
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; refusal?: string } }>
  }
  const message = completion.choices?.[0]?.message
  if (!message?.content) {
    throw new ParseFailedError(message?.refusal ?? 'OpenAI returned no content')
  }

  let parsed: ParsedRecipe & { ingredients: Array<ParsedIngredient & { amount?: string | null }> }
  try {
    parsed = JSON.parse(message.content)
  } catch {
    throw new ParseFailedError('OpenAI returned malformed JSON')
  }

  // Normalize nulls from the strict schema into optional fields
  return {
    ...parsed,
    minutes: Math.max(1, Math.round(parsed.minutes || 30)),
    ingredients: parsed.ingredients.map((ing) => ({
      name: ing.name,
      role: ing.role,
      maybe: ing.maybe,
      ...(ing.amount ? { amount: ing.amount } : {}),
    })),
    cards: parsed.cards.map((card) => ({
      text: card.text.trim(),
      ...(card.timer ? { timer: card.timer } : {}),
    })),
  }
}
