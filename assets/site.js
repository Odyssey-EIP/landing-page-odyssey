// Bascule FR/EN commune à toutes les pages.
// - data-fr / data-en : texte de l'élément
// - data-aria-fr / data-aria-en : aria-label
// - data-href-fr / data-href-en : lien (mailto pré-rempli dans la bonne langue)
// - data-lang-block="fr|en" : bloc entier affiché dans une seule langue
// - <html data-title-fr data-title-en> : titre de l'onglet
(function(){
  var STORAGE_KEY = 'odyssey-lang';
  var root = document.documentElement;

  function getStored(){
    try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
  }
  function setStored(lang){
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
  }
  function pick(el, prefix, lang){
    return el.getAttribute(prefix + lang);
  }

  function applyLang(lang){
    if (lang !== 'en') lang = 'fr';
    root.setAttribute('lang', lang);
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    var desc = document.querySelector('meta[name="description"]');
    var descText = desc && desc.getAttribute('data-' + lang);
    if (descText) desc.setAttribute('content', descText);

    document.querySelectorAll('[data-fr]').forEach(function(el){
      var t = pick(el, 'data-', lang);
      if (t !== null) el.textContent = t;
    });
    document.querySelectorAll('[data-aria-fr]').forEach(function(el){
      var t = pick(el, 'data-aria-', lang);
      if (t !== null) el.setAttribute('aria-label', t);
    });
    document.querySelectorAll('[data-href-fr]').forEach(function(el){
      var t = pick(el, 'data-href-', lang);
      if (t !== null) el.setAttribute('href', t);
    });
    document.querySelectorAll('[data-lang-block]').forEach(function(el){
      el.hidden = el.getAttribute('data-lang-block') !== lang;
    });
    document.querySelectorAll('.lang-btn').forEach(function(btn){
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    setStored(lang);
    // motion.js redécoupe les titres animés après chaque changement de texte
    document.dispatchEvent(new CustomEvent('odyssey:lang'));
  }

  document.querySelectorAll('.lang-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ applyLang(btn.getAttribute('data-lang')); });
  });

  // ?lang=en permet de partager un lien direct vers la version anglaise
  var param = new URLSearchParams(window.location.search).get('lang');
  applyLang(param || getStored() || 'fr');

  // Une ancre française (#suppression) mène à la section anglaise équivalente
  // (data-anchor-en="deletion") quand la page est en anglais.
  var hash = window.location.hash.slice(1);
  if (hash && root.lang === 'en'){
    var source = document.getElementById(hash);
    var target = source && source.getAttribute('data-anchor-en');
    if (target && document.getElementById(target)) document.getElementById(target).scrollIntoView();
  }
})();
