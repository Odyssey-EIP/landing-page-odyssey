// Ody, le guide qui accompagne la visite.
// - [data-ody-guide] : l'Ody unique, en position fixe. Il arrive en volant,
//   puis se pose sur le perchoir le plus en vue et y reste accroché pendant
//   le défilement. Quand un autre perchoir prend la place, il y vole en planant
//   (il avance, puis descend petit à petit).
//   Sans perchoir à l'écran, il attend dans le coin bas droit.
// - [data-ody-perch] : un perchoir. data-ody-fr / data-ody-en : ce qu'il y dit
//   en arrivant ; data-ody-at="center" : posé au milieu plutôt qu'à droite ;
//   data-ody-mood="wave|happy|talk|think" : son humeur à l'arrivée.
// - [data-ody-group] : défilement horizontal ; Ody vole de slide en slide.
// - Clic : un petit dialogue (aller à une section, une blague) ; tous les
//   5 clics, un salto. Échap ferme le dialogue.
// - Regard : il suit la souris (ou regarde autour de lui sur tactile).
// - .modes[data-ody-for] li[data-ody-mood] : il réagit au mode survolé.
// - [data-ody-cheer] : au survol ou au focus du bouton, il s'agite.
// Sans .motion (prefers-reduced-motion), il change de perchoir sans voler et
// sans animation. Le dessin assets/img/ody-front.svg est inséré en ligne pour
// animer ses parties ; s'il ne se charge pas, Ody n'apparaît pas.
(function(){
  var guide = document.querySelector('[data-ody-guide]');
  if (!guide || !window.requestAnimationFrame) return;
  var root = document.documentElement;
  var motion = root.classList.contains('motion');
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var fig = guide.querySelector('.ody-fig');
  var body = guide.querySelector('.ody-body');
  var say = guide.querySelector('[data-ody-say]');
  var menu = guide.querySelector('[data-ody-menu]');
  var img = guide.querySelector('.ody-body > img');
  var MOODS = ['is-wave', 'is-talk', 'is-think', 'is-happy'];

  var LINES = {
    fr: ['Coucou !', 'Krraa !', 'J\'ai les plumes qui frétillent !', 'Encore !', 'Tu me chatouilles !'],
    en: ['Hi there!', 'Squawk!', 'My feathers are tingling!', 'Again!', 'That tickles!']
  };
  var JOKES = {
    fr: ['Pourquoi je voyage léger ? Je n\'emporte que mes plumes.', 'Mon moyen de transport préféré ? L\'aile-ion.', 'Le décalage horaire ? Moi, je dors debout, alors…'],
    en: ['Why do I travel light? I only pack my feathers.', 'Jet lag? I sleep standing up anyway.', 'My favourite airline? My own two wings.']
  };
  function lang(){ return root.lang === 'en' ? 'en' : 'fr'; }
  function pick(list, last){
    var i;
    do { i = Math.floor(Math.random() * list.length); } while (i === last && list.length > 1);
    return i;
  }

  // ---- Dessin ----
  function fail(){ guide.hidden = true; started = false; }
  if (img){
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) { guide.hidden = true; return; }
    img.addEventListener('error', fail);
  }
  if (img && window.fetch){
    fetch(img.getAttribute('src')).then(function(res){ return res.ok ? res.text() : Promise.reject(); }).then(function(text){
      var holder = document.createElement('div');
      holder.innerHTML = text;
      var svg = holder.querySelector('svg');
      if (!svg || !img.parentNode) return;
      svg.setAttribute('class', 'ody-svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      img.replaceWith(svg);
    }).catch(function(){});
  }
  guide.hidden = false;
  guide.style.setProperty('--blink', (-Math.random() * 4).toFixed(2) + 's');

  // ---- Humeurs et petits gestes ----
  var held = false, moodTimer;
  function setMood(mood){
    MOODS.forEach(function(m){ guide.classList.toggle(m, m === mood); });
  }
  function moodFor(mood, ms){
    setMood(mood);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(function(){ if (!held) setMood(null); }, ms);
  }
  function replay(cls){
    if (!motion) return;
    body.classList.remove('is-hop', 'is-spin', 'is-land');
    void body.offsetWidth; // relance l'animation
    body.classList.add(cls);
  }

  // ---- Bulle ----
  var sayTimer;
  function speak(text, ms, announce){
    if (!text) return;
    say.textContent = text;
    // Les répliques automatiques ne sont pas lues ; celles demandées, si.
    if (announce){ say.removeAttribute('aria-hidden'); say.setAttribute('role', 'status'); }
    else { say.setAttribute('aria-hidden', 'true'); say.removeAttribute('role'); }
    placeBubble(say, true);
    say.classList.add('is-on');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(hush, ms || 3800);
  }
  function hush(){ say.classList.remove('is-on'); }

  // La bulle se met du côté où elle ne couvre pas de texte : à gauche, à
  // droite, puis au-dessus d'Ody ; à défaut, du premier côté qui tient à l'écran.
  var SIDES = [['is-left'], ['is-right'], ['is-up'], ['is-right', 'is-low'], ['is-left', 'is-low']];
  function placeBubble(el, avoidText){
    var vw = window.innerWidth, vh = window.innerHeight;
    var scope = (current && current !== 'dock' && current.closest('section, header, footer')) || document.body;
    var fallback = null;
    for (var i = 0; i < SIDES.length; i++){
      setSide(SIDES[i]);
      var r = el.getBoundingClientRect();
      if (r.left < 4 || r.right > vw - 4 || r.top < 64 || r.bottom > vh - 4) continue;
      if (!fallback) fallback = SIDES[i];
      if (!avoidText) return;
      var boxes = textBoxes(scope, r.top, r.bottom), hit = false;
      for (var j = 0; j < boxes.length && !hit; j++){
        hit = boxes[j].right > r.left && boxes[j].left < r.right;
      }
      if (!hit) return;
    }
    setSide(fallback || SIDES[0]);
  }
  function setSide(classes){
    ['is-left', 'is-right', 'is-up', 'is-low'].forEach(function(c){ guide.classList.toggle(c, classes.indexOf(c) !== -1); });
  }

  // ---- Perchoirs ----
  var perches = Array.prototype.slice.call(document.querySelectorAll('[data-ody-perch]'));
  var W = 0, H = 0;
  function measure(){ W = fig.offsetWidth; H = fig.offsetHeight; }

  // Place libre sur un perchoir : Ody part de sa position préférée sur le
  // bord haut (à droite, ou au centre) et glisse le long du bord jusqu'à ne
  // plus couvrir aucune ligne de texte ; si tout est pris, il essaie à côté
  // de l'élément, pieds sur sa dernière ligne. Le résultat (décalage depuis
  // le coin haut gauche, ou null) est gardé un court instant en cache.
  var spots = typeof Map === 'function' ? new Map() : null;
  var range = document.createRange();

  function textBoxes(scope, top, bottom){
    var out = [];
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())){
      if (!n.nodeValue.trim()) continue;
      var parent = n.parentElement;
      if (!parent || guide.contains(parent)) continue;
      var pr = parent.getBoundingClientRect();
      if (pr.bottom <= top || pr.top >= bottom || !pr.width) continue;
      range.selectNodeContents(n);
      var rs = range.getClientRects();
      for (var i = 0; i < rs.length; i++){
        if (rs[i].width && rs[i].bottom > top && rs[i].top < bottom) out.push(rs[i]);
      }
    }
    return out;
  }

  function free(boxes, x, y, bottom){
    var l = x + W * 0.12, rt = x + W * 0.88, t = y + H * 0.08;
    for (var i = 0; i < boxes.length; i++){
      var bx = boxes[i];
      if (bx.right > l && bx.left < rt && bx.bottom > t && bx.top < bottom) return false;
    }
    return true;
  }

  function findSpot(el, r){
    var y = r.top - H + 4;
    var vw = window.innerWidth;
    var at = el.getAttribute('data-ody-at') || '';
    var center = at === 'center';
    var inGroup = !!el.closest('[data-ody-group]');
    var start = center ? r.left + r.width / 2 - W / 2 : r.right - W - Math.min(24, r.width * 0.06);
    var minX = Math.max(8, r.left), maxX = Math.min(vw - W - 8, r.right - W);
    var scope = el.closest('section, header, footer') || document.body;
    // Dedans : debout dans le coin haut droit de l'élément (un panneau)
    if (at === 'inside'){
      var iy = r.top + 12;
      var inner = textBoxes(scope, iy + H * 0.08, iy + H);
      for (var j = 0; j < 12; j++){
        var ix = r.right - W - 16 - j * W * 0.5;
        if (ix < r.left + 8) break;
        if (free(inner, ix, iy, iy + H)) return { dx: ix - r.left, dy: 12 };
      }
      return null;
    }
    var boxes = textBoxes(scope, y + H * 0.08, r.top - 1);
    var step = W * 0.5;
    for (var k = 0; k < 24; k++){
      // à droite : vers la gauche ; au centre : de part et d'autre
      var off = center ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step : -k * step;
      var x = start + off;
      if (x < minX - 1 || x > maxX + 1) { if (!center) break; else continue; }
      if (free(boxes, x, y, r.top - 1)) return { dx: x - r.left, dy: -H + 4 };
    }
    // À côté, à droite de l'élément (jamais entre deux slides)
    var sx = r.right + 14, sy = r.bottom - H;
    if (!inGroup && sx + W <= vw - 8 && sy > 8){
      var side = textBoxes(scope, sy + H * 0.08, r.bottom);
      if (free(side, sx, sy, r.bottom)) return { dx: sx - r.left, dy: r.height - H };
    }
    return null;
  }

  function spotOf(el, r){
    var now = Date.now();
    var c = spots && spots.get(el);
    if (c && now - c.t < 700 && Math.abs(c.w - r.width) < 2) return c.spot;
    var spot = findSpot(el, r);
    if (spots) spots.set(el, { t: now, w: r.width, spot: spot });
    return spot;
  }

  function perchPos(el){
    var r = el.getBoundingClientRect();
    var spot = spotOf(el, r) || { dx: r.width - W, dy: -H + 4 };
    return clampPos(r.left + spot.dx, r.top + spot.dy);
  }
  // Sans perchoir à l'écran : un coin libre de texte (bas droit, bas gauche,
  // haut droit, haut gauche) ; à défaut, il passe la tête depuis le bord droit.
  var dock = { t: 0, x: 0, y: 0 };
  function dockPos(){
    var now = Date.now();
    if (now - dock.t < 700) return dock;
    var vw = window.innerWidth, vh = window.innerHeight;
    var m = vw <= 720 ? 12 : 22, top = 84;
    var corners = [[vw - W - m, vh - H - m], [m, vh - H - m], [vw - W - m, top], [m, top]];
    dock = { t: now, x: vw - W * 0.42, y: vh - H - m };
    for (var i = 0; i < corners.length; i++){
      var x = corners[i][0], y = corners[i][1];
      var under = document.elementsFromPoint ? document.elementsFromPoint(x + W / 2, y + H / 2) : [];
      var host = null;
      for (var j = 0; j < under.length; j++){
        if (!guide.contains(under[j])){ host = under[j].closest('section, header, footer, main'); break; }
      }
      if (free(textBoxes(host || document.body, y, y + H), x, y, y + H)){ dock = { t: now, x: x, y: y }; break; }
    }
    return dock;
  }
  function clampPos(x, y){
    return {
      x: Math.max(8, Math.min(window.innerWidth - W - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - H - 8, y))
    };
  }

  // Le perchoir le plus en vue : son bord haut dans la bande centrale de
  // l'écran et le plus proche d'un point de mire ; on garde l'actuel tant
  // qu'un autre n'est pas nettement mieux placé.
  function choose(){
    var vw = window.innerWidth, vh = window.innerHeight;
    var ranked = [];
    perches.forEach(function(el){
      var r = el.getBoundingClientRect();
      if (!r.width || r.top < vh * 0.14 || r.top > vh * 0.84) return;
      if (r.right < W || r.left > vw - W) return;
      var px = el.getAttribute('data-ody-at') === 'center' ? r.left + r.width / 2 : r.right - W / 2;
      if (px < 0 || px > vw) return;
      ranked.push({ el: el, r: r, score: Math.abs(r.top - vh * 0.45) + Math.abs(px - vw * 0.55) * 0.7 });
    });
    ranked.sort(function(a, b){ return a.score - b.score; });
    var curScore = Infinity, best = null;
    for (var i = 0; i < ranked.length; i++){
      if (spotOf(ranked[i].el, ranked[i].r) === null) continue;
      if (!best) best = ranked[i];
      if (ranked[i].el === current){ curScore = ranked[i].score; break; }
    }
    if (!best) return 'dock';
    if (best.el !== current && curScore < Infinity && best.score > curScore - 70) return current;
    return best.el;
  }

  // ---- Vol ----
  // Point de départ : hors de l'écran, en haut à gauche ; il traverse
  // ensuite vers la droite en descendant petit à petit.
  var pos = { x: -200, y: Math.max(70, window.innerHeight * 0.1) };
  var current = null, flight = null, started = false, lastChoice = 0;
  var said = typeof Map === 'function' ? new Map() : null;
  measure();
  pos.x = -W - 60;
  place(pos.x, pos.y);

  function targetOf(p){ return p === 'dock' ? dockPos() : perchPos(p); }
  // Vol plané : il avance vite (sortie douce en x) et descend petit à
  // petit (entrée douce en y), avec de petits battements d'ailes.
  function easeX(t){ return 1 - Math.pow(1 - t, 2.2); }
  function easeY(t){ return t * t * (3 - 2 * t) * 0.35 + t * t * 0.65; }

  function takeOff(next, now, duration){
    current = next;
    if (!motion){ land(); return; }
    var t = targetOf(next);
    var dx = t.x - pos.x, dy = t.y - pos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 6){ land(); return; }
    flight = { x0: pos.x, y0: pos.y, t0: now, d: duration || Math.max(650, Math.min(1500, dist * 1.3)), bob: Math.min(12, 3 + dist * 0.015), beats: Math.max(2, Math.round(dist / 160)) };
    guide.classList.add('is-flying');
    guide.style.setProperty('--tilt', (Math.max(-1, Math.min(1, dx / 300)) * 14).toFixed(1) + 'deg');
    guide.style.setProperty('--lx', dx > 0 ? '1' : '-1');
    guide.style.setProperty('--ly', '0');
    hush();
  }

  function land(){
    flight = null;
    guide.classList.remove('is-flying');
    guide.style.setProperty('--tilt', '0deg');
    if (current === 'dock' || !current) return;
    replay('is-land');
    var text = current.getAttribute('data-ody-' + lang());
    var mood = current.getAttribute('data-ody-mood');
    var last = said ? said.get(current) : 0;
    var now = Date.now();
    if (text && menu.hidden && (!last || now - last > 30000)){
      if (said) said.set(current, now);
      setTimeout(function(){ speak(text, 3600 + text.length * 25); }, motion ? 180 : 0);
      moodFor(mood ? 'is-' + mood : 'is-talk', mood ? 1600 : 1100);
    }
  }

  function place(x, y){
    pos.x = x; pos.y = y;
    guide.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }

  function frame(now){
    if (started && !document.hidden){
      if (!W) measure();
      if (now - lastChoice > 120 || current === null){
        lastChoice = now;
        var next = choose();
        if (next !== current) takeOff(next, now, current === null ? 2600 : 0);
      }
      var t = targetOf(current);
      if (flight){
        var k = Math.min(1, (now - flight.t0) / flight.d);
        var bob = Math.sin(k * Math.PI * 2 * flight.beats) * flight.bob * (1 - k);
        place(flight.x0 + (t.x - flight.x0) * easeX(k), flight.y0 + (t.y - flight.y0) * easeY(k) - bob);
        if (k >= 1) land();
      } else {
        place(t.x, t.y);
      }
    }
    requestAnimationFrame(frame);
  }

  // Arrivée en volant, une fois le hero dévoilé ; il salue sur son perchoir.
  function start(){
    if (started || guide.hidden) return;
    measure();
    place(pos.x, pos.y);
    started = true;
    guide.classList.add('is-ready');
  }
  window.addEventListener('resize', function(){ measure(); if (spots) spots.clear(); });
  requestAnimationFrame(frame);
  if (motion) setTimeout(start, 1100);
  else start();

  // ---- Regard ----
  function look(x, y){
    var dx = (x - (pos.x + W / 2)) / 260;
    var dy = (y - (pos.y + H * 0.4)) / 260;
    guide.style.setProperty('--lx', Math.max(-1, Math.min(1, dx)).toFixed(3));
    guide.style.setProperty('--ly', Math.max(-1, Math.min(1, dy)).toFixed(3));
  }
  if (motion && mouse){
    var mx = 0, my = 0, queued = false;
    window.addEventListener('pointermove', function(e){
      mx = e.clientX; my = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function(){
        queued = false;
        if (!flight) look(mx, my);
      });
    }, { passive: true });
  }

  // De temps en temps, Ody salue ou bavarde tout seul ; sur tactile, il
  // regarde aussi autour de lui.
  if (motion){
    setTimeout(function tick(){
      if (started && !flight && !held && menu.hidden && !document.hidden){
        var r = Math.random();
        if (r < 0.35) moodFor('is-wave', 1300);
        else if (r < 0.55) moodFor('is-talk', 900);
        else if (r < 0.65) replay('is-hop');
        if (!mouse){
          guide.style.setProperty('--lx', (Math.random() * 1.6 - 0.8).toFixed(2));
          guide.style.setProperty('--ly', (Math.random() * 1.0 - 0.4).toFixed(2));
        }
      }
      setTimeout(tick, 4200 + Math.random() * 5200);
    }, 6000);
  }

  // ---- Dialogue ----
  var clicks = 0, lastLine = -1, lastJoke = -1, openedAt = 0;
  function openMenu(byKeyboard){
    hush();
    menu.hidden = false;
    guide.classList.add('is-menu');
    fig.setAttribute('aria-expanded', 'true');
    openedAt = window.scrollY;
    placeBubble(menu, false);
    replay('is-hop');
    var first = menu.querySelector('button');
    if (byKeyboard && first) first.focus();
  }
  function closeMenu(refocus){
    if (menu.hidden) return;
    menu.hidden = true;
    guide.classList.remove('is-menu');
    fig.setAttribute('aria-expanded', 'false');
    if (refocus) fig.focus();
  }

  fig.addEventListener('click', function(e){
    clicks++;
    if (clicks % 5 === 0){
      closeMenu();
      replay('is-spin');
      moodFor('is-happy', 1100);
      speak(lang() === 'en' ? 'Wheee!' : 'Youhou !', 1600);
      return;
    }
    if (menu.hidden) openMenu(e.detail === 0);
    else {
      closeMenu();
      lastLine = pick(LINES[lang()], lastLine);
      replay('is-hop');
      moodFor('is-happy', 900);
      speak(LINES[lang()][lastLine], 1800);
    }
  });

  menu.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-ody-joke')){
      closeMenu(e.detail === 0);
      lastJoke = pick(JOKES[lang()], lastJoke);
      moodFor('is-talk', 1400);
      speak(JOKES[lang()][lastJoke], 5200, true);
      return;
    }
    var target = document.querySelector(btn.getAttribute('data-ody-go'));
    closeMenu(false);
    if (target){
      moodFor('is-happy', 900);
      target.scrollIntoView();
      if (e.detail === 0){ target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !menu.hidden) closeMenu(true);
  });
  document.addEventListener('pointerdown', function(e){
    if (!menu.hidden && !guide.contains(e.target)) closeMenu(false);
  });
  window.addEventListener('scroll', function(){
    if (!menu.hidden && Math.abs(window.scrollY - openedAt) > 120) closeMenu(false);
  }, { passive: true });

  // Le dialogue suit la langue choisie (site.js réécrit les data-fr / data-en).
  document.addEventListener('odyssey:lang', hush);

  // ---- Les trois modes ----
  var list = document.querySelector('.modes[data-ody-for]');
  if (list){
    var items = Array.prototype.slice.call(list.querySelectorAll('li[data-ody-mood]'));
    items.forEach(function(li){
      li.addEventListener('mouseenter', function(){
        items.forEach(function(it){ it.classList.toggle('is-ody', it === li); });
        held = true;
        setMood('is-' + li.getAttribute('data-ody-mood'));
        replay('is-hop');
      });
    });
    list.addEventListener('mouseleave', function(){
      items.forEach(function(it){ it.classList.remove('is-ody'); });
      held = false;
      setMood(null);
    });
  }

  // ---- Bouton de la bêta ----
  var cheer = document.querySelector('[data-ody-cheer]');
  if (cheer){
    var on = function(){ held = true; setMood('is-happy'); };
    var off = function(){ held = false; setMood(null); };
    cheer.addEventListener('pointerenter', on);
    cheer.addEventListener('pointerleave', off);
    cheer.addEventListener('focus', on);
    cheer.addEventListener('blur', off);
  }
})();
