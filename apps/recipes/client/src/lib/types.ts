/** Shared client-side shapes mirroring the server's API responses. */

export const MEALS = ['main', 'snack', 'sauce', 'salad', 'dessert'] as const
export type Meal = (typeof MEALS)[number]

export type SourceType = 'video' | 'book' | 'notes'

export const INGREDIENT_ROLES = ['protein', 'aromatic', 'produce', 'pantry'] as const
export type IngredientRole = (typeof INGREDIENT_ROLES)[number]

export type Verdict = 'keeper' | 'another-go' | 'never-again'

export const CARD_MAX_CHARS = 140

export interface RecipeCard {
  text: string
  timer?: string
}

export interface RecipeSwap {
  ingredient: string
  replacement: string
}

export interface RecipeChip {
  id: string
  name: string
  role: IngredientRole
  amount: string | null
}

export interface RecipeListItem {
  id: string
  title: string
  meal: Meal
  minutes: number
  sourceType: SourceType
  sourceUrl: string | null
  sourceAuthor: string | null
  sourceDetail: string | null
  thumbUrl: string | null
  createdBy: string
  createdAt: string
  ingredients: RecipeChip[]
  timesCooked: number
  lastCookedAt: string | null
}

export interface RecipeFull extends RecipeListItem {
  cards: RecipeCard[]
  swaps: RecipeSwap[]
  lastReflection: {
    cookedAt: string
    rep: number
    changeNextTime: string | null
    note: string | null
  } | null
}

export interface Ingredient {
  id: string
  name: string
  role: IngredientRole
}

export interface ReflectionListItem {
  id: string
  recipeId: string | null
  recipeTitle: string
  verdict: Verdict
  note: string | null
  changeNextTime: string | null
  minutes: number | null
  rep: number
  photoId: string | null
  createdBy: string
  authorName: string | null
  cookedAt: string
}

/** What POST /api/recipes accepts. */
export interface RecipeDraftIngredient {
  ingredientId?: string
  name?: string
  role?: IngredientRole
  amount?: string | null
}

export interface RecipeDraft {
  title: string
  meal: Meal
  minutes: number
  sourceType: SourceType
  sourceUrl?: string | null
  sourceAuthor?: string | null
  sourceDetail?: string | null
  thumbUrl?: string | null
  ingredients: RecipeDraftIngredient[]
  cards: RecipeCard[]
  swaps: RecipeSwap[]
}

export interface ReflectionDraft {
  recipeId: string
  verdict: Verdict
  note?: string | null
  changeNextTime?: string | null
  minutes?: number | null
  photoId?: string | null
}

/** POST /api/parse-video response. */
export interface ParsedIngredient {
  name: string
  role: IngredientRole
  amount?: string
  maybe: boolean
}

export interface ParseVideoResult {
  video: {
    videoId: string
    title: string
    author: string
    durationSeconds: number | null
    thumbUrl: string
  }
  parse: {
    title: string
    meal: Meal
    minutes: number
    ingredients: ParsedIngredient[]
    cards: RecipeCard[]
    stats: {
      spokenSteps: number
      ingredientCount: number
      cardCount: number
      overLimit: number
    }
  }
}
