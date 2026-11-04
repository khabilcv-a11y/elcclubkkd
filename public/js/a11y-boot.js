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

// the Inter font stylesheet is loaded without holding up the first screen: it starts as a print stylesheet and is switched on once it has arrived
(function () { var l = document.getElementById('gfonts'); if (!l) return; function on() { l.media = 'all'; } l.addEventListener('load', on); if (l.sheet) on(); setTimeout(on, 4000); })();
