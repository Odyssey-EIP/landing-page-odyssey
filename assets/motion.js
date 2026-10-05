// Mouvement de la page d'accueil, sans bibliothèque :
// - titres qui montent mot par mot, blocs qui apparaissent au défilement ;
// - parallaxe des photos, téléphones qui s'écartent en entrant ;
// - bandeau de destinations qui glisse, piste « Comment ça marche »
//   épinglée et déroulée à l'horizontale pendant le défilement.
// Si l'utilisateur demande à réduire les animations, seule la navigation
// reste dynamique et la piste se fait glisser au doigt.
(function(){
  var root = document.documentElement;
  var motion = root.classList.contains('motion');

  function clamp(v){ return Math.max(0, Math.min(1, v)); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  // ---------- Titres découpés en mots ----------
  function splitLeaf(leaf, counter){
    if (leaf.querySelector('.w')) return;
    var words = leaf.textContent.split(/\s+/).filter(Boolean);
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
  var track = how && how.querySelector('[data-track]');
  var count = how && how.querySelector('[data-how-count]');
  var bar = how && how.querySelector('[data-how-bar]');
  var panels = track ? track.children.length : 0;
  var pinned = false, dist = 0, lastY = window.scrollY, ticking = false;

  function setProgress(p){
    if (!bar) return;
    bar.style.setProperty('--hp', p.toFixed(3));
    var idx = Math.min(panels, Math.round(p * (panels - 1)) + 1);
    count.textContent = pad(idx) + ' / ' + pad(panels);
  }

  // Épingle la piste sur grand écran : la section devient aussi haute
  // que la distance horizontale à parcourir.
  function layout(){
    if (!how) return;
    pinned = motion && window.innerWidth > 800;
    how.classList.toggle('is-pinned', pinned);
    track.style.transform = '';
    if (!pinned){ how.style.height = ''; return; }
    var last = track.lastElementChild;
    var padRight = parseFloat(getComputedStyle(track).paddingRight) || 0;
    var trackLeft = track.getBoundingClientRect().left;
    dist = Math.max(0, last.getBoundingClientRect().right - trackLeft + padRight - track.clientWidth);
    how.style.height = (window.innerHeight + dist) + 'px';
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
      var hr = how.getBoundingClientRect();
      var hp = clamp(-hr.top / Math.max(1, how.offsetHeight - vh));
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

    if (stage){
      var sr = stage.getBoundingClientRect();
      stage.style.setProperty('--p', clamp((vh - sr.top) / (vh * 0.8)).toFixed(3));
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
  window.addEventListener('resize', function(){ layout(); requestUpdate(); });
  window.addEventListener('load', function(){ layout(); requestUpdate(); });
  layout();
  update();
})();
