'use strict';
// ---- router for the public site + college + officer workspaces ----
async function detectMe() {
  try { const w = await api('/api/whoami'); ME.kind = (w.kind === 'college' || w.kind === 'officer') ? w.kind : null; ME.name = ME.kind ? w.name : ''; }
  catch { ME.kind = null; ME.name = ''; }
}
const TITLES = { '': 'SWEEP Kozhikode · Electoral Literacy Clubs', board: 'Display board', login: 'Sign in', me: 'College workspace', officer: 'Village officer workspace', ack: 'Village certification' };

async function route() {
  const [seg, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  clearInterval(boardTimer);
  window.scrollTo(0, 0);
  document.title = (TITLES[seg || ''] || TITLES['']) + (seg ? ' · SWEEP Kozhikode' : '');
  if (seg === 'ack') return renderAck(a);
  if (seg === 'officer-login') return renderLogin('officer');
  if (seg === 'login') return ME.kind ? (location.hash = ME.kind === 'college' ? '#/me' : '#/officer') : renderLogin(a || 'college');
  if (seg === 'me') return ME.kind === 'college' ? renderCollege(a || 'home') : (location.hash = '#/login/college');
  if (seg === 'officer') return ME.kind === 'officer' ? renderOfficer(a || 'today') : (location.hash = '#/login/officer');
  if (seg === 'board') return renderBoard();
  return renderHome();
}
actions.signout = async () => {
  await api(ME.kind === 'college' ? '/api/auth/college/logout' : '/api/auth/officer/logout', 'POST');
  ME.kind = null; location.hash = '#/'; toast('Signed out'); announce('You have signed out');
};

(async () => {
  setUnauth(() => { ME.kind = null; location.hash = '#/login'; toast('Your session ended. Please sign in again.', true); });
  await detectMe();
  window.addEventListener('hashchange', route);
  route();
})();
