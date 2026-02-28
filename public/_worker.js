/**
 * _worker.js — Cloudflare Pages Advanced Mode Worker
 *
 * When placed in the `public/` folder, this file takes over ALL request
 * handling for the Pages project. It:
 *   1. Serves /varsom/*, /openmeteo/*, /yr/* as CORS proxy routes
 *   2. Serves everything else (i.e. /) as static assets via env.ASSETS
 */

const UPSTREAM = {
  varsom:    'https://api01.nve.no/hydrology/forecast/avalanche/v6.3.0',
  openmeteo: 'https://api.open-meteo.com/v1',
  yr:        'https://api.met.no/weatherapi',
};

const CACHE_TTL = {
  varsom:    1800,
  openmeteo: 600,
  yr:        600,
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age':       '86400',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const parts  = url.pathname.replace(/^\//, '').split('/');
    const service = parts[0];

    // ── CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Proxy routes: /varsom/*, /openmeteo/*, /yr/*
    if (UPSTREAM[service]) {
      const rest     = parts.slice(1).join('/');
      const upstream = `${UPSTREAM[service]}/${rest}${url.search}`;
      const ttl      = CACHE_TTL[service] || 600;

      try {
        const res  = await fetch(upstream, {
          headers: {
            'Accept':     'application/json',
            'User-Agent': 'SkiTouringDashboard/1.0',
          },
          cf: { cacheTtl: ttl, cacheEverything: true },
        });

        const body    = await res.arrayBuffer();
        const headers = new Headers(res.headers);
        Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
        headers.set('Cache-Control', `public, max-age=${ttl}`);
        headers.set('X-Proxied-From', upstream);

        return new Response(body, { status: res.status, headers });

      } catch (err) {
        return jsonResponse({ error: 'Upstream failed', message: err.message }, 502);
      }
    }

    // ── Everything else → serve static assets (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
