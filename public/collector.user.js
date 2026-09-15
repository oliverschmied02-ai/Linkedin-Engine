// ==UserScript==
// @name         LinkedIn Engine Collector
// @namespace    linkedin-engine
// @version      0.3.0
// @description  Liest Posts aus deinem LinkedIn-Feed / von Profilseiten aus und schickt sie an deine LinkedIn Engine. Fügt freigegebene Kommentare in die Kommentarbox ein (Absenden machst du selbst).
// @match        https://www.linkedin.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable no-console */
(function () {
  "use strict";

  // ---------------------------------------------------------------- Config --
  const cfg = {
    get appUrl() { return (GM_getValue("appUrl", "") || "").replace(/\/$/, ""); },
    set appUrl(v) { GM_setValue("appUrl", v); },
    get key() { return GM_getValue("collectorKey", ""); },
    set key(v) { GM_setValue("collectorKey", v); },
    get onlyWatched() { return GM_getValue("onlyWatched", true); },
    set onlyWatched(v) { GM_setValue("onlyWatched", v); },
  };

  function api(path, method, body) {
    return new Promise((resolve, reject) => {
      if (!cfg.appUrl || !cfg.key) return reject(new Error("Bitte erst App-URL und Collector-Key setzen (Zahnrad)."));
      GM_xmlhttpRequest({
        method,
        url: cfg.appUrl + path,
        headers: { "Content-Type": "application/json", "x-collector-key": cfg.key },
        data: body ? JSON.stringify(body) : undefined,
        onload: (r) => {
          try {
            const j = JSON.parse(r.responseText);
            if (r.status >= 200 && r.status < 300) resolve(j);
            else reject(new Error(j.error || `HTTP ${r.status}`));
          } catch { reject(new Error(`Antwort nicht lesbar (HTTP ${r.status})`)); }
        },
        onerror: () => reject(new Error("Netzwerkfehler — App-URL korrekt?")),
      });
    });
  }

  // ------------------------------------------------------------- Selectors --
  // LinkedIn ändert das DOM regelmäßig. Alle Selektoren stehen hier gesammelt,
  // damit du sie bei Bedarf an einer Stelle nachziehen kannst.
  const SEL = {
    postContainers: [
      "div.feed-shared-update-v2",
      "div[data-urn*='urn:li:activity']",
      "div[data-id*='urn:li:activity']",
      "div.occludable-update",
    ],
    authorName: [
      ".update-components-actor__title span[aria-hidden='true']",
      ".update-components-actor__title",
      ".feed-shared-actor__name",
    ],
    authorHeadline: [".update-components-actor__description", ".feed-shared-actor__description"],
    authorLink: [".update-components-actor__meta-link", ".update-components-actor__container-link", "a.app-aware-link[href*='/in/']"],
    age: [".update-components-actor__sub-description", ".feed-shared-actor__sub-description"],
    text: [".update-components-text", ".feed-shared-inline-show-more-text", ".update-components-update-v2__commentary"],
    reactions: [".social-details-social-counts__reactions-count", "button[data-reaction-details] span", ".social-details-social-counts__social-proof-fallback-number"],
    comments: ["li.social-details-social-counts__comments button", ".social-details-social-counts__comments"],
    commentEditor: [".comments-comment-box .ql-editor", ".comments-comment-texteditor .ql-editor", "div.ql-editor[contenteditable='true']"],
    commentButton: ["button.comments-comment-box__submit-button", "button.comments-comment-box__submit-button--cr"],
  };

  const pick = (root, list) => {
    for (const s of list) { const el = root.querySelector(s); if (el) return el; }
    return null;
  };
  const txt = (el) => (el ? el.innerText.replace(/\s+\n/g, "\n").trim() : "");

  function extractUrn(node) {
    const raw = node.getAttribute("data-urn") || node.getAttribute("data-id") || "";
    let m = raw.match(/urn:li:activity:\d+/);
    if (m) return m[0];
    const inner = node.querySelector("[data-urn*='urn:li:activity'],[data-id*='urn:li:activity']");
    if (inner) {
      m = (inner.getAttribute("data-urn") || inner.getAttribute("data-id") || "").match(/urn:li:activity:\d+/);
      if (m) return m[0];
    }
    const link = node.querySelector("a[href*='activity-']");
    if (link) { m = link.href.match(/activity-(\d+)/); if (m) return `urn:li:activity:${m[1]}`; }
    return null;
  }

  function parseCount(s) {
    if (!s) return 0;
    const clean = s.replace(/\./g, "").replace(/,/g, ".").trim();
    const m = clean.match(/([\d.]+)\s*([KkMm])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]) || 0;
    if (/[Kk]/.test(m[2] || "")) n *= 1000;
    if (/[Mm]/.test(m[2] || "")) n *= 1000000;
    return Math.round(n);
  }

  function scrapePosts() {
    const nodes = new Set();
    for (const s of SEL.postContainers) document.querySelectorAll(s).forEach((n) => nodes.add(n));

    const out = [];
    const seen = new Set();
    for (const node of nodes) {
      // verschachtelte Container überspringen
      if ([...nodes].some((other) => other !== node && other.contains(node))) continue;
      const urn = extractUrn(node);
      if (!urn || seen.has(urn)) continue;

      const text = txt(pick(node, SEL.text)).replace(/\s*…mehr$|\s*…see more$/i, "");
      if (!text || text.length < 40) continue;

      const linkEl = pick(node, SEL.authorLink);
      const authorUrl = linkEl ? (linkEl.href || "").split("?")[0] : "";
      if (authorUrl && !authorUrl.includes("/in/")) continue; // Unternehmensseiten ignorieren

      seen.add(urn);
      out.push({
        urn,
        url: `https://www.linkedin.com/feed/update/${urn}/`,
        authorName: txt(pick(node, SEL.authorName)).split("\n")[0],
        authorUrl,
        authorHeadline: txt(pick(node, SEL.authorHeadline)).split("\n")[0],
        text,
        postedAtText: txt(pick(node, SEL.age)).split("•").pop().trim(),
        reactions: parseCount(txt(pick(node, SEL.reactions))),
        comments: parseCount(txt(pick(node, SEL.comments))),
        source: location.pathname.includes("recent-activity") ? "activity" : "feed",
      });
    }
    return out;
  }

  // "…mehr" aufklappen, damit ganze Posts erfasst werden
  function expandAll() {
    const buttons = document.querySelectorAll(
      ".feed-shared-inline-show-more-text__see-more-less-toggle, button.see-more, .inline-show-more-text__button"
    );
    buttons.forEach((b) => { try { if (/mehr|more/i.test(b.innerText)) b.click(); } catch {} });
    return buttons.length;
  }

  // Sanftes, menschliches Scrollen – kein Dauerfeuer.
  async function autoScroll(rounds) {
    for (let i = 0; i < rounds; i++) {
      window.scrollBy({ top: window.innerHeight * 0.9, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 900));
      expandAll();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // -------------------------------------------------------------------- UI --
  const style = document.createElement("style");
  style.textContent = `
  #le-panel{position:fixed;right:16px;bottom:16px;z-index:99999;width:320px;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;
    background:#171a21;color:#e7eaf0;border:1px solid #2b3140;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.45);overflow:hidden}
  #le-panel header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#11141a;border-bottom:1px solid #2b3140}
  #le-panel header b{flex:1;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8b93a7;font-weight:600}
  #le-panel .body{padding:12px;display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto}
  #le-panel button{cursor:pointer;border-radius:8px;border:1px solid #2b3140;background:#1e222c;color:#e7eaf0;padding:8px 10px;font-size:13px}
  #le-panel button:hover{background:#262b36}
  #le-panel button.primary{background:#2f5dd6;border-color:#3a6ae8}
  #le-panel button.primary:hover{background:#3a6ae8}
  #le-panel .row{display:flex;gap:6px}
  #le-panel .row button{flex:1}
  #le-log{font-size:12px;color:#8b93a7;white-space:pre-wrap;min-height:18px}
  #le-panel input{width:100%;box-sizing:border-box;background:#0f1115;border:1px solid #2b3140;color:#e7eaf0;border-radius:8px;padding:7px 9px;font-size:12px}
  #le-panel .item{border:1px solid #2b3140;border-radius:8px;padding:8px;background:#11141a}
  #le-panel .item .who{font-weight:600;font-size:12px}
  #le-panel .item .pv{color:#8b93a7;font-size:11px;margin:4px 0}
  #le-panel .item .ct{font-size:12px;margin-bottom:6px;white-space:pre-wrap}
  #le-panel.min .body{display:none}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "le-panel";
  panel.innerHTML = `
    <header>
      <b>LinkedIn Engine</b>
      <button id="le-cfg" title="Einstellungen">⚙</button>
      <button id="le-min" title="Ein-/ausklappen">–</button>
    </header>
    <div class="body">
      <button class="primary" id="le-collect">Sichtbare Posts einsammeln</button>
      <div class="row">
        <button id="le-scroll">Scrollen + sammeln</button>
        <button id="le-triage">Triage starten</button>
      </div>
      <button id="le-outbox">Freigegebene Kommentare laden</button>
      <div id="le-log"></div>
      <div id="le-list"></div>
    </div>`;
  document.body.appendChild(panel);

  const log = (m) => { document.getElementById("le-log").textContent = m; };
  document.getElementById("le-min").onclick = () => panel.classList.toggle("min");

  document.getElementById("le-cfg").onclick = () => {
    const url = prompt("App-URL (z.B. https://deine-app.up.railway.app)", cfg.appUrl);
    if (url !== null) cfg.appUrl = url.trim();
    const key = prompt("Collector-Key (COLLECTOR_KEY aus den Railway-Variablen)", cfg.key);
    if (key !== null) cfg.key = key.trim();
    log("Einstellungen gespeichert.");
  };

  async function collect(label) {
    expandAll();
    await new Promise((r) => setTimeout(r, 600));
    const posts = scrapePosts();
    if (!posts.length) { log(`${label}: nichts gefunden. Seite geladen?`); return; }
    log(`${label}: ${posts.length} Posts gefunden, sende …`);
    try {
      const r = await api("/api/ingest", "POST", { posts, onlyWatched: cfg.onlyWatched });
      log(`${r.created} neu · ${r.duplicates} bekannt · ${r.skippedUnwatched} nicht auf Watchlist`);
    } catch (e) { log("Fehler: " + e.message); }
  }

  document.getElementById("le-collect").onclick = () => collect("Sammeln");

  document.getElementById("le-scroll").onclick = async () => {
    log("Scrolle …");
    await autoScroll(6);
    await collect("Scrollen");
  };

  document.getElementById("le-triage").onclick = async () => {
    log("Triage läuft (kann ~30s dauern) …");
    try { const r = await api("/api/triage/run", "POST", { limit: 15 }); log(`${r.triaged} Posts bewertet. Weiter in der App.`); }
    catch (e) { log("Fehler: " + e.message); }
  };

  document.getElementById("le-outbox").onclick = async () => {
    log("Lade Outbox …");
    try {
      const r = await api("/api/outbox", "GET");
      const list = document.getElementById("le-list");
      list.innerHTML = "";
      if (!r.drafts.length) { log("Keine freigegebenen Kommentare."); return; }
      log(`${r.drafts.length} freigegeben.`);
      for (const d of r.drafts) {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `<div class="who"></div><div class="pv"></div><div class="ct"></div>
          <div class="row"><button class="go">Post öffnen</button><button class="ins primary">Einfügen</button></div>`;
        el.querySelector(".who").textContent = d.authorName;
        el.querySelector(".pv").textContent = d.postPreview + "…";
        el.querySelector(".ct").textContent = d.text;
        el.querySelector(".go").onclick = () => { sessionStorage.setItem("le-pending", JSON.stringify(d)); location.href = d.url; };
        el.querySelector(".ins").onclick = () => insertComment(d);
        list.appendChild(el);
      }
    } catch (e) { log("Fehler: " + e.message); }
  };

  function insertComment(d) {
    const ed = pick(document, SEL.commentEditor);
    if (!ed) { log("Keine Kommentarbox gefunden — Post öffnen und 'Kommentieren' anklicken."); return; }
    ed.focus();
    ed.innerHTML = "";
    for (const line of d.text.split("\n")) {
      const p = document.createElement("p");
      p.textContent = line;
      ed.appendChild(p);
    }
    ed.dispatchEvent(new InputEvent("input", { bubbles: true }));
    log("Eingefügt. Prüfen und selbst absenden — dann hier 'Gepostet' klicken.");

    const done = document.createElement("button");
    done.textContent = "✓ Als gepostet markieren";
    done.className = "primary";
    done.style.width = "100%";
    done.onclick = async () => {
      try { await api(`/api/drafts/${d.id}`, "PATCH", { status: "posted" }); log("Als gepostet markiert."); done.remove(); }
      catch (e) { log("Fehler: " + e.message); }
    };
    document.getElementById("le-list").prepend(done);
  }

  // Nach Navigation auf einen Post: gemerkten Kommentar anbieten
  const pending = sessionStorage.getItem("le-pending");
  if (pending) {
    sessionStorage.removeItem("le-pending");
    setTimeout(() => { try { insertComment(JSON.parse(pending)); } catch {} }, 2500);
  }

  if (!cfg.appUrl || !cfg.key) log("Noch nicht konfiguriert — Zahnrad anklicken.");
})();
