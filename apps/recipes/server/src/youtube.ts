/**
 * YouTube metadata + transcript fetching, straight from the worker.
 *
 * oEmbed supplies title/author (stable, official). Duration and caption
 * tracks come from the InnerTube /player endpoint — an unofficial API that
 * can be rate-limited or blocked from datacenter IPs, so every failure here
 * is a typed error the route turns into a graceful "type it out instead"
 * message. Swapping in a hosted transcript provider later should only touch
 * this file.
 */

export class VideoUrlError extends Error {}
export class VideoLookupError extends Error {}
export class NoTranscriptError extends Error {}

export interface VideoMeta {
  videoId: string
  title: string
  author: string
  durationSeconds: number | null
  thumbUrl: string
}

/**
 * Pull a video id out of watch/shorts/youtu.be/embed/live URL shapes.
 */
export function extractVideoId(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new VideoUrlError('That does not look like a link')
  }
  const host = url.hostname.replace(/^www\.|^m\./, '')
  const idOk = (id: string | null | undefined): id is string => !!id && /^[\w-]{11}$/.test(id)

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1]
    if (idOk(id)) return id
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const v = url.searchParams.get('v')
    if (idOk(v)) return v
    const [, kind, id] = url.pathname.split('/')
    if (['shorts', 'embed', 'live', 'v'].includes(kind) && idOk(id)) return id
  }
  if (host.endsWith('tiktok.com') || host.endsWith('instagram.com')) {
    throw new VideoUrlError('Only YouTube links work for now — TikTok and Instagram are coming')
  }
  throw new VideoUrlError('Only YouTube links work for now')
}

interface CaptionTrack {
  baseUrl: string
  languageCode?: string
  kind?: string
}

interface PlayerResponse {
  videoDetails?: { lengthSeconds?: string; title?: string; author?: string }
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } }
  playabilityStatus?: { status?: string }
}

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8' // public web client key
// ANDROID_VR is currently the client that returns caption tracks without a
// PO token; WEB is kept as a metadata fallback. If imports start failing
// here, this list is the thing to update.
const INNERTUBE_CLIENTS = [
  { clientName: 'ANDROID_VR', clientVersion: '1.57.29' },
  { clientName: 'WEB', clientVersion: '2.20240401.00.00' },
] as const

async function fetchPlayerResponse(videoId: string): Promise<PlayerResponse | null> {
  let fallback: PlayerResponse | null = null
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          context: { client: { ...client, hl: 'en', gl: 'US' } },
        }),
      })
      if (!res.ok) continue
      const data = (await res.json()) as PlayerResponse
      if (data.playabilityStatus?.status !== 'OK' && !data.videoDetails) continue
      // Some clients answer with metadata but no caption tracks — keep the
      // first usable response as a fallback and prefer one carrying captions.
      if (data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) return data
      fallback = fallback ?? data
    } catch {
      // try the next client
    }
  }
  return fallback
}

export async function fetchVideoMeta(videoId: string): Promise<{ meta: VideoMeta; captionTracks: CaptionTrack[] }> {
  const oembedPromise = fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
  )
    .then((res) => (res.ok ? (res.json() as Promise<{ title?: string; author_name?: string }>) : null))
    .catch(() => null)

  const [oembed, player] = await Promise.all([oembedPromise, fetchPlayerResponse(videoId)])

  const title = oembed?.title ?? player?.videoDetails?.title
  const author = oembed?.author_name ?? player?.videoDetails?.author
  if (!title) throw new VideoLookupError('Could not find that video')

  const lengthSeconds = player?.videoDetails?.lengthSeconds
  return {
    meta: {
      videoId,
      title,
      author: author ?? 'Unknown',
      durationSeconds: lengthSeconds ? parseInt(lengthSeconds, 10) : null,
      thumbUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    },
    captionTracks: player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [],
  }
}

interface Json3Transcript {
  events?: Array<{ segs?: Array<{ utf8?: string }> }>
}

/**
 * Fetch and flatten a transcript from the video's caption tracks: prefer a
 * manual English track, then auto-generated English, then whatever exists.
 */
export async function fetchTranscript(captionTracks: CaptionTrack[]): Promise<string> {
  if (captionTracks.length === 0) throw new NoTranscriptError('This video has no captions')

  const english = captionTracks.filter((t) => t.languageCode?.startsWith('en'))
  const ordered = [
    ...english.filter((t) => t.kind !== 'asr'),
    ...english.filter((t) => t.kind === 'asr'),
    ...captionTracks,
  ]

  for (const track of ordered) {
    try {
      const url = new URL(track.baseUrl)
      url.searchParams.set('fmt', 'json3')
      const res = await fetch(url.toString())
      if (!res.ok) continue
      const data = (await res.json()) as Json3Transcript
      const text = (data.events ?? [])
        .flatMap((event) => event.segs ?? [])
        .map((seg) => seg.utf8 ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 0) return text
    } catch {
      // try the next track
    }
  }
  throw new NoTranscriptError("Couldn't read this video's transcript")
}
