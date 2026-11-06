'use strict';
// ---- Quiz sounds and reading aloud ----
// All sounds are made in the browser (Web Audio), so nothing is downloaded and nothing costs anything. Reading aloud uses the voice already on the
// phone or computer (speechSynthesis). Phones start silent (a classroom of phones all chiming would be chaos) and each student can switch sounds on;
// the host's screen starts with sound and music on. Both choices are remembered on that device.
const QS = (() => {
  const get = k => { try { return localStorage.getItem(k); } catch { return null; } }, set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* the choice just is not remembered */ } };
  let ctx = null, master = null, where = 'phone', mus = null;
  const flag = (k, d) => { const v = get(k); return v === null ? d : v === '1'; };
  const st = { snd: { phone: flag('elcq:snd', false), host: flag('elcq:snd:host', true) }, mus: flag('elcq:mus', true), read: { phone: flag('elcq:read', false), host: flag('elcq:read:host', false) } };
  const audio = () => {
    try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (!master) { master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination); } if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch { return null; }
  };
  // one note: frequency, start (s from now), length, shape, loudness, optional slide to another frequency
  function note(f, t0, d, { type = 'sine', vol = .2, to = 0, at = .008, out = master } = {}) {
    const c = audio(); if (!c) return; const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + d + .05);
  }
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, B5: 987.8, C6: 1046.5, E6: 1318.5 };
  const arp = (list, gap, o) => list.forEach((f, i) => note(f, i * gap, o.d || .3, o));
  const SOUNDS = {
    join: () => { note(N.E5, 0, .12, { type: 'triangle', vol: .16 }); note(N.A5, .09, .18, { type: 'triangle', vol: .16 }); },                  // someone joined the quiz
    start: () => { arp([N.C5, N.E5, N.G5, N.C6], .09, { type: 'triangle', vol: .2, d: .35 }); note(N.C4, 0, .6, { type: 'sine', vol: .25 }); },       // the quiz begins
    question: () => { note(N.G5, 0, .22, { type: 'sine', vol: .2 }); note(N.C6, .14, .4, { type: 'sine', vol: .2 }); note(N.E6, .14, .4, { type: 'sine', vol: .06 }); },   // a new question
    pick: () => note(720, 0, .07, { type: 'triangle', vol: .14, to: 960 }),                                                                       // an answer chosen
    tick: () => note(1100, 0, .05, { type: 'square', vol: .06 }),                                                                                  // seconds running out
    urgent: () => { note(1500, 0, .06, { type: 'square', vol: .08 }); },
    hint: () => { note(N.E6, 0, .16, { type: 'sine', vol: .12 }); note(N.C6, .17, .26, { type: 'sine', vol: .1 }); },                               // a gentle heads-up (one minute left)
    timeup: () => { note(190, 0, .5, { type: 'sawtooth', vol: .16, to: 110 }); note(150, .28, .6, { type: 'sawtooth', vol: .14, to: 80 }); },       // time is up
    answer: () => { for (let i = 0; i < 6; i++) note(180 + i * 12, i * .05, .06, { type: 'triangle', vol: .12 }); arp([N.G4, N.C5, N.E5], .1, { type: 'triangle', vol: .17, d: .3 }); },   // the answer is shown
    correct: () => arp([N.C5, N.E5, N.G5, N.C6], .08, { type: 'triangle', vol: .2, d: .32 }),
    wrong: () => { note(330, 0, .22, { type: 'triangle', vol: .17, to: 280 }); note(247, .2, .38, { type: 'triangle', vol: .17, to: 190 }); },
    results: () => {                                                                                                                              // the winners
      arp([N.C5, N.C5, N.C5, N.G5, N.E5, N.G5, N.C6], .13, { type: 'triangle', vol: .2, d: .28 });
      [N.C5, N.E5, N.G5, N.C6].forEach(f => note(f, .95, 1.3, { type: 'sine', vol: .12 })); note(N.C4, .95, 1.4, { type: 'sine', vol: .22 });
    },
    win: () => arp([N.G4, N.C5, N.E5, N.G5], .1, { type: 'triangle', vol: .18, d: .4 }),                                                           // a softer jingle for the end of a phone quiz
  };
  // soft background music for the host's screen: a calm loop while students join, a steady pulse while they think. It stops by itself when the sound is switched off.
  const TUNES = {
    lobby: { bpm: 96, bars: [[N.C5, N.E5, N.G5, N.E5, N.C5, N.E5, N.G5, N.E5], [N.A4, N.C5, N.F5, N.C5, N.A4, N.C5, N.F5, N.C5]], bass: [N.C4 / 2, N.F4 / 2], vol: .045 },
    think: { bpm: 112, bars: [[N.A4, N.E5, N.A4, N.E5, N.A4, N.E5, N.A4, N.E5], [N.G4, N.D5, N.G4, N.D5, N.G4, N.D5, N.G4, N.D5]], bass: [N.A4 / 4, N.G4 / 4], vol: .04 },
  };
  function stopMusic() { if (mus) { clearInterval(mus.timer); mus = null; } }
  function playMusic(name) {
    if (!name) return stopMusic(); if (mus?.name === name) return; stopMusic();
    if (!(st.snd[where] && st.mus) || !audio()) return;
    const tune = TUNES[name], beat = 60 / tune.bpm, bar = beat * 4; let n = 0; mus = { name };
    const bars = () => {
      const b = n++ % tune.bars.length, e = tune.bars[b];
      e.forEach((f, i) => note(f, i * beat / 2, beat * .9, { type: 'sine', vol: tune.vol }));
      note(tune.bass[b], 0, bar * .95, { type: 'triangle', vol: tune.vol * 1.4 });
    };
    bars(); mus.timer = setInterval(bars, bar * 1000);
  }
  const speech = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  return {
    get canSpeak() { return speech; },
    use(w) { where = w; },                                                         // 'phone' or 'host'
    get where() { return where; },
    get sound() { return st.snd[where]; },
    get music() { return st.mus; },
    get read() { return st.read[where]; },
    unlock() { audio(); },
    play(name) { if (!st.snd[where] || !SOUNDS[name]) return; if (!audio()) return; try { SOUNDS[name](); } catch { /* a sound is never worth an error */ } },
    music_(name) { playMusic(name); },
    setSound(on) { st.snd[where] = !!on; set(where === 'host' ? 'elcq:snd:host' : 'elcq:snd', on ? '1' : '0'); if (on) { audio(); this.play('pick'); } else stopMusic(); },
    setMusic(on) { st.mus = !!on; set('elcq:mus', on ? '1' : '0'); if (!on) stopMusic(); },
    setRead(on) { st.read[where] = !!on; set(where === 'host' ? 'elcq:read:host' : 'elcq:read', on ? '1' : '0'); if (!on) this.hush(); },
    // reading aloud with the voice of the device: Malayalam text in a Malayalam voice if there is one, otherwise English (India)
    say(text) {
      if (!speech || !text) return false; this.hush();
      const u = new SpeechSynthesisUtterance(String(text)), lang = /[ഀ-ൿ]/.test(text) ? 'ml-IN' : 'en-IN';
      u.lang = lang; u.rate = .95; const v = speechSynthesis.getVoices(), pick = v.find(x => x.lang === lang) || v.find(x => x.lang.startsWith(lang.slice(0, 2)) && /IN/.test(x.lang)) || v.find(x => x.lang.startsWith(lang.slice(0, 2)));
      if (pick) u.voice = pick; speechSynthesis.speak(u); return true;
    },
    hush() { if (speech) try { speechSynthesis.cancel(); } catch { /* nothing is being read */ } },
  };
})();

