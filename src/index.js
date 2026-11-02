// Thin front door. Static pages come straight from Cloudflare's edge; every /api call is handed to the Portal object.
export { Portal } from './portal.js';

const stub = env => env.PORTAL.get(env.PORTAL.idFromName('main'), { locationHint: 'apac' });

export default {
  fetch(req, env) {
    const p = new URL(req.url).pathname;
    if (!p.startsWith('/api/') && !p.startsWith('/r/')) return env.ASSETS.fetch(req);
    return stub(env).fetch(req);
  },
  // every 5 minutes: keep the live copy fresh and pick up hand-edits in the sheet
  scheduled(event, env, ctx) {
    ctx.waitUntil(stub(env).fetch('https://portal.internal/__refresh', { method: 'POST' }));
  },
};
