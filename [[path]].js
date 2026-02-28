/**
 * Cloudflare Pages Function — CORS Proxy
 * Catch-all route: handles /varsom/*, /openmeteo/*, /yr/*
 *
 * This file lives in /functions/[[path]].js
 * Cloudflare Pages automatically deploys it as a serverless function.
 */

const UPSTREAM = {
  varsom:    'https://api01.nve.no/hydrology/forecast/avalanche/v6.3.0',
  openmeteo: 'https://api.open-meteo.com/v1',
  yr:        'https://api.met.no/weatherapi',
};

const CACHE_TTL = {
  varsom:    1800,  // 30 min — bulletins update once/day
  openmeteo: 600,   // 10 min
  yr:        600,   // 10 min
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age':       '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function onRequest({ request, params }) {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Parse the path: /varsom/api/... → service=varsom, rest=api/...
  const pathParts = (params.path || []);
  const service   = pathParts[0];
  const rest      = pathParts.slice(1).join('/');

  // Health check at root
  if (!service) {
    return json({
      status:    'ok',
      service:   'Bardufoss–Senja Ski Dashboard Proxy',
      routes:    Object.keys(UPSTREAM),
      timestamp: new Date().toISOString(),
    });
  }

  const base = UPSTREAM[service];
  if (!base) {
    return json({ error: `Unknown service: ${service}`, available: Object.keys(UPSTREAM) }, 404);
  }

  // Reconstruct the upstream URL including query string
  const incomingUrl = new URL(request.url);
  const upstream    = `${base}/${rest}${incomingUrl.search}`;
  const ttl         = CACHE_TTL[service] || 600;

  try {
    const upstreamRes = await fetch(upstream, {
      method:  'GET',
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'SkiTouringDashboard/1.0 (+https://github.com)',
      },
      cf: { cacheTtl: ttl, cacheEverything: true },
    });

    const body    = await upstreamRes.arrayBuffer();
    const headers = new Headers(upstreamRes.headers);

    // Apply CORS + cache headers
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
    headers.set('Cache-Control', `public, max-age=${ttl}`);
    headers.set('X-Proxied-From', upstream);
    headers.set('X-Service', service);

    return new Response(body, { status: upstreamRes.status, headers });

  } catch (err) {
    return json({
      error:    'Upstream fetch failed',
      service,
      upstream,
      message:  err.message,
    }, 502);
  }
}
