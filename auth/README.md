# Sign in with GitHub

The roadmap page is a single static file on GitHub Pages. It has no server, and it never had
one — the viewer's token lived in their browser and the browser called `api.github.com`
directly. Replacing the pasted token with a **Sign in with GitHub** button does not change
that: the token still lives only in the viewer's browser. What changes is how they get it.

The one thing a static page cannot do is the middle step. `https://github.com/login/oauth/access_token`
sends no CORS headers and 404s an `OPTIONS` preflight, so the browser is not allowed to swap
the login code for a token. PKCE (supported by GitHub since July 2025, and used here) does not
change that — GitHub does not distinguish public from confidential clients, so the client
secret is still required, and it must not be in a page anyone can view-source.

So there is one small always-on endpoint: `worker.js`, about 80 lines, free on Cloudflare. It
holds the client secret, calls exactly one URL, and knows nothing about the roadmap.

```
browser ──1── github.com/login/oauth/authorize      (user approves, GitHub redirects back with ?code)
browser ──2── worker /exchange                       (code + PKCE verifier  →  token)
worker  ──3── github.com/login/oauth/access_token    (adds the client secret)
browser ──4── api.github.com                         (everything else, exactly as before)
```

## Setup, once

### 1. Create the OAuth app

<https://github.com/settings/developers> → **New OAuth App**, on the `arisu-human` account.

| Field | Value |
|---|---|
| Application name | `ingfah release roadmap` |
| Homepage URL | `https://arisu-human.github.io/ingfah-roadmap/` |
| Authorization callback URL | `https://arisu-human.github.io/ingfah-roadmap/` |
| Enable Device Flow | leave off |

Generate a client secret and keep the tab open. GitHub shows the secret once.

GitHub accepts a redirect back to anything under the registered callback, so both
`/ingfah-roadmap/` and `/ingfah-roadmap/index.html` work — `ALLOWED_REDIRECTS` in
`wrangler.toml` already lists both.

An OAuth app takes exactly one callback URL, so the page will not sign in from `localhost`.
If you want local testing, make a second OAuth app pointing at your dev URL.

### 2. Deploy the worker

Either route gives the same result. The dashboard needs nothing installed; the CLI needs Node.

**From the browser** — <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
**Workers** → start from the Hello World template, name it `ingfah-roadmap-auth`, **Deploy**.
Then **Edit code**, replace the whole file with `worker.js` from this folder, **Deploy** again.

Then **Settings → Variables and Secrets → Add**, four entries, then **Deploy**:

| Type | Name | Value |
|---|---|---|
| Text | `GITHUB_CLIENT_ID` | `Ov23ligjYU8yfTEQgmUk` |
| Text | `ALLOWED_ORIGINS` | `https://arisu-human.github.io` |
| Text | `ALLOWED_REDIRECTS` | `https://arisu-human.github.io/ingfah-roadmap/,https://arisu-human.github.io/ingfah-roadmap/index.html` |
| **Secret** | `GITHUB_CLIENT_SECRET` | the secret from step 1 |

Secret, not Text, for the last one — a Text variable is readable back out of the dashboard
afterwards, and a Secret is not.

The dashboard does not read `wrangler.toml`, so those four are typed in by hand. The file is
still worth keeping: it is the same settings in one readable place, and it is what a CLI
deploy would use.

**From a terminal** — needs Node, which is not on this Mac; install it first if you go this
way. `wrangler.toml` already carries the client id and the two lists.

```sh
cd auth
npx wrangler login                                  # opens a browser, one time
npx wrangler secret put GITHUB_CLIENT_SECRET        # paste the secret, it goes nowhere else
npx wrangler deploy
```

Either way you end up with a URL like `https://ingfah-roadmap-auth.<your-subdomain>.workers.dev`.

Check it is alive — this should answer `403 origin_not_allowed`, which means it is up and
refusing strangers:

```sh
curl -s -X POST https://ingfah-roadmap-auth.<sub>.workers.dev/exchange \
  -H 'Content-Type: application/json' -d '{"code":"x","code_verifier":"y"}'
```

### 3. Point the page at it

In `index.html`, near the top of the script:

```js
const CLIENT_ID = 'Ov23...'                                              // from step 1
const EXCHANGE  = 'https://ingfah-roadmap-auth.<sub>.workers.dev/exchange'  // from step 2
```

Commit and push to `main`. Pages redeploys in about a minute.

### 4. Get it past 100x-fi's SSO

`100x-fi` uses SAML single sign-on, so an **organization owner** has to let the app in — the
same one-time approval the old tokens needed via *Configure SSO*, just done once for everyone
instead of once per person.

Organization settings → **Third-party Access** → **OAuth app policy**. Either approve the app
from the requests list (it appears the first time a member tries to sign in), or approve it
ahead of time. After that each person clicks **Authorize** once on their first sign-in and is
never asked again.

## Scopes

`repo` and `read:project` — the same two the pasted tokens carried. `repo` is what the REST
`PATCH /repos/{owner}/{repo}/milestones/{n}` call needs to move a release date, and it is also
what gets private repos into the GraphQL reads.

## What this does not do

- **No refresh handling.** OAuth app tokens do not expire. If the token stops working — the
  user revoked it, or the org withdrew the app — the page clears it and shows the sign-in
  again. That is the whole recovery path.
- **Sign out is local.** It drops the token and the cached rows from this browser. It does not
  revoke the grant on GitHub's side; that lives at
  <https://github.com/settings/applications>.
- **The worker keeps no state and no logs.** Nothing to expire, nothing to leak.
