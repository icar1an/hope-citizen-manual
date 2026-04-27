import { WebSocketServer } from 'ws'

// Vite plugin that emulates worker/banner-room.js for local dev on macOS versions
// that can't run workerd (wrangler dev). Identical HTTP + WS surface as the DO:
//   POST /api/banner {level}
//   GET  /api/state
//   WS   /api/ws
// Keep defaults in sync with worker/banner-room.js.

const BANNER_TTL_MS = 10_000
const MESSAGES = {
  red: 'The Lost is present. Do not engage.',
  yellow: 'Missing Phased recorded. Do not attempt verification outside the household.',
  green: 'Sector 53 cleared. All Phased have returned to registered households.',
}
const LEVELS = new Set(['red', 'yellow', 'green'])

export function bannerDevPlugin() {
  let banner = null
  let clearTimer = null
  let wss = null

  function broadcast(obj) {
    if (!wss) return
    const payload = JSON.stringify(obj)
    for (const ws of wss.clients) {
      if (ws.readyState === 1) {
        try {
          ws.send(payload)
        } catch {
          // ignore
        }
      }
    }
  }

  function currentBanner() {
    if (!banner) return null
    if (banner.expiresAt <= Date.now()) {
      banner = null
      return null
    }
    return banner
  }

  async function readJson(req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (err) {
          reject(err)
        }
      })
      req.on('error', reject)
    })
  }

  return {
    name: 'banner-dev-plugin',
    configureServer(server) {
      wss = new WebSocketServer({ noServer: true })

      server.httpServer?.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname !== '/api/ws') return
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req)
          const current = currentBanner()
          if (current) {
            try {
              ws.send(JSON.stringify({ type: 'banner', ...current }))
            } catch {
              // ignore
            }
          }
        })
      })

      server.middlewares.use('/api/banner', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body
        try {
          body = await readJson(req)
        } catch {
          res.statusCode = 400
          return res.end('invalid json')
        }
        const level = body?.level
        if (!LEVELS.has(level)) {
          res.statusCode = 400
          return res.end('invalid level')
        }
        banner = { level, message: MESSAGES[level], expiresAt: Date.now() + BANNER_TTL_MS }
        clearTimeout(clearTimer)
        clearTimer = setTimeout(() => {
          banner = null
          broadcast({ type: 'clear' })
        }, BANNER_TTL_MS)
        broadcast({ type: 'banner', ...banner })
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ ok: true, banner }))
      })

      server.middlewares.use('/api/state', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const b = currentBanner()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ banner: b }))
      })

      // Match Cloudflare assets' automatic .html resolution in dev.
      server.middlewares.use((req, res, next) => {
        if (req.url === '/control' || req.url === '/control/') {
          req.url = '/control.html'
        }
        next()
      })
    },
  }
}
