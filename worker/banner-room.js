import { DurableObject } from 'cloudflare:workers'

const BANNER_TTL_MS = 10_000

const MESSAGES = {
  red: 'The Lost is present. Do not engage.',
  yellow: 'Missing Phased recorded. Do not attempt verification outside the household.',
  green: 'Sector 53 cleared. All Phased have returned to registered households.',
}

const LEVELS = new Set(['red', 'yellow', 'green'])

export class BannerRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.ctx = ctx
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket upgrade', { status: 426 })
      }
      const pair = new WebSocketPair()
      const [client, server] = [pair[0], pair[1]]
      this.ctx.acceptWebSocket(server)

      const current = await this.#currentBanner()
      if (current) {
        try {
          server.send(JSON.stringify({ type: 'banner', ...current }))
        } catch {
          // socket may not be ready; client will also GET /api/state on connect
        }
      }

      return new Response(null, { status: 101, webSocket: client })
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch {
        return new Response('invalid json', { status: 400 })
      }
      const level = body?.level
      if (!LEVELS.has(level)) {
        return new Response('invalid level', { status: 400 })
      }

      const expiresAt = Date.now() + BANNER_TTL_MS
      const banner = { level, message: MESSAGES[level], expiresAt }
      await this.ctx.storage.put('banner', banner)
      await this.ctx.storage.setAlarm(expiresAt)

      const payload = JSON.stringify({ type: 'banner', ...banner })
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.send(payload)
        } catch {
          // skip dead sockets; hibernation cleans them up
        }
      }
      return Response.json({ ok: true, banner })
    }

    if (url.pathname === '/state' && request.method === 'GET') {
      const banner = await this.#currentBanner()
      return Response.json({ banner })
    }

    return new Response('not found', { status: 404 })
  }

  async alarm() {
    const banner = await this.ctx.storage.get('banner')
    if (banner && banner.expiresAt > Date.now()) {
      await this.ctx.storage.setAlarm(banner.expiresAt)
      return
    }
    await this.ctx.storage.delete('banner')
    const payload = JSON.stringify({ type: 'clear' })
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        // ignore
      }
    }
  }

  webSocketMessage() {}

  webSocketClose(ws) {
    try {
      ws.close()
    } catch {
      // ignore
    }
  }

  async #currentBanner() {
    const banner = await this.ctx.storage.get('banner')
    if (!banner) return null
    if (banner.expiresAt <= Date.now()) {
      await this.ctx.storage.delete('banner')
      return null
    }
    return banner
  }
}
