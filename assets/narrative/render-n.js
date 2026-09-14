/* render-n.js · renderer for the narrative prototypes F (岭南散页) and G (招纸春醒) · 2026-09-08
   Reads globals COPY / RECEIPTS / RECEIPT_BY_ID from ./assets/narrative/copy-n.js, SHELF from ./assets/js/shelf-data.js,
   renderShelf from ./assets/narrative/shelf.js, and window.THEME hooks from the page:
     id · boardLabel · logo() · motif(key,{size,ctx}) · hero{line,color} · demo{poster,gif} · links[] · marks() · stamp(key) · shelfPalette · onPointer · init
   Section order (Alex 09-08): hero → work → shelf → home → line → belief → closing → footer.
   Receipt / ledger / language / wipe / cursor code is copied from 05-C-prototype/render-c.js (which A / C / D / E keep using, untouched). */
(function () {
  var doc = document, root = doc.documentElement, T = window.THEME || {};
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var qs = new URLSearchParams(location.search);
  var lang0 = qs.get("lang") || ls("proto-lang") || "en";
  if (lang0 === "zh" || lang0 === "zh-Hant") lang0 = "zh-Hans";
  if (!COPY[lang0]) lang0 = "en";
  var bgKey = "proto-bg-" + (T.id || "n");
  var state = { lang: lang0, bg: qs.get("bg") || ls(bgKey) || T.defaultBg || "cool", audit: false };
  if (state.bg !== "cool" && state.bg !== "warm") state.bg = T.defaultBg || "cool";
  var C, shelfApi = null, io = null, wio = null, escapeHandler = null, receiptScroll = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lines(s) { return esc(s).split("\n").join("<br>"); }
  function cjk(s) { return esc(s).replace(/[　-〿一-鿿＀-￯]+/g, function (m) { return '<span class="cjk" lang="zh-Hans">' + m + "</span>"; }); }
  function tx(v) { return v == null ? "" : (typeof v === "string" ? v : (v[state.lang] || v.en || "")); }
  function paras(arr, cls) { return (arr || []).filter(Boolean).map(function (p) { return "<p" + (cls ? ' class="' + cls + '"' : "") + ">" + esc(p) + "</p>"; }).join(""); }
  function motif(key, size, ctx) { return T.motif ? T.motif(key, { size: size, ctx: ctx }) : ""; }
  function fact(f) {
    var r = RECEIPT_BY_ID[f.rid];
    var numTag = T.receipts === false ? "span" : "button"; // THEME.receipts:false = plain numbers, no receipt tooltip / ledger (live build)
    return '<div class="fact"><' + numTag + (numTag === "button" ? ' type="button"' : "") + ' class="num big" data-id="' + esc(f.rid) + '">' + esc(f.value) + '</' + numTag + '><small class="lab">' + esc(f.label) + '</small>' +
      (f.src ? '<span class="src" data-lab="' + esc(C.ui.work.srcLabel) + '">' + esc(f.src) + "</span>" : "") + "</div>" + (r ? "" : "<!-- missing receipt " + esc(f.rid) + " -->");
  }
  function wipe() { return ""; } // Reading never waits for a covering animation.

  var WORK = ["adoption", "scheduler", "sl", "skills"], HOME = ["window", "dimsum", "boat", "opera"], LINE = ["arch", "content", "ai"], SHELF_L = ["A", "B", "C", "D"];

  function render() {
    if (io) io.disconnect(); if (wio) wio.disconnect();
    if (escapeHandler) doc.removeEventListener("keydown", escapeHandler);
    if (receiptScroll) removeEventListener("scroll", receiptScroll);
    state.audit = false; doc.body.classList.remove("audit");
    C = COPY[state.lang];
    root.lang = state.lang; root.dataset.bg = state.bg; root.dataset.theme = T.id || "";
    doc.title = C.meta.title + (T.boardLabel && T.tools !== false ? " · " + T.boardLabel : ""); // live build (tools:false) keeps the draft label out of the tab
    if (shelfApi) { shelfApi.destroy(); shelfApi = null; }
    var U = C.ui, h = [];
    h.push('<a class="skip" href="#work">' + esc(U.nav.skip) + "</a>");
    /* top bar */
    h.push('<header class="top"><div class="wrap">' +
      '<a href="#top" class="name" title="' + esc(U.nav.logoTitle) + '">Alex Zheng <span class="cjk" lang="zh-Hans">郑晓琪</span></a>' +
      '<nav class="section-nav" aria-label="' + esc(U.work.indexLabel) + '"><a href="#work">' + esc(U.nav.work) + '</a><a href="#shelf">' + esc(U.nav.library) + '</a><a href="#home">' + esc(U.nav.origins) + "</a></nav>" +
      '<nav aria-label="Page tools"><div class="langs" role="group" aria-label="Language">' +
        ["en", "zh-Hans"].map(function (l) { return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === state.lang) + '" lang="' + l + '">' + esc(U.nav.langs[l]) + "</button>"; }).join("") + "</div>" +
        (T.receipts === false ? "" : '<button type="button" class="btn-ghost" id="auditBtn" aria-controls="ledger" aria-label="' + esc(U.nav.receiptsTitle) + '" aria-pressed="false" title="' + esc(U.nav.receiptsTitle) + '"><span class="dot"></span><span class="txt">' + esc(U.nav.receiptsOff) + "</span></button>") +
        '<a class="btn-ghost resume" href="mailto:alexanderchat1005@gmail.com?subject=Resume%20request">' + esc(U.nav.resume) + "</a>" +
      "</nav></div></header>");
    h.push('<main id="top">');
    /* 1 hero */
    var H = C.hero;
    h.push('<section class="hero" id="hero"><div class="wrap hero-grid"><div class="copy">' +
      (T.marks ? T.marks(state) : "") +
      '<p class="who">' + cjk(H.eyebrow) + "</p>" +
      '<h1><span class="l1">' + esc(H.title[0]) + '</span><span class="l2">' + esc(H.title[1]) + "</span></h1>" +
      '<div class="intro">' + paras(H.intro) + "</div>" +
      (H.proof ? '<p class="proof">' + esc(H.proof) + "</p>" : "") +
      (H.index && H.index.items ? '<nav class="dir-list" aria-label="' + esc(H.index.label || "") + '"><p class="lead">' + esc(H.index.lead) + "</p><ol>" +
        H.index.items.map(function (it, i) { return '<li><a href="#project-' + i + '"><b>' + esc(it.name) + "</b><span>" + esc(it.line) + "</span></a></li>"; }).join("") + "</ol></nav>" : "") +
      '<aside class="dir">' + esc(H.aside) + "</aside>" +

      '<div class="cta"><a class="btn" href="#work">' + esc(U.hero.ctaWork) + '</a><a class="btn alt" href="mailto:alexanderchat1005@gmail.com?subject=Resume%20request">' + esc(U.hero.ctaResume) + "</a></div>" +
      '</div><div class="art">' + (T.heroArt ? T.heroArt(C, state) : panorama(U.hero)) + "</div></div></section>");
    /* 2 work */
    var W = C.work;
    h.push('<section class="work wipe-host" id="work"><div class="wrap">' + wipe() +
      '<div class="sec-head rise"><p class="eyebrow">' + cjk(W.kicker) + '</p><h2 class="title">' + esc(W.title) + '</h2><p class="lead">' + esc(W.lead) + "</p></div>" +
      '<nav class="work-index" aria-label="' + esc(U.work.indexLabel) + '">' + WORK.map(function (key, i) { return '<a href="#project-' + i + '"><span>0' + (i + 1) + '</span>' + esc(U.work.indexNames[i]) + '<span aria-hidden="true">↗</span></a>'; }).join("") + "</nav>");
    WORK.forEach(function (key, i) {
      var it = W.items[key], n = String(i + 1).padStart(2, "0");
      var demo = "";
      if (it.demo && T.demo) {
        demo = '<figure class="demo" data-state="poster" data-key="' + key + '"><div class="frame"><img class="demo-img" src="' + esc(T.demo.poster) + '" width="1200" height="697" alt="" decoding="async"></div>' +
          '<div class="acts"><button type="button" class="btn" data-act="play" aria-pressed="false" data-play="' + esc(it.demo.button) + '" data-stop="' + esc(it.demo.stop) + '">' + esc(it.demo.button) + '</button><button type="button" class="btn alt" data-act="expand">' + esc(it.demo.expand) + "</button></div>" +
          "<figcaption>" + esc(it.demo.caption) + "</figcaption></figure>";
      }
      h.push('<article class="sys rise" id="project-' + i + '" data-key="' + key + '">' +
        '<div class="srail"><span class="n">' + n + " " + esc(U.work.counter) + '</span><span class="fig">' + motif(it.motif, 150, "rail") + "</span>" +
          '<p class="motif-label">' + esc(it.motifLabel) + "</p>" + (T.stamp ? T.stamp(key, state) : "") + "</div>" +
        '<div class="text"><p class="kick">' + n + " · <span class=\"pn\">" + esc(it.subtitle) + "</span></p><h3>" + esc(it.title) + "</h3>" +
          '<p class="outcome">' + esc(it.outcome) + '</p><p class="role">' + esc(it.role) + "</p>" +
          '<div class="facts">' + it.facts.map(fact).join("") + "</div>" +
          '<div class="project-body' + (demo ? " has-demo" : "") + '"><div class="prose">' + paras(it.paragraphs) + "</div>" + demo + "</div>" +
          '<details class="cap"><summary>' + esc(U.work.captionLabel) + '</summary><p class="body">' + esc(it.caption) + "</p></details>" +
        "</div></article>");
    });
    h.push("</div></section>");
    /* 3 shelf */
    var S = C.shelf;
    h.push('<section class="shelf-sec wipe-host alt" id="shelf"><div class="wrap">' + wipe() +
      '<div class="sec-head rise"><p class="eyebrow">' + cjk(S.kicker) + '</p><h2 class="title">' + esc(S.title) + '</h2><p class="lead">' + esc(S.lead) + "</p></div>" +
      (S.paragraphs.length ? '<div class="prose rise">' + paras(S.paragraphs) + "</div>" : "") +
      '<div class="counts rise">' + S.facts.map(fact).join("") + "</div>" +
      '<div class="bookshelf-host" id="bookshelf"></div>' +
      '<p class="fine">' + esc(S.caption) + "</p></div></section>");
    /* 4 home */
    var Ho = C.home;
    h.push('<section class="home" id="home"><div class="wrap">' +
      '<div class="sec-head rise"><p class="eyebrow">' + cjk(Ho.kicker) + '</p><h2 class="title">' + esc(Ho.title) + '</h2><p class="lead">' + esc(Ho.lead) + "</p></div>" +
      '<div class="prose rise">' + paras(Ho.paragraphs) + "</div>" +
      '<div class="strip rise">' + HOME.map(function (k) {
        var it = Ho.items[k];
        return '<article class="item" data-m="' + k + '"><div class="plate"><span class="fig">' + motif(k, 180, "home") + '</span><span class="name">' + esc(it.title) + '</span><span class="sub">' + esc(it.subtitle) + "</span></div>" +
          '<p class="note">' + esc(it.paragraphs[0]) + '</p><a class="go" href="' + esc(it.href) + '">' + esc(it.linkText) + " →</a></article>";
      }).join("") + "</div></div></section>");
    /* 5 line */
    var L = C.line;
    h.push('<section class="line" id="line"><div class="wrap">' +
      '<div class="sec-head rise"><p class="eyebrow">' + cjk(L.kicker) + '</p><h2 class="title">' + esc(L.title) + '</h2>' + (L.lead ? '<p class="lead">' + esc(L.lead) + "</p>" : "") + "</div>" +
      '<div class="stages rise">' + LINE.map(function (k, i) {
        var it = L.items[k];
        return '<article class="stage" data-k="' + k + '"><span class="mark">' + (T.markGlyph ? T.markGlyph(i, state) : i + 1) + "</span>" + motif(it.motif, 64, "chapter") +
          "<h3>" + esc(it.title) + '</h3><p class="when">' + esc(it.subtitle) + "</p>" + paras(it.paragraphs, "body") + "</article>";
      }).join("") + "</div></div></section>");
    /* 6 belief */
    var B = C.belief, bt = B.title.split("\n");
    h.push('<section class="creed essay" id="belief"><div class="wrap rise"><p class="eyebrow">' + cjk(B.kicker) + "</p>" +
      '<h2><span class="a">' + esc(bt[0]) + '</span><span class="b">' + esc(bt.slice(1).join(" ")) + "</span></h2>" +
      '<p class="lead">' + esc(B.lead) + '</p><div class="prose">' + paras(B.paragraphs) + "</div>" +
      '<blockquote class="quote"><p>' + lines(B.quote) + "</p></blockquote></div></section>");
    /* 7 closing */
    var Cl = C.closing, ct = Cl.title.split("\n"), q = Cl.quote.split("\n");
    h.push('<section class="closing" id="closing"><div class="wrap rise"><div>' +
      '<p class="eyebrow">' + cjk(Cl.kicker) + '</p><h2 class="title"><span class="l1">' + esc(ct[0]) + '</span><span class="l2">' + esc(ct.slice(1).join(" ")) + "</span></h2>" +
      (Cl.paragraphs.length ? '<p class="body">' + esc(Cl.paragraphs.join(" ")) + "</p>" : "") + "</div>" +
      '<div><p class="motto"><span class="seal" lang="zh-Hans">' + esc(q[0]) + '</span><span class="en">' + esc(q.slice(1).join(" ")) + "</span></p>" +
      '<p class="cap">' + esc(Cl.caption) + "</p></div></div></section>");
    h.push("</main>");
    /* footer */
    var F = U.footer;
    h.push('<footer><div class="wrap">' + (T.footMarks ? T.footMarks(state) : "") + '<span class="stamp-line">Alex Zheng · <span class="cjk" lang="zh-Hans">郑晓琪</span> · 2026</span>' +
      '<span class="links"><a href="mailto:alexanderchat1005@gmail.com">' + esc(F.email) + '</a><a href="https://www.linkedin.com/in/alex-zheng-111060319" rel="me noopener" target="_blank">' + esc(F.linkedin) + '</a><a href="mailto:alexanderchat1005@gmail.com?subject=Resume%20request">' + esc(F.resume) + "</a></span>" +
      '<span class="note">' + esc(T.receipts === false ? (F.aiNotePlain || F.aiNote) : F.aiNote) + "</span>" + (F.version ? '<span class="version">' + esc(F.version) + "</span>" : "") + "</div></footer>");
    /* fixed layers */
    h.push('<div id="fish" aria-hidden="true"></div>' + (T.receipts === false ? "" : '<div id="receipt" class="receipt" role="tooltip" aria-hidden="true"></div>'));
    if (T.receipts !== false) h.push('<aside class="ledger" id="ledger" inert aria-label="' + esc(U.receipt.ledgerTitle) + '"><h2>' + esc(U.receipt.ledgerTitle) + '</h2><p class="lede">' + esc(U.receipt.ledgerLede) + '</p><ol id="ledgerList"></ol><p class="foot">' + esc(U.receipt.ledgerFoot) + "</p></aside>");
    if (T.demo) h.push('<dialog class="demo-dialog" id="demoDialog" aria-label="' + esc(C.work.items.scheduler.demo.expand) + '"><div class="bar"><span class="cap-text"></span><button type="button" class="btn-ghost" data-act="close"></button></div><img alt="" decoding="async"></dialog>');
    if (T.tools !== false) h.push('<details class="prototype-tools"><summary>' + esc((T.id || "").toUpperCase()) + " / " + esc(U.proto.links) + '</summary><div class="protobar" aria-label="prototype switches"><span>' + esc(U.proto.bgToggle) + '</span><button type="button" data-bg="cool" aria-pressed="' + (state.bg === "cool") + '">' + esc(U.proto.bgCool) + '</button><button type="button" data-bg="warm" aria-pressed="' + (state.bg === "warm") + '">' + esc(U.proto.bgWarm) + "</button>" +
      (T.links && T.links.length ? '<i class="sep"></i><span>' + esc(U.proto.links) + "</span>" + T.links.map(function (l) { return '<a href="' + esc(l.href) + '"' + (l.current ? ' aria-current="page"' : "") + ">" + esc(l.label) + "</a>"; }).join("") : "") + "</div></details>");
    doc.body.innerHTML = h.join("");
    mountShelf();
    wire();
    if (T.init) T.init(state);
  }

  function panorama(UH) {
    var P = T.hero || {};
    return '<figure class="pano" data-on="0"><div class="frame">' +
      '<img class="line" src="' + esc(P.line) + '" width="1600" height="1000" alt="' + esc(UH.panoAlt) + '" decoding="async">' +
      '<img class="color" src="' + esc(P.color) + '" width="1600" height="1000" alt="" decoding="async" aria-hidden="true">' +
      '<button type="button" class="hit" aria-pressed="false" aria-label="' + esc(UH.panoHover) + '"></button></div>' +
      '<figcaption class="infobar"><span class="cap-l">' + esc(UH.panoCap) + '</span><span class="cap-r"><span class="hint-hover">' + esc(UH.panoHover) + '</span><span class="hint-tap">' + esc(UH.panoTap) + "</span></span></figcaption></figure>";
  }

  function mountShelf() {
    var host = doc.getElementById("bookshelf"); if (!host || !window.renderShelf || !window.SHELF) return;
    var byKey = {}; window.SHELF.layers.forEach(function (l) { byKey[l.key] = l; });
    shelfApi = renderShelf(host, {
      lang: state.lang,
      layers: SHELF_L.map(function (k) { var it = C.shelf.items[k] || {}; return { key: k, name: it.title || (byKey[k] || {}).en || k, note: it.subtitle || "" }; }),
      books: window.SHELF.books, strings: C.ui.shelf, palette: T.shelfPalette || null
    });
  }

  var lastX = innerWidth / 2, lastY = innerHeight / 2;
  function wire() {
    doc.querySelectorAll(".langs button").forEach(function (b) { b.addEventListener("click", function () { var y = scrollY; state.lang = b.dataset.lang; ls("proto-lang", state.lang); render(); scrollTo({top:y, behavior:"instant"}); var next = doc.querySelector('.langs [data-lang="' + state.lang + '"]'); if (next) next.focus({preventScroll:true}); }); });
    doc.querySelectorAll(".protobar [data-bg]").forEach(function (b) { b.addEventListener("click", function () { state.bg = b.dataset.bg; ls(bgKey, state.bg); root.dataset.bg = state.bg; doc.querySelectorAll(".protobar [data-bg]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); }); });
    /* = render-c.js: rise + wipe */
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    doc.querySelectorAll(".rise").forEach(function (el) { io.observe(el); });
    if (!CSS.supports || !CSS.supports("animation-timeline: view()")) {
      doc.querySelectorAll(".wipe").forEach(function (w) { w.classList.remove("scroll"); });
      wio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); wio.unobserve(e.target); } }); }, { threshold: .12 });
      doc.querySelectorAll(".wipe").forEach(function (w) { wio.observe(w); });
    }
    if (!(window.CSS && CSS.registerProperty)) doc.querySelectorAll(".wipe").forEach(function (w) { w.style.display = "none"; });
    /* panorama two-state */
    doc.querySelectorAll(".pano").forEach(function (p) {
      var hit = p.querySelector(".hit");
      function set(on) { p.dataset.on = on ? "1" : "0"; hit.setAttribute("aria-pressed", on ? "true" : "false"); }
      if (reduce) { set(true); return; }
      hit.addEventListener("click", function () { set(p.dataset.on !== "1"); });
      p.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") set(false); });
    });
    /* demo player */
    var dlg = doc.getElementById("demoDialog");
    doc.querySelectorAll(".demo").forEach(function (d) {
      var img = d.querySelector(".demo-img"), play = d.querySelector('[data-act="play"]'), key = d.dataset.key, it = C.work.items[key];
      function setPlaying(on) { d.dataset.state = on ? "gif" : "poster"; img.src = on ? T.demo.gif : T.demo.poster; play.textContent = on ? play.dataset.stop : play.dataset.play; play.setAttribute("aria-pressed", on ? "true" : "false"); }
      play.addEventListener("click", function () { setPlaying(d.dataset.state !== "gif"); });
      d.querySelector('[data-act="expand"]').addEventListener("click", function () {
        dlg.querySelector("img").src = reduce ? T.demo.poster : T.demo.gif; dlg.querySelector(".cap-text").textContent = it.demo.caption; dlg.querySelector('[data-act="close"]').textContent = it.demo.close;
        if (!dlg.open) dlg.showModal();
      });
    });
    if (dlg) { dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest('[data-act="close"]')) dlg.close(); }); dlg.addEventListener("close", function () { dlg.querySelector("img").removeAttribute("src"); }); }
    /* = render-c.js: receipts + ledger + audit + Escape (refText / tx handle the {en, zh-Hans} shaped fields of the new receipts) */
    if (T.receipts !== false) {
    var rc = doc.getElementById("receipt"); var nums = Array.prototype.slice.call(doc.querySelectorAll(".num"));
    nums.forEach(function (n, i) { n.setAttribute("aria-describedby", "receipt"); n.id = n.id || ("num-" + (i + 1)); });
    var order = []; nums.forEach(function (n) { if (RECEIPT_BY_ID[n.dataset.id] && order.indexOf(n.dataset.id) < 0) order.push(n.dataset.id); });
    function chop(v) { return v === "planned" ? "预" : v === "self-reported" ? "自" : v === "report" ? "报" : "核"; }
    function fill(n) {
      var r = RECEIPT_BY_ID[n.dataset.id]; if (!r) return;
      var k = order.indexOf(r.id) + 1, V = C.ui.receipt.verified;
      var chopCls = r.verified === "planned" ? " planned" : (r.verified === "self-reported" ? " self" : (r.verified === "report" ? " report" : ""));
      rc.innerHTML = '<div class="h"><span>' + esc(C.ui.receipt.no) + " " + String(k).padStart(2, "0") + "</span><span>" + esc(C.ui.receipt.brand) + "</span></div>" +
        '<div class="chop' + chopCls + '" aria-hidden="true">' + chop(r.verified) + "</div>" +
        '<div class="v">' + esc(tx(r.value)) + '</div><div class="lab">' + esc(tx(r.label)) + "</div>" +
        '<div class="row"><span class="k">' + esc(C.ui.receipt.source) + "</span><span>" + esc(V[r.verified] || r.verified) + " · " + esc(r.source.kind) + " · " + esc(r.source.asOf) + "</span></div>" +
        '<div class="row"><span class="k">' + esc(C.ui.receipt.file) + '</span><span class="f">' + esc(tx(r.source.ref)) + "</span></div>";
    }
    function place(n) { var r = n.getBoundingClientRect(), w = Math.min(360, innerWidth - 32), pad = 12; var left = Math.max(16, Math.min(innerWidth - w - 16, r.left)); var top = r.bottom + pad; if (top + 210 > innerHeight) top = r.top - 210 - pad; rc.style.left = left + "px"; rc.style.top = Math.max(64, top) + "px"; }
    var hideT; function show(n) { clearTimeout(hideT); fill(n); place(n); rc.classList.add("show"); rc.setAttribute("aria-hidden", "false"); rc.dataset.for = n.id; }
    function hide() { hideT = setTimeout(function () { rc.classList.remove("show"); rc.setAttribute("aria-hidden", "true"); }, 120); }
    nums.forEach(function (n) { n.addEventListener("mouseenter", function () { show(n); }); n.addEventListener("mouseleave", hide); n.addEventListener("focus", function () { show(n); }); n.addEventListener("blur", hide); n.addEventListener("click", function (e) { e.preventDefault(); if (rc.classList.contains("show") && rc.dataset.for === n.id) hide(); else show(n); }); });
    receiptScroll = function () { if (rc.classList.contains("show")) { var cur = doc.getElementById(rc.dataset.for); if (cur) place(cur); } };
    addEventListener("scroll", receiptScroll, { passive: true });
    var list = doc.getElementById("ledgerList"), auditBtn = doc.getElementById("auditBtn");
    order.forEach(function (id, k) {
      var r = RECEIPT_BY_ID[id], li = doc.createElement("li");
      li.innerHTML = '<span class="i">' + String(k + 1).padStart(2, "0") + "</span><span><b>" + esc(tx(r.value)) + " · " + esc(tx(r.label)) + '</b><span class="s">' + esc(r.source.kind) + " · " + esc(r.source.asOf) + '</span><br><span class="f">' + esc(tx(r.source.ref)) + '</span><br><span class="vf">' + esc(C.ui.receipt.verified[r.verified] || r.verified) + "</span></span>";
      li.tabIndex = 0; li.setAttribute("role", "button");
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
      li.addEventListener("click", function () { var n = doc.querySelector('.num[data-id="' + id + '"]'); if (!n) return; n.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); setTimeout(function () { n.focus({ preventScroll: true }); show(n); }, reduce ? 0 : 500); });
      list.appendChild(li);
    });
    function toggleAudit(on) { state.audit = on; doc.getElementById("ledger").inert = !on; doc.body.classList.toggle("audit", on); auditBtn.setAttribute("aria-pressed", on ? "true" : "false"); auditBtn.innerHTML = '<span class="dot"></span><span class="txt">' + esc(on ? C.ui.nav.receiptsOn : C.ui.nav.receiptsOff) + "</span>"; }
    auditBtn.addEventListener("click", function () { toggleAudit(!state.audit); });
    escapeHandler = function (e) { if (e.key === "Escape") { hide(); if (state.audit) { toggleAudit(false); auditBtn.focus({preventScroll:true}); } } };
    doc.addEventListener("keydown", escapeHandler);
    }
    cursor();
  }
  /* = render-c.js: ripple + goldfish cursor */
  function ring(px, py) { if (reduce) return; var r = doc.createElement("div"); r.className = "fish-ring"; r.style.transform = "translate(" + px + "px," + py + "px)"; doc.body.appendChild(r); setTimeout(function () { r.remove(); }, 850); }
  var cursorStarted = false;
  function cursor() {
    var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || reduce || T.cursor === false) { root.dataset.fish = "off"; return; }
    root.dataset.fish = "on";
    var el = doc.getElementById("fish"), CELL = 48, H = 8;
    var tx0 = lastX, ty0 = lastY, x = tx0, y = ty0, heading = 0, lastMove = performance.now(), idleFrame = 10, idleTick = 0, seen = false;
    function frame(i) { el.style.backgroundPosition = (-i * CELL) + "px 0"; }
    if (!cursorStarted) {
      cursorStarted = true;
      addEventListener("pointermove", function (e) { tx0 = e.clientX; ty0 = e.clientY; lastX = tx0; lastY = ty0; lastMove = performance.now(); if (!seen) { seen = true; x = tx0; y = ty0; } el.style.opacity = "1"; if (T.onPointer) T.onPointer(tx0, ty0); }, { passive: true });
      addEventListener("pointerdown", function (e) { ring(e.clientX, e.clientY); }, { passive: true });
      root.addEventListener("mouseleave", function () { var f = doc.getElementById("fish"); if (f) f.style.opacity = "0"; });
      (function tick(now) {
        el = doc.getElementById("fish"); if (!el) { requestAnimationFrame(tick); return; }
        var dx = tx0 - x, dy = ty0 - y, dist = Math.hypot(dx, dy); x += dx * .12; y += dy * .12; var flip = "";
        if (dist > 1.5) { var ang = Math.atan2(-dy, dx); heading = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / H)) % H; frame(heading); idleTick = 0; }
        else if (now - lastMove > 1600 && now - idleTick > 600) { idleTick = now; idleFrame = idleFrame === 8 ? 9 : idleFrame === 9 ? 10 : 8; if (heading === 0 || heading === 4) { frame(idleFrame); if (heading === 4) flip = " scaleX(-1)"; } }
        el.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)" + flip;
        requestAnimationFrame(tick);
      })(performance.now());
    }
    el.style.opacity = "0"; frame(0);
  }
  render();
  window.PROTO = { state: state, render: render, ring: ring, shelf: function () { return shelfApi; } };
})();
