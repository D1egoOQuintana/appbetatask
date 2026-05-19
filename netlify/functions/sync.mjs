import { getStore } from "@netlify/blobs";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const id = new URL(req.url).searchParams.get('id');
  const store = getStore('plan');

  try {
    if (req.method === 'POST' && !id) {
      const body = await req.text();
      const newId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await store.set(newId, body);
      return new Response(JSON.stringify({ id: newId }), {
        status: 201,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET' && id) {
      const data = await store.get(id);
      if (data === null) return new Response('Not found', { status: 404, headers: CORS });
      return new Response(data, { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      await store.set(id, await req.text());
      return new Response('OK', { headers: CORS });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Bad request', { status: 400, headers: CORS });
};

export const config = { path: '/api/sync' };
