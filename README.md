# Bardufoss–Senja Ski Touring Risk Dashboard

A daily risk dashboard for ski touring in the Bardufoss–Senja area, Troms, Norway.

**Live data sources:**
- ❄️ [NVE Varsom](https://varsom.no) — avalanche bulletins (Indre Troms + Sør-Troms)
- ⛅ [Open-Meteo](https://open-meteo.com) — current weather + 3-day forecast
- 🗺️ [Kartverket](https://kartverket.no) — Norwegian topo map tiles
- 🏔️ [NVE WMS](https://gis3.nve.no) — slope angle / avalanche terrain overlay
- 🚗 [Statens Vegvesen](https://vegvesen.no) — road status links

---

## Deploy to Cloudflare Pages (free)

### 1. Fork / push this repo to GitHub

### 2. Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Select this repository
4. Set build config:
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
5. Click **Save and Deploy**

Cloudflare Pages automatically deploys the `functions/` folder as serverless functions — no separate Worker setup needed.

Your dashboard will be live at:
`https://YOUR-PROJECT.pages.dev`

### 3. Custom domain (optional)

In Cloudflare Pages → Custom domains → add your domain.

---

## Project structure

```
ski-dashboard/
├── public/
│   └── index.html          ← The dashboard (served as the website)
├── functions/
│   └── [[path]].js         ← CORS proxy (auto-deployed as Pages Function)
├── _worker-config.toml     ← Pages build config
└── README.md
```

## How the proxy works

The `functions/[[path]].js` catch-all function proxies browser requests to Norwegian APIs that don't support CORS:

| Route | Upstream |
|-------|----------|
| `/varsom/*` | `https://api01.nve.no/hydrology/forecast/avalanche/v6.3.0/*` |
| `/openmeteo/*` | `https://api.open-meteo.com/v1/*` |
| `/yr/*` | `https://api.met.no/weatherapi/*` |

Responses are cached at Cloudflare's edge:
- Varsom bulletins: 30 minutes
- Weather: 10 minutes

## Local development

Open `public/index.html` directly in a browser. Weather (Open-Meteo) will work since it supports CORS. Varsom avalanche data requires the Cloudflare proxy — the dashboard will show the error and link to varsom.no as fallback.

To test the full stack locally:
```bash
npm install -g wrangler
wrangler pages dev public --compatibility-date=2024-01-01
```

---

## Avalanche regions

| Region | ID | Area |
|--------|-----|------|
| Indre Troms | 3009 | Bardufoss, Målselv, Øvre Dividal |
| Sør-Troms | 3010 | Senja, outer coastal terrain |

---

*Data is for planning purposes only. Always make your own evaluation in the field. See [varsom.no](https://varsom.no) for full bulletins.*
