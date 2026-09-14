/* shelf.js · bookshelf module for the narrative prototypes (F / G) · 2026-09-08
   Extracted from 05-E-prototype/shelf.html (which stays as it was). Classic script, no modules.
   window.renderShelf(container, opts) -> api { destroy(), takeDown(id), putBack(), openSpread(), closeSpread(), open }
   opts: { lang: "en"|"zh-Hans", layers: [{key, name, note}], books: SHELF.books, strings: COPY[lang].ui.shelf, palette?: [[bg, ink], ...] }
   Layer counts render as plain text (the host owns the receipts; the ledger must stay at the host's count).
   The two-page spread is a native <dialog> appended to document.body, so a transformed .rise ancestor cannot mis-position it. */
(function () {
  var DEFAULT_PAL = [["#FAFBF7", "#243E31"], ["#DCE5DA", "#243E31"], ["#A8BBB0", "#1F3229"], ["#365D49", "#F4F5F0"], ["#EBCFC4", "#5A2E22"], ["#F1EDE0", "#243E31"]];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  function renderShelf(container, opts) {
    var lang = opts.lang === "zh-Hans" ? "zh-Hans" : "en", books = opts.books || [], layers = opts.layers || [], PAL = opts.palette || DEFAULT_PAL;
    var STR = opts.strings || {}, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var open = null, dialog = null;
    function S(key, vars) { var s = STR[key] || key; if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); }); return s; }
    function layerOf(b) { return layers.filter(function (l) { return l.key === b.layer; })[0] || { name: b.layer, note: "" }; }
    function bookById(id) { return books.filter(function (x) { return x.id === id; })[0]; }
    function build() {
      var h = ['<div class="case"><div class="tiers">'];
      layers.forEach(function (ly) {
        var shown = books.filter(function (b) { return b.layer === ly.key && !b.hidden; });
        var hiddenN = books.filter(function (b) { return b.layer === ly.key && b.hidden; }).length;
        h.push('<div class="tier" data-layer="' + esc(ly.key) + '"><p class="lab"><b>' + esc(ly.name) + '</b><span class="count">' + (shown.length + hiddenN) + '</span><span class="note">' + esc(ly.note || "") + '</span></p><div class="row" role="list">' +
          shown.map(function (b) {
            var hs = hash(b.id + b.en), p = PAL[hs % PAL.length], w = Math.max(30, Math.min(46, 22 + b.en.length * 0.55)), ht = 176 + (hs % 5) * 9;
            var title = lang === "en" || !b.zh ? b.en : b.zh;
            return '<button type="button" class="book' + (b.open ? " en" : "") + '" role="listitem" data-id="' + esc(b.id) + '" style="--w:' + w + 'px;--h:' + ht + 'px;--h0:' + ht + 'px;--c:' + p[0] + ';--ink:' + p[1] + '" aria-label="' + esc(b.en) + '"><span class="t' + (lang !== "en" && b.zh ? " zh" : "") + '">' + esc(title) + "</span></button>";
          }).join("") + '</div><div class="plank"></div></div>');
        if (hiddenN) h.push('<p class="tier-note">' + esc(S("hiddenNote", { n: hiddenN })) + "</p>");
      });
      h.push('</div><aside class="desk">' + idleCard() + "</aside></div>");
      container.classList.add("bookshelf"); container.innerHTML = h.join("");
    }
    function idleCard() { return '<div class="card idle"><p class="hand">' + esc(S("idleTitle")) + "</p>" + esc(S("idleBody")) + "</div>"; }
    function coverCard(b) {
      var ly = layerOf(b), hs = hash(b.id + b.en), p = PAL[hs % PAL.length], when = b.when ? b.when : S("undated");
      return '<div class="card"><div class="cover" style="--c:' + p[0] + ';--ink:' + p[1] + '">' + (b.open ? '<span class="tab" aria-hidden="true"></span>' : "") +
        '<span class="k">' + esc(b.id) + " · " + esc(ly.name) + "</span><h2>" + esc(b.en) + "</h2>" + (b.zh ? '<span class="zh">' + esc(b.zh) + "</span>" : "") +
        '<span class="foot">' + esc(lang === "en" ? b.type_en : b.type_zh) + "<br>" + esc(when) + (b.bytes ? "<br>" + (b.bytes / 1024).toFixed(0) + " KB" : "") + "</span></div>" +
        '<div class="act">' + (b.open ? '<button type="button" data-act="open">' + esc(S("read")) + " →</button>" : '<button type="button" disabled>' + esc(S("coverOnly")) + "</button>") +
        '<button type="button" class="alt" data-act="back">' + esc(S("putBack")) + "</button></div>" +
        '<p class="why">' + esc(b.open ? S("whyOpen") : S("whyCover")) + "</p></div>";
    }
    function spreadHtml(b) {
      return '<div class="pages"><button type="button" class="close" data-act="close">' + esc(S("close")) + '</button>' +
        '<div class="pg l"><span class="k">' + esc(b.id) + " · " + esc(S("writtenInEnglish")) + "</span><h2>" + esc(b.en) + "</h2><p>" + esc(S("spreadSample")) + "</p>" +
        '<div class="lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="folio">' + esc(b.en).toUpperCase() + "</span></div>" +
        '<div class="pg r"><span class="k">' + esc(lang === "en" ? b.type_en : b.type_zh) + (b.bytes ? " · " + (b.bytes / 1024).toFixed(0) + " KB" : "") + '</span><div class="lines" style="margin-top:2rem" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="folio">' + esc(S("spreadFolio")) + "</span></div></div>";
    }
    function takeDown(b) {
      if (typeof b === "string") b = bookById(b); if (!b) return;
      container.querySelectorAll(".book.out").forEach(function (x) { x.classList.remove("out"); });
      container.querySelectorAll(".row.dim").forEach(function (x) { x.classList.remove("dim"); });
      var el = container.querySelector('.book[data-id="' + b.id + '"]'); if (el) { el.classList.add("out"); el.closest(".row").classList.add("dim"); }
      open = b; container.querySelector(".desk").innerHTML = coverCard(b);
    }
    function putBack() {
      container.querySelectorAll(".book.out").forEach(function (x) { x.classList.remove("out"); });
      container.querySelectorAll(".row.dim").forEach(function (x) { x.classList.remove("dim"); });
      open = null; container.querySelector(".desk").innerHTML = idleCard();
    }
    function ensureDialog() {
      if (dialog) return dialog;
      dialog = document.createElement("dialog"); dialog.className = "shelf-spread"; dialog.setAttribute("aria-label", S("spreadFolio"));
      dialog.addEventListener("click", function (e) { if (e.target === dialog || e.target.closest('[data-act="close"]')) dialog.close(); });
      dialog.addEventListener("close", function () { dialog.innerHTML = ""; var b = open && container.querySelector('.book[data-id="' + open.id + '"]'); if (b) b.focus({ preventScroll: true }); });
      document.body.appendChild(dialog); return dialog;
    }
    function openSpread() { if (!open || !open.open) return; var d = ensureDialog(); d.innerHTML = spreadHtml(open); if (!d.open) d.showModal(); }
    function closeSpread() { if (dialog && dialog.open) dialog.close(); }
    function onClick(e) {
      var bk = e.target.closest(".book");
      if (bk) { var b = bookById(bk.dataset.id); if (!b) return; if (open && open.id === b.id) putBack(); else takeDown(b); return; }
      var act = e.target.closest("[data-act]"); if (!act) return;
      if (act.dataset.act === "back") putBack(); else if (act.dataset.act === "open") openSpread();
    }
    function onKey(e) { if (e.key !== "Escape") return; if (dialog && dialog.open) return; if (open) putBack(); }
    build();
    container.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return {
      destroy: function () { container.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); if (dialog) { if (dialog.open) dialog.close(); dialog.remove(); dialog = null; } container.innerHTML = ""; container.classList.remove("bookshelf"); open = null; },
      takeDown: takeDown, putBack: putBack, openSpread: openSpread, closeSpread: closeSpread,
      get open() { return open; }, reduce: reduce
    };
  }
  window.renderShelf = renderShelf;
})();
