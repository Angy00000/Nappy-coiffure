/* Fonds plein écran au défilement (même système que Angy Tech)
   Un calque fixe de la taille de l'écran : la photo de la section visible
   apparaît en fondu (avec un léger zoom) derrière le contenu.
   Le script repère tout seul les sections qui ont une image de fond. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var fait = false;

  function urlDe(bg) { return bg && bg !== 'none' && bg.indexOf('url(') !== -1; }
  function transparent(c) { return !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c); }

  function init() {
    if (fait) return;
    var body = document.body;
    var cs = getComputedStyle(body);
    var couleurPage = cs.backgroundColor;
    if (transparent(couleurPage)) couleurPage = getComputedStyle(document.documentElement).backgroundColor;
    if (transparent(couleurPage)) couleurPage = '#000';

    // Sections candidates : enfants directs de body / main, et toutes les <section>
    var cands = [].slice.call(document.querySelectorAll('body > *, main > *, section'));
    var items = [];
    cands.forEach(function (el) {
      if (/^(SCRIPT|STYLE|NAV|LINK|META|NOSCRIPT)$/.test(el.tagName)) return;
      var s = getComputedStyle(el);
      if (s.position === 'fixed' || s.position === 'sticky') return;
      if (el.offsetHeight < 200) return;
      // ignorer un élément déjà couvert par un parent retenu
      for (var i = 0; i < items.length; i++) if (items[i].el.contains(el)) return;
      var bg = s.backgroundImage, pos = s.backgroundPosition, pseudo = false;
      if (!urlDe(bg)) {
        var b = getComputedStyle(el, '::before');
        if (urlDe(b.backgroundImage) && b.content !== 'none') { bg = b.backgroundImage; pos = b.backgroundPosition; pseudo = true; }
        else return;
      }
      items.push({ el: el, bg: bg, pos: pos, pseudo: pseudo });
    });
    if (!items.length) return;
    fait = true;

    // Styles
    var st = document.createElement('style');
    st.textContent =
      '#nappy-fonds{position:fixed;inset:0;z-index:-1;pointer-events:none;}' +
      '#nappy-fonds .nf{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat;background-position:center;opacity:0;transform:scale(1.06);transition:opacity 1s ease,transform 6s ease;will-change:opacity,transform;}' +
      '#nappy-fonds .nf.on{opacity:1;transform:scale(1);}' +
      '#nappy-fonds::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 120% 90% at 50% 40%,rgba(0,0,0,.15) 0%,rgba(0,0,0,.4) 65%,rgba(0,0,0,.7) 100%);}' +
      '.nf-sec{background:linear-gradient(180deg,var(--nf-c) 0,rgba(0,0,0,0) 120px,rgba(0,0,0,0) calc(100% - 120px),var(--nf-c) 100%)!important;background-attachment:scroll!important;}' +
      '.nf-sec.nf-haut{background:linear-gradient(180deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) calc(100% - 120px),var(--nf-c) 100%)!important;}' +
      '.nf-pseudo::before{background-image:none!important;}' +
      '@media(prefers-reduced-motion:reduce){#nappy-fonds .nf{transition:opacity .3s;transform:none!important;}}';
    document.head.appendChild(st);

    // La couleur de page passe sur <html> pour que le calque fixe reste visible
    document.documentElement.style.backgroundColor = couleurPage;
    body.style.background = 'transparent';
    document.documentElement.style.setProperty('--nf-c', couleurPage);

    // Les autres blocs gardent un fond plein (la photo ne doit pas passer derrière)
    cands.forEach(function (el) {
      if (items.some(function (it) { return it.el === el || it.el.contains(el); })) return;
      if (el.parentElement !== body && (!el.parentElement || el.parentElement.tagName !== 'MAIN')) return;
      var s = getComputedStyle(el);
      if (s.position === 'fixed' || s.position === 'sticky') return;
      if (transparent(s.backgroundColor) && !urlDe(s.backgroundImage)) el.style.backgroundColor = couleurPage;
    });

    // Calque fixe + une couche par section
    var wrap = document.createElement('div');
    wrap.id = 'nappy-fonds';
    wrap.setAttribute('aria-hidden', 'true');
    body.insertBefore(wrap, body.firstChild);

    var vis = [];
    items.forEach(function (it, i) {
      var l = document.createElement('div');
      l.className = 'nf';
      l.style.backgroundImage = it.bg;
      if (it.pos) l.style.backgroundPosition = it.pos;
      wrap.appendChild(l);
      it.layer = l;
      it.el.classList.add('nf-sec');
      if (it.pseudo) it.el.classList.add('nf-pseudo');
      if (it.el.getBoundingClientRect().top + window.scrollY < 10) it.el.classList.add('nf-haut');
      it.el.setAttribute('data-nf', i);
      vis[i] = 0;
    });
    if (items[0]) items[0].layer.classList.add('on');

    function maj() {
      var best = -1, max = 0;
      for (var i = 0; i < vis.length; i++) if (vis[i] > max) { max = vis[i]; best = i; }
      items.forEach(function (it, i) { it.layer.classList.toggle('on', i === best && max > 0.15); });
    }

    var seuils = [];
    for (var t = 0; t <= 1.0001; t += 0.1) seuils.push(Math.round(t * 10) / 10);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var i = +e.target.getAttribute('data-nf');
        vis[i] = e.isIntersecting ? e.intersectionRect.height / window.innerHeight : 0;
      });
      maj();
    }, { threshold: seuils });
    items.forEach(function (it) { io.observe(it.el); });
  }

  if (document.readyState === 'complete') init();
  else {
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('load', init);
  }
})();
