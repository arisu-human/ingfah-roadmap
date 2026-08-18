// Token exchange for the roadmap page.
//
// The page is a single static file on GitHub Pages, and github.com's OAuth token endpoint
// sends no CORS headers at all — it 404s an OPTIONS preflight — so the browser cannot swap
// the login code for a token by itself. This worker is the smallest thing that can. It holds
// the OAuth app's client secret, makes exactly one call to exactly one URL, and knows nothing
// about the roadmap. Everything else still runs in the browser against api.github.com.
//
// Config (wrangler.toml [vars]):  GITHUB_CLIENT_ID, ALLOWED_ORIGINS, ALLOWED_REDIRECTS
// Secret (wrangler secret put):   GITHUB_CLIENT_SECRET

const TOKEN_URL = 'https://github.com/login/oauth/access_token'

const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean)
const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type':'application/json', 'Cache-Control':'no-store' }
  })

export default {
  async fetch(req, env) {
    const origins = list(env.ALLOWED_ORIGINS)
    const origin = req.headers.get('Origin') || ''
    const known = origins.includes(origin)

    // Only ever name one origin, and say so in Vary, or a cache could hand one site's
    // permission slip to another.
    const cors = {
      'Access-Control-Allow-Origin': known ? origin : (origins[0] || 'null'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    }

    if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:cors })
    if (req.method !== 'POST') return json({ error:'method_not_allowed' }, 405, cors)
    if (new URL(req.url).pathname !== '/exchange') return json({ error:'not_found' }, 404, cors)
    if (!known) return json({ error:'origin_not_allowed',
      error_description:'This exchange only answers ' + origins.join(', ') }, 403, cors)
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return json({ error:'not_configured',
      error_description:'The worker has no client id or secret set.' }, 500, cors)

    let body
    try { body = await req.json() } catch (e) { body = null }
    const code = body && typeof body.code === 'string' ? body.code : ''
    const verifier = body && typeof body.code_verifier === 'string' ? body.code_verifier : ''
    const redirect = body && typeof body.redirect_uri === 'string' ? body.redirect_uri : ''
    if (!code || !verifier) return json({ error:'invalid_request',
      error_description:'Send code and code_verifier.' }, 400, cors)

    // GitHub checks this too, but refusing an unknown redirect here keeps the worker from
    // being useful to anyone pointing a different page at this client id.
    const redirects = list(env.ALLOWED_REDIRECTS)
    if (redirects.length && !redirects.includes(redirect)) return json({ error:'invalid_request',
      error_description:'Unknown redirect_uri.' }, 400, cors)

    let res, out
    try {
      res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Accept':'application/json', 'Content-Type':'application/x-www-form-urlencoded',
                   'User-Agent':'ingfah-roadmap-auth' },
        body: new URLSearchParams({
          client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
          code, code_verifier: verifier, redirect_uri: redirect
        })
      })
      out = await res.json()
    } catch (e) {
      return json({ error:'exchange_failed',
        error_description:'The request never reached github.com.' }, 502, cors)
    }

    // Hand back only what the page needs. Nothing here is ever logged: a token in a log line
    // is a token someone else can read.
    if (!out || !out.access_token) return json({
      error: (out && out.error) || 'exchange_failed',
      error_description: (out && out.error_description) || 'GitHub returned no token.'
    }, res.status === 200 ? 400 : res.status, cors)

    return json({ access_token: out.access_token, token_type: out.token_type,
                  scope: out.scope }, 200, cors)
  }
}
