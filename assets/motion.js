// Mouvement de la page d'accueil, sans bibliothèque :
// - titres qui montent mot par mot, blocs qui apparaissent au défilement ;
// - parallaxe des photos ; éventail de sept téléphones, épinglé, qui
//   s'ouvre l'un après l'autre puis prend de la profondeur ;
// - bandeau de destinations qui glisse, piste « Comment ça marche »
//   épinglée et déroulée à l'horizontale pendant le défilement ;
// - rangée du récap qui défile à l'horizontale : pendant qu'elle est à
//   l'écran sur grand écran, épinglée comme la piste sur petit écran ;
// - carte « Pendant le voyage », épinglée : le voyageur suit le plan,
//   s'en écarte, reçoit des propositions et en choisit une.
// Les mêmes effets tournent sur téléphone, avec des mises en page resserrées
// (site.css). Si l'utilisateur demande à réduire les animations, seule la
// navigation reste dynamique et les rangées se font glisser au doigt.
(function(){
  var root = document.documentElement;
  var motion = root.classList.contains('motion');

  function clamp(v){ return Math.max(0, Math.min(1, v)); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  // ---------- Titres découpés en mots ----------
  function splitLeaf(leaf, counter){
    if (leaf.querySelector('.w')) return;
    // Espaces ordinaires seulement : l'espace insécable reste dans le mot (« programme ? »).
    var words = leaf.textContent.split(/[ \t\r\n]+/).filter(Boolean);
    leaf.textContent = '';
    words.forEach(function(word, k){
      var w = document.createElement('span');
      var inner = document.createElement('span');
      w.className = 'w';
      inner.textContent = word;
      inner.style.setProperty('--i', counter.i++);
      w.appendChild(inner);
      leaf.appendChild(w);
      if (k < words.length - 1) leaf.appendChild(document.createTextNode(' '));
    });
  }
  function splitAll(){
    if (!motion) return;
    document.querySelectorAll('.split').forEach(function(el){
      var counter = { i: 0 };
      el.querySelectorAll('[data-fr]').forEach(function(leaf){ splitLeaf(leaf, counter); });
    });
  }
  splitAll();
  // site.js réécrit les textes à chaque changement de langue
  document.addEventListener('odyssey:lang', splitAll);

  // ---------- Apparitions au défilement ----------
  var hero = document.querySelector('[data-hero]');
  if (motion && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    document.querySelectorAll('.reveal, .split, .clip, .line-in').forEach(function(el){
      if (!hero || !hero.contains(el)) io.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal, .split, .clip, .line-in').forEach(function(el){ el.classList.add('is-in'); });
  }

  // Le hero se dévoile au chargement, une fois les polices prêtes
  // (sinon le découpage en mots saute quand la police arrive).
  function showHero(){
    if (!hero) return;
    hero.classList.add('is-in');
    hero.querySelectorAll('.split').forEach(function(el){ el.classList.add('is-in'); });
  }
  if (motion && document.fonts && document.fonts.ready){
    var shown = false;
    var once = function(){ if (!shown){ shown = true; requestAnimationFrame(showHero); } };
    document.fonts.ready.then(once);
    setTimeout(once, 900);
  } else {
    showHero();
  }

  // ---------- Éléments pilotés par le défilement ----------
  var nav = document.querySelector('[data-nav]');
  var heroMedia = document.querySelector('[data-hero-media]');
  var heroBody = document.querySelector('[data-hero-body]');
  var stage = document.querySelector('[data-stage]');
  var band = document.querySelector('[data-band]');
  var parallax = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var how = document.querySelector('[data-how]');
  var howSticky = how && how.querySelector('.how-sticky');
  var track = how && how.querySelector('[data-track]');
  var count = how && how.querySelector('[data-how-count]');
  var bar = how && how.querySelector('[data-how-bar]');
  var panels = track ? track.children.length : 0;
  var pinned = false, dist = 0, lastY = window.scrollY, ticking = false;
  var slide = document.querySelector('[data-slide]');
  var slideSticky = slide && slide.querySelector('[data-slide-sticky]');
  var slideTrack = slide && slide.querySelector('[data-slide-track]');
  var linked = false, slidePinned = false, slideDist = 0;

  // Les scènes épinglées font 100svh : leur hauteur ne bouge pas quand la
  // barre du navigateur mobile apparaît ou disparaît. La progression se
  // calcule sur cette hauteur plutôt que sur innerHeight, qui, elle, varie.
  function pinProgress(box, sticky){
    return clamp(-box.getBoundingClientRect().top / Math.max(1, box.offsetHeight - sticky.offsetHeight));
  }

  // ---------- Éventail du projet ----------
  // p (0 → 1) : les téléphones quittent la pile, du centre vers les bords
  // (FAN premiers pourcents), puis la profondeur s'installe et la photo
  // s'approche. Épinglé dès que le mouvement est permis.
  var stagePin = document.querySelector('[data-stage-pin]');
  var stagePhones = stage && stage.querySelector('.phones');
  var stagePhoto = stage && stage.querySelector('[data-stage-photo]');
  var slots = stage ? Array.prototype.slice.call(stage.querySelectorAll('[data-slot]')) : [];
  var stagePinned = false, stageLast = -1;
  var FAN = 0.62, STAGGER = 0.13;

  function easeOut(k){ return 1 - (1 - k) * (1 - k) * (1 - k); }

  function renderStage(p){
    p = Math.round(p * 1000) / 1000;
    if (p === stageLast) return;
    stageLast = p;
    var f = clamp(p / FAN), span = 1 - 3 * STAGGER, mid = (slots.length - 1) / 2;
    slots.forEach(function(s, n){
      var a = Math.abs(n - mid);
      s.style.setProperty('--k', easeOut(clamp((f - a * STAGGER) / span)).toFixed(4));
    });
    var d = smooth(clamp((p - FAN) / (1 - FAN)));
    stagePhones.style.setProperty('--d', d.toFixed(4));
    stagePhoto.style.transform = 'scale(' + (1 + 0.08 * d).toFixed(4) + ')';
  }

  function stageProgress(vh){
    if (stagePinned){
      // Démarre un peu avant l'épinglage, pendant que la scène entre.
      var sh = stage.offsetHeight, lead = sh * 0.25;
      var wr = stagePin.getBoundingClientRect();
      return clamp((lead - wr.top) / Math.max(1, stagePin.offsetHeight - sh + lead));
    }
    var sr = stage.getBoundingClientRect();
    return clamp((vh - sr.bottom + sr.height * 0.75) / (sr.height * 0.75 + vh * 0.5));
  }

  function layoutStage(){
    if (!stagePin || !motion || !slots.length) return;
    stagePinned = true;
    stagePin.classList.add('is-pinned');
    stageLast = -1;
  }

  // ---------- Pendant le voyage ----------
  // p (0 → 1) raconte la scène : marche sur le plan jusqu'à la ruelle,
  // écart détecté, propositions, puis la librairie et le château.
  // Épinglée partout ; sous 1080 px, mise en page resserrée (site.css) où la
  // carte remplit la hauteur restante, rognée plutôt que réduite.
  var trip = document.querySelector('[data-trip]');
  var tripSticky = trip && trip.querySelector('.trip-sticky');
  var tripMap = trip && trip.querySelector('[data-trip-map]');
  var tripSvg = tripMap && tripMap.querySelector('svg');
  var tripTrail = trip && trip.querySelector('[data-trip-trail]');
  var tripMe = trip && trip.querySelector('[data-trip-me]');
  var tripRipples = trip ? Array.prototype.slice.call(trip.querySelectorAll('[data-trip-ripple]')) : [];
  var tripSteps = trip ? Array.prototype.slice.call(trip.querySelectorAll('[data-trip-step]')) : [];
  var tripPinned = false, tripLen = 0, tripDev = 0, tripPick = 0;
  var T = { walk: [0.03, 0.29], alert: 0.31, ideas: 0.46, pick: 0.62, toPick: [0.66, 0.79], toEnd: [0.83, 0.97] };

  function smooth(k){ return k * k * (3 - 2 * k); }
  function seg(p, a, b){ return smooth(clamp((p - a) / (b - a))); }

  // Longueur du tracé au point le plus proche de (x, y).
  function lengthAt(x, y){
    var best = 0, bestD = Infinity;
    for (var s = 0; s <= tripLen; s += 1){
      var pt = tripTrail.getPointAtLength(s);
      var d = (pt.x - x) * (pt.x - x) + (pt.y - y) * (pt.y - y);
      if (d < bestD){ bestD = d; best = s; }
    }
    return best;
  }

  function renderTrip(p){
    var s;
    if (p < T.toPick[0]) s = tripDev * seg(p, T.walk[0], T.walk[1]);
    else if (p < T.toEnd[0]) s = tripDev + (tripPick - tripDev) * seg(p, T.toPick[0], T.toPick[1]);
    else s = tripPick + (tripLen - tripPick) * seg(p, T.toEnd[0], T.toEnd[1]);
    tripTrail.style.strokeDashoffset = (tripLen - s).toFixed(1);
    var pt = tripTrail.getPointAtLength(s);
    tripMe.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');

    // Deux ondes partent du point d'écart.
    var k = clamp((p - T.alert) / (T.ideas - T.alert));
    tripRipples.forEach(function(c, i){
      var q = clamp((k - i * 0.3) / 0.7);
      c.setAttribute('r', (10 + 46 * q).toFixed(1));
      c.style.opacity = q > 0 && q < 1 ? (0.9 * (1 - q)).toFixed(3) : '0';
    });

    var step = p < T.alert ? 1 : p < T.ideas ? 2 : p < T.pick ? 3 : 4;
    trip.classList.toggle('is-alert', p >= T.alert);
    trip.classList.toggle('is-ideas', p >= T.ideas);
    trip.classList.toggle('is-chosen', p >= T.pick);
    trip.setAttribute('data-step', step);
    tripSteps.forEach(function(li){ li.classList.toggle('is-on', +li.getAttribute('data-trip-step') === step); });
  }

  function layoutTrip(){
    if (!trip) return;
    tripPinned = true;
    trip.classList.add('is-pinned');
    var compact = window.innerWidth < 1080;
    tripSvg.setAttribute('preserveAspectRatio', compact ? 'xMidYMid slice' : 'xMidYMid meet');
    // Écran large et bas (tablette à l'horizontale) : on limite la largeur
    // pour que la carte rognée garde le fleuve et le point de départ.
    tripMap.style.maxWidth = '';
    if (compact) tripMap.style.maxWidth = Math.round(tripMap.clientHeight * 640 / 600 * 1.25) + 'px';
    renderTrip(pinProgress(trip, tripSticky));
  }

  if (trip && motion && tripTrail.getTotalLength){
    tripLen = tripTrail.getTotalLength();
    var keys = tripTrail.getAttribute('data-keys').split(' ').map(function(k){ return k.split(',').map(Number); });
    tripDev = lengthAt(keys[0][0], keys[0][1]);
    tripPick = lengthAt(keys[1][0], keys[1][1]);
    tripTrail.style.strokeDasharray = tripLen.toFixed(1) + ' ' + tripLen.toFixed(1);
  } else {
    trip = null;
  }

  function setProgress(p){
    if (!bar) return;
    bar.style.setProperty('--hp', p.toFixed(3));
    var idx = Math.min(panels, Math.round(p * (panels - 1)) + 1);
    count.textContent = pad(idx) + ' / ' + pad(panels);
  }

  // Épingle la piste : la section devient aussi haute que la distance
  // horizontale à parcourir.
  function layout(){
    layoutStage();
    layoutSlide();
    layoutTrip();
    if (!how) return;
    pinned = motion;
    how.classList.toggle('is-pinned', pinned);
    track.style.transform = '';
    if (!pinned){ how.style.height = ''; return; }
    var last = track.lastElementChild;
    var padRight = parseFloat(getComputedStyle(track).paddingRight) || 0;
    var trackLeft = track.getBoundingClientRect().left;
    dist = Math.max(0, last.getBoundingClientRect().right - trackLeft + padRight - track.clientWidth);
    how.style.height = (howSticky.offsetHeight + dist) + 'px';
  }

  // Rangée du récap : liée au défilement pendant qu'elle passe sur grand
  // écran ; sur petit écran, épinglée comme la piste (la rangée devient
  // aussi haute que la distance à parcourir). Sans mouvement : glissée au doigt.
  function layoutSlide(){
    if (!slide) return;
    linked = motion && window.innerWidth > 800;
    slidePinned = motion && !linked;
    slide.classList.toggle('is-linked', linked);
    slide.classList.toggle('is-pinned', slidePinned);
    slideTrack.style.transform = '';
    slide.style.height = '';
    slideDist = motion ? Math.max(0, slideTrack.offsetWidth - slide.clientWidth) : 0;
    if (slidePinned) slide.style.height = (slideSticky.offsetHeight + slideDist) + 'px';
  }

  function update(){
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;

    // Barre de navigation : fond au-delà du hero, masquée en descendant.
    if (nav){
      nav.classList.toggle('is-solid', y > vh * 0.75);
      if (y > vh && y > lastY + 4) nav.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= vh) nav.classList.remove('is-hidden');
    }
    lastY = y;

    if (pinned){
      var hp = pinProgress(how, howSticky);
      track.style.transform = 'translate3d(' + (-hp * dist).toFixed(1) + 'px,0,0)';
      setProgress(hp);
    }

    if (!motion) return;

    if (heroMedia && y < vh * 1.2){
      heroMedia.style.transform = 'translate3d(0,' + (y * 0.35).toFixed(1) + 'px,0)';
      heroBody.style.transform = 'translate3d(0,' + (y * -0.12).toFixed(1) + 'px,0)';
      heroBody.style.opacity = (1 - clamp(y / (vh * 0.75))).toFixed(3);
    }

    parallax.forEach(function(el){
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var offset = r.top + r.height / 2 - vh / 2;
      el.style.transform = 'translate3d(0,' + (-offset * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px,0)';
    });

    if (stage && slots.length){
      var sr = stage.getBoundingClientRect();
      var near = sr.bottom > -80 && sr.top < vh + 80;
      stage.classList.toggle('is-near', near);
      if (near) renderStage(stageProgress(vh));
    }

    // La rangée parcourt toute sa largeur pendant qu'elle est entièrement
    // visible, pour que chaque écran passe en entier devant les yeux.
    if (linked && slideDist){
      var lr = slide.getBoundingClientRect();
      if (lr.bottom > 0 && lr.top < vh){
        // La piste a ~90 px de marge basse (décalage des téléphones pairs) :
        // on démarre quand les téléphones sont entrés, on finit avant qu'ils sortent.
        var span = Math.max(vh - lr.height + 100, vh * 0.3);
        var lp = clamp((vh - lr.bottom + 90) / span);
        slideTrack.style.transform = 'translate3d(' + (-lp * slideDist).toFixed(1) + 'px,0,0)';
      }
    }
    if (slidePinned && slideDist){
      var pr = slide.getBoundingClientRect();
      if (pr.bottom > 0 && pr.top < vh){
        slideTrack.style.transform = 'translate3d(' + (-pinProgress(slide, slideSticky) * slideDist).toFixed(1) + 'px,0,0)';
      }
    }

    if (tripPinned){
      var tr = trip.getBoundingClientRect();
      if (tr.bottom > 0 && tr.top < vh) renderTrip(pinProgress(trip, tripSticky));
    }

    if (band){
      var br = band.parentElement.getBoundingClientRect();
      if (br.bottom > 0 && br.top < vh){
        var bp = (vh - br.top) / (vh + br.height);
        band.style.transform = 'translate3d(' + (-bp * 35).toFixed(2) + '%,0,0)';
      }
    }
  }

  function requestUpdate(){
    if (!ticking){ ticking = true; requestAnimationFrame(update); }
  }

  // Sans épinglage, la piste se fait glisser : la jauge suit le geste.
  if (track){
    track.addEventListener('scroll', function(){
      if (pinned) return;
      setProgress(clamp(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)));
    }, { passive: true });
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  // Sur écran tactile, la barre du navigateur qui se replie change la
  // hauteur de quelques dizaines de pixels pendant le défilement : on ne
  // recalcule pas la mise en page pour si peu, sinon tout saute.
  var touch = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var laidW = window.innerWidth, laidH = window.innerHeight;
  function relayout(){
    laidW = window.innerWidth; laidH = window.innerHeight;
    layout(); requestUpdate();
  }
  window.addEventListener('resize', function(){
    if (touch && window.innerWidth === laidW && Math.abs(window.innerHeight - laidH) < 120){ requestUpdate(); return; }
    relayout();
  });
  window.addEventListener('load', relayout);
  layout();
  update();
})();
