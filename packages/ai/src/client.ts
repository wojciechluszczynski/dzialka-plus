import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 4096
const TEMPERATURE = 0.1
const TIMEOUT_MS = 30_000
const MAX_RETRIES = 2

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export async function callAI(params: {
  system: string
  user: string
  imageBase64?: Array<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }>
}): Promise<unknown> {
  const client = getClient()

  const content: Anthropic.MessageParam['content'] = []

  if (params.imageBase64?.length) {
    for (const img of params.imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.data },
      })
    }
  }

  content.push({ type: 'text', text: params.user })

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: params.system,
          messages: [{ role: 'user', content }],
        },
        { timeout: TIMEOUT_MS }
      )

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

      return JSON.parse(text)
    } catch (err) {
      lastError = err as Error
      if (err instanceof SyntaxError) {
        // JSON parse error — retry
        continue
      }
      throw err
    }
  }

  throw new Error(`AI call failed after ${MAX_RETRIES} retries: ${lastError?.message}`)
}
