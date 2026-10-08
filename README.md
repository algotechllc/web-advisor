# Web Advisor

Scan public websites for security headers, TLS/certificate basics, DNSSEC, DNS hygiene (SPF, DMARC, CAA), SEO/social previews (Open Graph, Twitter cards), and Is Agentic readiness (via the public Is Agentic report API, with local probes when no report is stored yet). Includes a Nuxt 4 web app with a scan API, plus a Chrome extension (optional).

## Structure

```
web/         Nuxt 4 site + Nitro API (deploy to Vercel)
extension/   Chrome MV3 extension
docs/        Methodology and project docs
```

Scoring (category penalties, letter grades, weights, overrides): [docs/scoring.md](docs/scoring.md).

## Prerequisites

- Node.js 20+
- pnpm 9+

## Web app

```bash
pnpm install
cp web/.env.example web/.env   # set your org / site branding
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Agent and SEO files: `/llms.txt`, `/sitemap.xml`, `/robots.txt`, `/og.png`, `/about`, `/contact`, `/privacy`. Homepage and 404s honor `Accept: text/markdown` with `Vary: Accept`.

### Site branding (env)

Company name, address, contact email, and canonical site URL are **not hardcoded for a vendor**. They come from public Nuxt runtime config (`NUXT_PUBLIC_*`). Defaults are generic placeholders suitable for forks. See `web/.env.example`.

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_SITE_URL` | Canonical site origin (also used in sitemap, robots, OG, JSON-LD) |
| `NUXT_PUBLIC_SITE_NAME` | Product name in UI and meta |
| `NUXT_PUBLIC_SITE_DESCRIPTION` | Meta / OG description |
| `NUXT_PUBLIC_ORG_NAME` | Legal / org display name |
| `NUXT_PUBLIC_ORG_EMAIL` | Contact and privacy email |
| `NUXT_PUBLIC_ORG_URL` | Organization website |
| `NUXT_PUBLIC_ORG_ADDRESS` | Full address shown on About / Contact / Privacy |
| `NUXT_PUBLIC_ORG_STREET_ADDRESS` | JSON-LD `streetAddress` |
| `NUXT_PUBLIC_ORG_LOCALITY` | JSON-LD `addressLocality` |
| `NUXT_PUBLIC_ORG_COUNTRY` | JSON-LD `addressCountry` (ISO code) |
| `NUXT_PUBLIC_ORG_POSTAL_CODE` | JSON-LD `postalCode` |
| `NUXT_PUBLIC_GITHUB_URL` | Source repository link shown in the site header |

Set the same keys in Vercel (or your host) for production. There are **no private API keys** required to run the scanner; DoH and Is Agentic use public endpoints.

To refresh an Is Agentic score after deploy (the JSON API never starts a scan):

```bash
npx is-agentic https://YOUR_SITE_HOST --json
```

If a report already exists, open `https://is-agentic.com/scan/YOUR_SITE_HOST` to run a new snapshot.

### Scan API

`GET /api/scan?url=<https-url>`

Example:

```bash
curl "http://localhost:3000/api/scan?url=https://example.com"
```

Query notes:

- `url` is required (bare hosts like `example.com` are accepted and treated as HTTPS).
- `fresh=1` is accepted for future caching; every scan is live in this MVP.
- Private/local hosts and IPs are rejected (SSRF guard).

Response includes overall `grade` / `score` and category results: `headers`, `tls`, `dnssec`, `dns`.

### Security headers (this app)

Hardening is handled by [`nuxt-security`](https://nuxt-security.vercel.app/) in `web/nuxt.config.ts`:

- CSP with per-request nonces + `strict-dynamic` (no `unsafe-inline` / `unsafe-eval`)
- HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP

Do not set a static CSP in `vercel.json` (nonces must be per request). DNSSEC / SPF / DMARC / CAA still depend on the domain’s DNS after you attach a custom domain.

### Deploy to Vercel

From the repo root (or set the Vercel project root to `web/`):

```bash
cd web
pnpm dlx vercel
```

Or link the monorepo and set **Root Directory** to `web` in the Vercel project settings.

### Rate limiting

The scan API is limited to **20 requests per IP per 60 seconds**:

1. **In-app** (`web/server/middleware/scan-rate-limit.ts`) returns `429` with `Retry-After` and `X-RateLimit-*` headers. On Vercel this is per serverless instance (soft limit).
2. **Vercel Firewall** (recommended hard limit): `vercel.json` cannot declare WAF rate limits. Add a dashboard/CLI rule:
   - Path starts with `/api/scan`
   - Rate limit: fixed window, **20** requests / **60s**, key **IP**, action **Deny**

```bash
cd web
vercel link
vercel firewall rules add "Scan API 20/min" \
  --condition '{"type":"path","op":"pre","value":"/api/scan"}' \
  --action rate_limit \
  --rate-limit-algo fixed_window \
  --rate-limit-window 60 \
  --rate-limit-requests 20 \
  --rate-limit-keys ip \
  --rate-limit-action deny \
  --yes
vercel firewall publish --yes
```

## Chrome extension

1. Start the web API (`pnpm dev`) or deploy it and note the base URL.
2. Chrome → `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder
4. Open the extension **Options** and set:
   - **API base URL** (default `http://localhost:3000`)
   - **Site base URL** for report links
   - **Notify threshold** (default `C` — notifies for C or worse)

Behavior:

- Badge shows the current tab's grade after the page finishes loading.
- Session storage avoids rescanning the same host for 30 minutes.
- A notification fires once per host per session when the grade is at or below the threshold (again if the grade worsens).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run the Nuxt app |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |

## Out of scope (MVP)

- Persistent scan result cache / Redis
- Auth, accounts, scan history
- Deep CSP or mail-policy analysis
- Firefox packaging
