// Applies saved accessibility choices before the page paints (no flash). The panel itself lives in core.js.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('elc-a11y') || '{}'), h = document.documentElement;
    if (p.size) h.style.setProperty('--fs', p.size + 'px');
    if (p.hc) h.classList.add('a-hc');
    if (p.links) h.classList.add('a-links');
    if (p.readable) h.classList.add('a-readable');
    if (p.nomotion) h.classList.add('a-nomotion');
  } catch (e) { /* storage blocked: defaults apply */ }
})();
