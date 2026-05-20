const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash env vars not configured');
  }
  const r = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error('Upstash request failed');
  return r.json();
}

function setCors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

function randomId() {
  const bytes = new Uint8Array(8);
  (globalThis.crypto || require('crypto').webcrypto).getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const id = req.query && req.query.id ? String(req.query.id) : null;
  const key = id ? `plan:${id}` : null;

  try {
    if (req.method === 'POST' && !id) {
      const newId = randomId();
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      await redis(['SET', `plan:${newId}`, body]);
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ id: newId }));
    }

    if (req.method === 'GET' && id) {
      const result = await redis(['GET', key]);
      if (!result || result.result == null) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(result.result);
    }

    if (req.method === 'PUT' && id) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      await redis(['SET', key, body]);
      return res.end('OK');
    }
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: e.message }));
  }

  res.statusCode = 400;
  return res.end('Bad request');
};