// the question and its four answers as one sentence for the voice
const qsQuestionText = (no, text, opts) => `${no ? 'Question ' + no + '. ' : ''}${text}. ${opts.map((t, k) => 'Option ' + 'ABCD'[k] + ': ' + t + '.').join(' ')}`;

// ---- the small buttons (the same markup on a phone and on the host's screen) ----
const qsBtn = (host = false) => {
  const on = QS.sound, ic = icon(on ? 'volume' : 'mute');
  return `<button class="qs-btn ${on ? 'on' : ''}" data-act="qsSound" aria-pressed="${on}" aria-label="${on ? 'Switch the quiz sounds off' : 'Switch the quiz sounds on'}" title="${on ? 'Sounds on' : 'Sounds off'}">${ic.s || ic}<span>${on ? 'Sound on' : 'Sound off'}</span></button>${host ? `<button class="qs-btn ${QS.music && on ? 'on' : ''}" data-act="qsMusic" aria-pressed="${QS.music}" aria-label="${QS.music ? 'Switch the music off' : 'Switch the music on'}" title="Background music">${(icon('music').s || icon('music'))}<span>Music ${QS.music ? 'on' : 'off'}</span></button>` : ''}`;
};
// the read-aloud tools: read now, and read each new question by itself
const qsReadBar = () => QS.canSpeak ? `<div class="qs-read"><button class="qs-btn" data-act="qsReadNow" aria-label="Read the question and answers aloud" title="Read aloud">${(icon('speaker').s || icon('speaker'))}<span>Read aloud</span></button><label class="qs-auto"><input type="checkbox" data-act="qsAuto" ${QS.read ? 'checked' : ''}> Read each question automatically</label></div>` : '';
document.addEventListener('click', e => { QS.unlock(); const b = e.target.closest('[data-act="qsSound"],[data-act="qsMusic"],[data-act="qsReadNow"]'); if (!b) return; const a = b.dataset.act;
  if (a === 'qsSound') { QS.setSound(!QS.sound); qsRefresh(); window.dispatchEvent(new Event('qs:music')); } else if (a === 'qsMusic') { QS.setMusic(!QS.music); qsRefresh(); window.dispatchEvent(new Event('qs:music')); } else qsReadCurrent(); });
document.addEventListener('change', e => { if (e.target.matches?.('[data-act="qsAuto"]')) { QS.setRead(e.target.checked); if (e.target.checked) qsReadCurrent(); } });
// the sound buttons on the screen change in place, so nothing on the page is redrawn
function qsRefresh() { document.querySelectorAll('.qs-btn[data-act="qsSound"],.qs-btn[data-act="qsMusic"]').forEach(b => { const m = b.dataset.act === 'qsMusic', on = m ? QS.music : QS.sound; b.classList.toggle('on', on && (m ? QS.sound : true)); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = m ? 'Music ' + (on ? 'on' : 'off') : (on ? 'Sound on' : 'Sound off'); if (!m) { const ic = icon(on ? 'volume' : 'mute'); b.querySelector('svg').outerHTML = ic.s || ic; } }); }
// what "Read aloud" reads: the page that is showing sets this
let qsCurrent = () => '';
function qsReadCurrent() { const t = qsCurrent(); if (t) QS.say(t); }
