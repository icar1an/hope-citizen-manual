export { BannerRoom } from './banner-room.js'

const DO_NAME = 'default'

function forwardToRoom(request, env, path) {
  const id = env.BANNER.idFromName(DO_NAME)
  const stub = env.BANNER.get(id)
  const inner = new Request(new URL(path, 'https://banner.internal').toString(), request)
  return stub.fetch(inner)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket upgrade', { status: 426 })
      }
      return forwardToRoom(request, env, '/ws')
    }

    if (url.pathname === '/api/banner' && request.method === 'POST') {
      return forwardToRoom(request, env, '/broadcast')
    }

    if (url.pathname === '/api/state' && request.method === 'GET') {
      return forwardToRoom(request, env, '/state')
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('not found', { status: 404 })
    }

    if (url.hostname === 'report.watchlight.info' && (url.pathname === '/' || url.pathname === '/index.html')) {
      url.pathname = '/control.html'
      return env.ASSETS.fetch(new Request(url, request))
    }

    return env.ASSETS.fetch(request)
  },
}
