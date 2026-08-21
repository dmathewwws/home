# Recipe Import JSON Spec

The app's "Paste recipe JSON" flow (Add → Paste recipe JSON) accepts a single
JSON document describing one recipe. Produce it with any external tool — e.g. a
YouTube transcript tool piped through an LLM — then paste it into the app. It
lands on the review screen (edit cards, keep/drop "maybe" ingredients, split
over-long cards) and nothing persists until you hit save, which goes through
the normal `POST /api/recipes` endpoint.

Client-side parsing lives in `client/src/lib/import-json.ts`; the save-time
authority on limits is `server/src/validation.ts`.

## Example

```json
{
  "title": "Crispy chilli tofu",
  "meal": "main",
  "minutes": 25,
  "source": {
    "type": "video",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "author": "Channel Name",
    "detail": "12:34",
    "thumbUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  },
  "ingredients": [
    { "name": "Firm tofu", "role": "protein", "amount": "400g" },
    { "name": "Spring onion", "role": "produce", "amount": "3" },
    { "name": "Sesame oil", "role": "pantry", "amount": null, "maybe": true }
  ],
  "cards": [
    { "text": "Press the tofu for 10 minutes, then tear into rough chunks.", "timer": "10 min" },
    { "text": "Toss the chunks in cornflour and fry until deeply golden." }
  ],
  "swaps": [
    { "ingredient": "Honey", "replacement": "Maple syrup" }
  ],
  "variations": [
    { "name": "Extra crispy", "detail": "double-fry: rest 5 min after the first fry, then fry again" }
  ]
}
```

A minimal document is just `{ "title": "...", "cards": [{ "text": "..." }] }` —
everything else has a default.

## Fields

| Field | Required | Default | Constraints |
|---|---|---|---|
| `title` | yes | — | non-empty, ≤200 chars |
| `meal` | no | `"main"` | `main` \| `snack` \| `sauce` \| `salad` \| `sandwich` \| `dessert` |
| `minutes` | no | `30` | integer 1–6000; realistic active time, not video length |
| `source` | no | type `notes`, rest null | object |
| `source.type` | no | `"video"` when `source` is present | `video` \| `book` \| `notes` |
| `source.url` | no | null | ≤500 chars; stored **verbatim** as the recipe's source link |
| `source.author` | no | null | ≤200 chars (e.g. channel name) |
| `source.detail` | no | null | ≤200 chars; free display string (e.g. video duration `"12:34"`) |
| `source.thumbUrl` | no | null | ≤500 chars |
| `ingredients` | no | `[]` | ≤40 items, names unique (case-insensitive) |
| `ingredients[].name` | yes | — | non-empty, ≤80 chars; singular, capitalized ("Firm tofu") |
| `ingredients[].role` | yes | — | `protein` \| `aromatic` \| `produce` \| `pantry` |
| `ingredients[].amount` | no | null | ≤60 chars; as spoken ("400g", "2 cloves", "thumb") |
| `ingredients[].maybe` | no | `false` | `true` = only mentioned in passing / optional — the review screen offers tap-to-keep-or-drop |
| `cards` | yes | — | 1–24 items |
| `cards[].text` | yes | — | non-empty; **may exceed 140 chars at paste time** (see below) |
| `cards[].timer` | no | null | ≤40 chars; only when the step has a stated duration ("10 min", "90 sec") |
| `swaps` | no | `[]` | ≤12 items |
| `swaps[].ingredient` | yes | — | ≤80 chars; the thing you might be out of |
| `swaps[].replacement` | yes | — | ≤200 chars |
| `variations` | no | `[]` | ≤12 items |
| `variations[].name` | yes | — | ≤40 chars; a short label ("Chocolate", "Berry") |
| `variations[].detail` | no | `""` | ≤200 chars; what changes vs. the base |

## Semantics

- **The 140-character card rule.** Cards are the app's signature: one step
  each, ≤140 characters at save time. Pasted cards *may* run over — the review
  screen flags them and offers "Split in two" — but the save button stays
  disabled until every card fits. Aim for ≤140 from your tool anyway.
- **Unknown top-level keys are ignored** (so an LLM adding extras won't break
  the paste). Unknown enum values are hard errors naming the field.
- **Markdown code fences are stripped** — pasting a ```` ```json ```` block
  straight from a chat works.
- `source.type: "video"` renders the "Youtube" attribution label on the recipe
  list, with `source.url` as the link. On the detail screen it appears as the
  first entry of the **Sources** section.

## Prompt guidance for an LLM producing this JSON

> Turn this cooking-video transcript into a recipe document.
>
> - Cards: each card is ONE step, imperative voice ("Brown the beef hard…"),
>   140 characters or fewer. Condense ruthlessly; merge trivial steps; keep the
>   why when it matters ("any longer and the garlic turns bitter"). 4 to 8
>   cards for most recipes; never pad.
> - Set a card's `timer` only when the step has a stated duration
>   ("10 min", "90 sec").
> - Ingredients: `role` is `protein` (meat/fish/eggs/tofu/cheese), `aromatic`
>   (garlic/onion/ginger/chilli), `produce` (vegetables/fruit/herbs), `pantry`
>   (dry goods, oils, sauces, spices). Names singular and capitalized. Include
>   `amount` as spoken. Mark `"maybe": true` for anything mentioned only in
>   passing or clearly optional.
> - If the source presents flavour variations of one base recipe (overnight
>   oats five ways, one dressing with three finishes), keep ONE set of cards
>   for the base and list each take under `variations` — name + what changes —
>   rather than duplicating cards. `swaps` stays for out-of-stock
>   substitutions only.
> - `title`: the dish, short and appetising, not the video's clickbait title.
> - `minutes`: realistic active time at the stove, not the video length.
> - `source`: type `"video"`, the video URL, the channel name as `author`, the
>   duration as `detail` (m:ss), and the thumbnail URL as `thumbUrl`.
> - Output only the JSON object.
