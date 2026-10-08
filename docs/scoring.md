# Scoring methodology

Web Advisor grades a public hostname from six category scanners, then combines those scores into one overall letter grade. This document describes how scores, grades, and overrides work in the current codebase (`web/server/utils/grade.ts`, `web/shared/grade.ts`, and the scanners under `web/server/utils/scanners/`).

## Pipeline

1. Resolve and validate the target URL (HTTPS assumed for bare hosts; private/local targets rejected).
2. Run six scanners in parallel: **headers**, **TLS**, **DNSSEC**, **DNS**, **SEO**, **Is Agentic**.
3. Each scanner emits a list of **findings** (`passed` / failed, with a **severity**).
4. Convert each category’s findings into a **category score** (0–100) and **category grade**.
5. Compute a **weighted overall score**, map it to a letter grade, then apply **hard overrides**.

Scans are live snapshots. There is no persistent score cache in this version.

## Findings and severity penalties

Every category starts at **100**. Each **failed** finding subtracts a fixed penalty by severity. Passed findings do not change the score (including `info` notes that still pass).

| Severity | Penalty |
|----------|---------|
| critical | 35 |
| high | 20 |
| medium | 10 |
| low | 5 |
| info | 0 |

```
categoryScore = clamp(100 − Σ penalties for failed findings, 0, 100)
```

Penalties stack. Several medium failures can drop a category more than a single high failure.

## Letter grades from score

Category grades and the overall grade (before overrides) use the same thresholds:

| Score | Grade |
|------:|:------|
| ≥ 95 | A+ |
| ≥ 85 | A |
| ≥ 75 | B |
| ≥ 60 | C |
| ≥ 45 | D |
| ≥ 30 | E |
| &lt; 30 | F |

## Overall score weights

The overall numeric score is a rounded weighted average of category scores:

| Category | Weight | Role |
|----------|-------:|------|
| Security headers | 0.35 | Largest share: CSP, HSTS, clickjacking, related headers |
| TLS / certificate | 0.12 | Trust, expiry, HTTPS redirect |
| DNSSEC | 0.10 | Zone signing and RRSIG evidence |
| DNS hygiene | 0.10 | SPF, DMARC, CAA |
| SEO / social | 0.16 | Title, description, Open Graph, Twitter, canonical |
| Is Agentic | 0.17 | Official Is Agentic report and/or local agent probes |

Weights sum to **1.00**.

```
overallScore = round(
  headers×0.35 + tls×0.12 + dnssec×0.10 + dns×0.10 + seo×0.16 + agentic×0.17
)
```

UI tabs group categories for display:

- **Security**: headers, TLS, DNSSEC, DNS
- **SEO**: SEO / social
- **Is Agentic**: agentic

Tab grades shown in the UI are the average of that tab’s category scores (not the overall weighted score).

## Hard grade overrides

After the weighted score is mapped to a letter grade, the overall grade can only get **worse** (never better) under these rules, applied in order:

1. **TLS critical failure** (for example certificate not trusted) → overall grade at most **F**.
2. Else if **DNSSEC is broken** (failed high finding with id `dnssec-rrsig`, `dnssec-zone`, or `dnssec-chain`) → overall grade at most **D**.
3. Else if the **headers** category grade is **F** → overall grade at most **F**.
4. Else if the **headers** category grade is **E** → overall grade at most **E**.

The numeric overall score is **not** rewritten by these overrides; only the letter grade is capped.

## What each scanner contributes

Exact finding lists evolve with the scanners. The intent of each category:

### Security headers

Fetches the public HTTP(S) response and checks headers such as Content-Security-Policy, Strict-Transport-Security, clickjacking defenses (`X-Frame-Options` / CSP `frame-ancestors`), `X-Content-Type-Options`, Referrer-Policy, Permissions-Policy, and Cross-Origin-Opener-Policy.

CSP policy: modern nonce / hash / `strict-dynamic` setups are treated as passing even when legacy `unsafe-inline` keywords remain for older browsers. A fetch failure can surface as a critical finding.

### TLS / certificate

Checks certificate authorization, validity window (fails if expired or fewer than 14 days left), and HTTP→HTTPS redirect behavior. Untrusted or missing certificates are critical.

### DNSSEC

Uses DNS-over-HTTPS (Cloudflare) to evaluate whether the relevant zone is signed, whether owner data carries RRSIG evidence, and how authenticated data (AD) looks end-to-end. Signed CNAMEs that point off-zone into unsigned CDNs are treated as an expected pattern rather than a hard fail when the signed side is sound.

### DNS hygiene

Looks for SPF and DMARC TXT records and CAA issuance constraints. Missing SPF/DMARC are medium; missing CAA is low.

### SEO / social

Parses homepage HTML for title and meta description length bands, Open Graph (`og:image`, `og:url`, `og:type`, title/description), Twitter card tags, and `rel=canonical`. Absolute HTTPS `og:image` is weighted more heavily than secondary social tags. `noindex` is noted but does not fail by default.

### Is Agentic

Two modes:

1. **Official report** (Is Agentic public report API returns JSON): import score and issues. Mapped failures use severity by issue tier (`essential` → high, `recommended` → medium; partial results are softer). An official score of **≥ 70** is treated as a passing “Is Agentic score” finding.
2. **No stored report** (API 404): emit a **required** medium failure for the missing report (UI shows an orange “Start Is Agentic scan” action), plus **local probes** for `llms.txt`, `robots.txt`, `sitemap.xml`, Markdown `Accept` negotiation, JSON-LD, and `is-agentic-site-type`.

The public Is Agentic API never starts a scan; Web Advisor only reads a stored report or runs local probes.

## Interpreting grades

| Grade band | Practical reading |
|------------|-------------------|
| A+ / A | Strong posture across weighted categories |
| B | Solid baseline with room to harden |
| C | Notable gaps; prioritize failed high/medium findings |
| D / E | Weak posture or capped by DNSSEC/headers rules |
| F | Severe issues (TLS trust, headers F, or very low weighted score) |

Letter grades are relative to this methodology, not a certification, compliance attestation, or substitute for a penetration test.

## Extension notify threshold

The optional Chrome extension can notify when the **overall** grade is at or below a configured threshold (default **C**). Ordering used for “at or below” is:

`A+` &lt; `A` &lt; `B` &lt; `C` &lt; `D` &lt; `E` &lt; `F`

## Source of truth

| Concern | Location |
|---------|----------|
| Severity penalties, category score, overall weights, overrides | `web/server/utils/grade.ts` |
| Score → letter grade mapping | `web/shared/grade.ts` |
| Per-check pass/fail and severities | `web/server/utils/scanners/*.ts` |
| Scan orchestration | `web/server/api/scan.get.ts` |

If this document and the code disagree, trust the code.
