/* Générateur de titres de stream — Twitch Helix + Claude, 100 % côté navigateur */
(() => {
"use strict";
const APP_VERSION = "7";

/* ======================== utilitaires ======================== */
const CFG = window.APP_CONFIG || {};
const CID = (CFG.TWITCH_CLIENT_ID || "").trim();
const TWITCH_READY = CID && !/^COLLE/i.test(CID);
const REDIRECT = (CFG.REDIRECT_URI || "").trim() || (location.origin + location.pathname);
const SCOPES = "channel:manage:broadcast";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => (typeof u === "string" && u.startsWith("https://")) ? u : "";
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
function banner(html) { $("banner").innerHTML = html || ""; }

/* ======================== Twitch ======================== */
const tw = { token: store.get("tt-token", null), user: null, channel: null };

function twitchLogin() {
  const state = crypto.getRandomValues(new Uint32Array(4)).join("-");
  try { sessionStorage.setItem("tt-state", state); } catch (e) {}
  const p = new URLSearchParams({ client_id: CID, redirect_uri: REDIRECT, response_type: "token", scope: SCOPES, state });
  location.href = "https://id.twitch.tv/oauth2/authorize?" + p;
}

function readOAuthReturn() {
  const q = new URLSearchParams(location.search);
  if (q.get("error")) {
    banner(`<div class="err">Connexion Twitch refusée ou annulée : ${esc(q.get("error_description") || q.get("error"))}</div>`);
    history.replaceState(null, "", location.pathname);
    return;
  }
  if (!location.hash.includes("access_token")) return;
  const h = new URLSearchParams(location.hash.slice(1));
  let expected = null; try { expected = sessionStorage.getItem("tt-state"); sessionStorage.removeItem("tt-state"); } catch (e) {}
  history.replaceState(null, "", location.pathname + location.search);
  if (!expected || h.get("state") !== expected) { banner(`<div class="err">Réponse de connexion Twitch invalide (state différent). Réessaie.</div>`); return; }
  tw.token = h.get("access_token");
  store.set("tt-token", tw.token);
}

function clearSession(reason) {
  tw.token = null; tw.user = null; tw.channel = null; store.del("tt-token");
  renderAccount(); renderNow(); updateSearchHint();
  if (reason) banner(`<div class="err">${esc(reason)}</div>`);
}

async function validate() {
  if (!tw.token) return false;
  try {
    const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: "OAuth " + tw.token } });
    if (r.status === 401) { clearSession("Ta session Twitch a expiré : reconnecte-toi."); return false; }
    if (!r.ok) return !!tw.user;
    const d = await r.json();
    if (!tw.user || tw.user.id !== d.user_id) tw.user = { id: d.user_id, login: d.login, name: d.login, img: "" };
    tw.scopes = d.scopes || [];
    return true;
  } catch (e) { return !!tw.user; }
}

async function helix(path, opts = {}) {
  const r = await fetch("https://api.twitch.tv/helix/" + path, {
    ...opts,
    headers: { "Authorization": "Bearer " + tw.token, "Client-Id": CID, ...(opts.body ? { "Content-Type": "application/json" } : {}) }
  });
  if (r.status === 401) { clearSession("Ta session Twitch a expiré : reconnecte-toi."); throw new Error("401"); }
  if (r.status === 204) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.message || ("Erreur Twitch " + r.status)); e.status = r.status; throw e; }
  return d;
}

const boxArt = (u, w = 60, h = 80) => safeUrl((u || "").replace("{width}", w).replace("{height}", h).replace(/-\d+x\d+\./, `-${w}x${h}.`));

async function loadMe() {
  try {
    const u = await helix("users?id=" + encodeURIComponent(tw.user.id));
    const d = u && u.data && u.data[0];
    if (d) tw.user = { id: d.id, login: d.login, name: d.display_name || d.login, img: safeUrl(d.profile_image_url) };
  } catch (e) {}
  renderAccount();
  await loadChannel();
}
async function loadChannel() {
  try {
    const c = await helix("channels?broadcaster_id=" + encodeURIComponent(tw.user.id));
    tw.channel = c && c.data && c.data[0] || null;
  } catch (e) { tw.channel = null; }
  renderNow();
  if (tw.channel && tw.channel.game_id && !game) {
    pick({ id: tw.channel.game_id, name: tw.channel.game_name, art: "", src: "Catégorie actuelle de ta chaîne" });
    fillArt();
  }
}
async function fillArt() {
  if (!game || !game.id || game.art) return;
  try { const g = await helix("games?id=" + encodeURIComponent(game.id)); const d = g && g.data && g.data[0]; if (d) { game.art = boxArt(d.box_art_url, 78, 104); store.set("tt-game", game); showPicked(); } } catch (e) {}
}

async function logout() {
  const t = tw.token;
  clearSession();
  if (t) { try { await fetch("https://id.twitch.tv/oauth2/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: CID, token: t }) }); } catch (e) {} }
  toast("Déconnecté de Twitch");
}

function renderAccount() {
  const a = $("account");
  if (!TWITCH_READY) { a.innerHTML = ""; return; }
  if (tw.user) {
    a.innerHTML = `<span class="who">${tw.user.img ? `<img src="${esc(tw.user.img)}" alt="">` : ""}<span></span></span><button class="sec" type="button" id="logout">Déconnexion</button>`;
    a.querySelector(".who span").textContent = tw.user.name;
    $("logout").addEventListener("click", logout);
  } else {
    a.innerHTML = `<button class="twitch" type="button" id="login"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3 3 7v12h4v2h3l2-2h3l5-5V3H4zm14 10-3 3h-3l-2 2v-2H7V5h11v8zm-3-5h-2v4h2V8zm-4 0H9v4h2V8z"/></svg>Se connecter avec Twitch</button>`;
    $("login").addEventListener("click", twitchLogin);
  }
}
function renderNow() {
  const n = $("now");
  if (!tw.channel) { n.hidden = true; return; }
  n.hidden = false;
  $("nowTitle").textContent = tw.channel.title || "(aucun titre)";
  $("nowGame").textContent = tw.channel.game_name ? "Catégorie : " + tw.channel.game_name : "";
}

async function applyTitle(title, btn) {
  if (!tw.user) { twitchLogin(); return; }
  const t = title.trim();
  if (!t) { toast("Le titre est vide"); return; }
  if ([...t].length > 140) { toast("Trop long : 140 caractères maximum sur Twitch"); return; }
  const body = { title: t };
  if ($("setGame").checked && game && game.id) body.game_id = game.id;
  btn.disabled = true; const old = btn.textContent; btn.textContent = "Envoi…";
  try {
    await helix("channels?broadcaster_id=" + encodeURIComponent(tw.user.id), { method: "PATCH", body: JSON.stringify(body) });
    toast(body.game_id ? "Titre et catégorie mis à jour sur ta chaîne" : "Titre mis à jour sur ta chaîne");
    await loadChannel();
  } catch (e) {
    if (e.message !== "401") toast(e.status === 403 ? "Twitch refuse : permission manquante, reconnecte-toi." : "Échec : " + e.message);
  } finally { btn.disabled = false; btn.textContent = old; }
}

/* ======================== catalogue de secours (hors connexion) ======================== */
const OFFLINE = ["Just Chatting","IRL","League of Legends","Teamfight Tactics","Valorant","Counter-Strike","Fortnite","Minecraft","Grand Theft Auto V","World of Warcraft","Apex Legends","Call of Duty: Warzone","Marvel Rivals","Overwatch 2","Rocket League","EA Sports FC 26","Dead by Daylight","Rust","Escape from Tarkov","Arc Raiders","Battlefield 6","Elden Ring","Baldur's Gate 3","Lethal Company","Phasmophobia","Path of Exile 2","Diablo IV","Hollow Knight: Silksong","Monster Hunter Wilds","Balatro","Stardew Valley","The Sims 4","Genshin Impact","Dofus","Mario Kart World","Pokémon Legends: Z-A","Street Fighter 6","Tekken 8","Sea of Thieves","Peak","R.E.P.O.","Among Us","Fall Guys","GeoGuessr","Chess","Music","Art","Retro"];

/* ======================== recherche de jeu ======================== */
const q = $("q"), lst = $("lst");
let game = store.get("tt-game", null), hi = -1, matches = [], searchSeq = 0, searchT, topCache = null;

function updateSearchHint() {
  $("searchHint").textContent = !TWITCH_READY
    ? "Mode démo : ajoute ton Client ID Twitch dans config.js pour chercher dans tout le catalogue."
    : tw.token ? "Recherche en direct dans le catalogue Twitch. Tape le nom et choisis dans la liste."
    : "Connecte-toi avec Twitch pour chercher dans tout le catalogue. En attendant, une liste réduite est disponible.";
  $("setGameWrap").hidden = !(tw.token && game && game.id);
}

function drawList(items, extra) {
  matches = items;
  let h = items.map((g, i) => `<div class="opt" role="option" id="o${i}" data-i="${i}" aria-selected="${i === hi}">${g.art ? `<img src="${esc(g.art)}" alt="" loading="lazy">` : `<i class="ph"></i>`}<span>${esc(g.name)}</span>${g.tag ? `<small>${esc(g.tag)}</small>` : ""}</div>`).join("");
  const v = q.value.trim();
  if (v && !items.some(g => norm(g.name) === norm(v))) h += `<div class="opt" role="option" data-custom="1"><i class="ph"></i><span>Utiliser « ${esc(v)} »</span><small>nom libre</small></div>`;
  if (extra) h += `<div class="opt info">${esc(extra)}</div>`;
  lst.innerHTML = h || `<div class="opt info">Aucun résultat</div>`;
  lst.classList.add("on"); q.setAttribute("aria-expanded", "true");
}
async function search() {
  const v = q.value.trim(), seq = ++searchSeq;
  if (tw.token) {
    try {
      let items;
      if (!v) {
        if (!topCache) { const d = await helix("games/top?first=20"); topCache = (d.data || []).map(g => ({ id: g.id, name: g.name, art: boxArt(g.box_art_url), tag: "Top" })); }
        items = topCache;
      } else {
        const d = await helix("search/categories?first=20&query=" + encodeURIComponent(v));
        items = (d.data || []).map(g => ({ id: g.id, name: g.name, art: boxArt(g.box_art_url) }));
      }
      if (seq === searchSeq) drawList(items, !v ? "Les catégories les plus regardées en ce moment" : "");
      return;
    } catch (e) { if (seq === searchSeq && e.message !== "401") drawList([], "Recherche Twitch indisponible : " + e.message); return; }
  }
  const n = norm(v);
  drawList(OFFLINE.filter(g => norm(g).includes(n)).slice(0, 30).map(name => ({ id: null, name, art: "" })));
}
function closeList() { lst.classList.remove("on"); q.setAttribute("aria-expanded", "false"); hi = -1; }
function pick(g) {
  game = { id: g.id || null, name: g.name.slice(0, 100), art: g.art ? boxArt(g.art, 78, 104) : "", src: g.src || (g.id ? "Catalogue Twitch" : "Nom libre") };
  store.set("tt-game", game); q.value = ""; closeList(); showPicked();
}
function showPicked() {
  $("picked").hidden = !game;
  if (game) {
    $("pickedName").textContent = game.name;
    $("pickedSrc").textContent = game.src || "";
    const im = $("pickedImg"); if (game.art) { im.src = game.art; im.hidden = false; } else { im.removeAttribute("src"); im.hidden = true; }
  }
  updateSearchHint(); ctxLine();
}
q.addEventListener("focus", () => search());
q.addEventListener("input", () => { hi = -1; clearTimeout(searchT); searchT = setTimeout(search, tw.token ? 250 : 0); });
q.addEventListener("keydown", e => {
  if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hi + 1, matches.length - 1); lst.querySelectorAll(".opt").forEach((o, i) => o.setAttribute("aria-selected", i === hi)); $("o" + hi)?.scrollIntoView({ block: "nearest" }); }
  else if (e.key === "ArrowUp") { e.preventDefault(); hi = Math.max(hi - 1, 0); lst.querySelectorAll(".opt").forEach((o, i) => o.setAttribute("aria-selected", i === hi)); $("o" + hi)?.scrollIntoView({ block: "nearest" }); }
  else if (e.key === "Enter") {
    e.preventDefault();
    if (hi >= 0 && matches[hi]) pick(matches[hi]);
    else if (q.value.trim()) { const m = matches.find(g => norm(g.name) === norm(q.value.trim())); pick(m || { name: q.value.trim() }); }
  } else if (e.key === "Escape") closeList();
});
lst.addEventListener("mousedown", e => {
  const o = e.target.closest(".opt"); if (!o || o.classList.contains("info")) return; e.preventDefault();
  if (o.dataset.custom) pick({ name: q.value.trim() }); else if (o.dataset.i) pick(matches[+o.dataset.i]);
});
document.addEventListener("click", e => { if (!e.target.closest(".combo")) closeList(); });
$("unpick").addEventListener("click", () => { game = null; store.set("tt-game", null); showPicked(); q.focus(); });

/* ======================== humeurs, apéro, options ======================== */
const MOODS = [["chill","Chill"],["tryhard","Tryhard"],["rage","Rage"],["delire","Délire"],["hype","Hype"],["fatigue","Fatigué"],["nostalgie","Nostalgique"],["decouverte","Découverte"],["sombre","Ambiance flippante"],["motive","Motivé"],["pote","Entre potes"],["challenge","Challenge"]];
const LEVELS = ["", "Un petit verre", "Apéro classique", "Apéro dînatoire", "Soirée qui déraille"];
let moods = new Set(store.get("tt-moods", ["chill"]));
$("moods").innerHTML = MOODS.map(([k, l]) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${moods.has(k)}">${l}</button>`).join("");
$("moods").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return; const k = b.dataset.k;
  if (moods.has(k)) moods.delete(k);
  else { if (moods.size >= 3) { const first = [...moods][0]; moods.delete(first); $("moods").querySelector(`[data-k="${first}"]`).setAttribute("aria-pressed", "false"); } moods.add(k); }
  b.setAttribute("aria-pressed", moods.has(k)); store.set("tt-moods", [...moods]); ctxLine();
});
const box = $("aperoBox");
for (let i = 0; i < 7; i++) { const s = document.createElement("i"); s.className = "bub"; s.style.left = (8 + i * 13) + "%"; s.style.animationDelay = (i * .45) + "s"; s.style.width = s.style.height = (5 + (i % 3) * 3) + "px"; box.appendChild(s); }
function setApero() { document.body.classList.toggle("apero", $("apero").checked); $("lvlName").textContent = LEVELS[$("lvl").value]; store.set("tt-apero", [$("apero").checked, $("lvl").value]); ctxLine(); }
const sa = store.get("tt-apero", [false, "2"]); $("apero").checked = !!sa[0]; $("lvl").value = sa[1];
$("apero").addEventListener("change", setApero); $("lvl").addEventListener("input", setApero);
["lang", "len", "emo", "ctx", "cmd", "setGame"].forEach(id => {
  const el = $(id), v = store.get("tt-" + id, null);
  if (v !== null) { if (el.type === "checkbox") el.checked = v; else el.value = v; }
  el.addEventListener("change", () => store.set("tt-" + id, el.type === "checkbox" ? el.checked : el.value));
});
function ctxLine() {
  const m = [...moods].map(k => MOODS.find(x => x[0] === k)[1]);
  const parts = [game ? game.name : "Aucun jeu", m.join(", ") || "humeur libre"];
  if ($("apero").checked) parts.push("apéro : " + LEVELS[$("lvl").value].toLowerCase());
  $("ctxLine").textContent = view === "new" ? parts.join(" · ") : "";
}

/* ======================== réglages IA ======================== */
const PROVIDERS = {
  groq: {
    label: "Groq", keyLabel: "Clé API Groq", placeholder: "gsk_…",
    hint: 'Gratuite, sans carte bancaire : crée-la sur <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>.',
    models: [["openai/gpt-oss-120b", "GPT-OSS 120B (recommandé, bon en français)"], ["llama-3.3-70b-versatile", "Llama 3.3 70B"], ["openai/gpt-oss-20b", "GPT-OSS 20B (plus rapide)"]],
    def: CFG.GROQ_MODEL || "openai/gpt-oss-120b"
  },
  claude: {
    label: "Claude", keyLabel: "Clé API Anthropic", placeholder: "sk-ant-…",
    hint: 'Payante à l\'usage (fraction de centime par génération) : crée-la sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> et fixe une limite de dépense.',
    models: [["claude-haiku-5-5", "Claude Haiku 5.5 (rapide, économique)"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 (plus créatif)"]],
    def: CFG.CLAUDE_MODEL || "claude-haiku-5-5"
  },
  local: {
    label: "IA locale", keyLabel: "Adresse de ton serveur d'IA local", placeholder: "http://localhost:11434/v1", local: true,
    hint: "Ollama : http://localhost:11434/v1 · LM Studio : http://localhost:1234/v1. Le site doit être autorisé côté serveur (voir le README).",
    models: [], def: CFG.LOCAL_MODEL || ""
  }
};
const ai = {
  provider: store.get("tt-provider", CFG.AI_PROVIDER === "claude" ? "claude" : "groq"),
  keys: store.get("tt-keys", {}),
  models: store.get("tt-models", {})
};
if (!PROVIDERS[ai.provider]) ai.provider = "groq";
{ const legacy = store.get("tt-key", ""); if (legacy && !ai.keys.claude) { ai.keys.claude = legacy; store.set("tt-keys", ai.keys); store.del("tt-key"); } }
const aiKey = () => ai.provider === "local" ? (ai.keys.local && ai.models.local ? ai.keys.local : "") : (ai.keys[ai.provider] || "").trim();
const aiModel = () => ai.models[ai.provider] || PROVIDERS[ai.provider].def;
const dlg = $("settings");
function fillProvider(p) {
  const P = PROVIDERS[p];
  $("keyL").textContent = P.keyLabel; $("key").placeholder = P.placeholder; $("keyHint").innerHTML = P.hint;
  $("key").type = P.local ? "text" : "password";
  $("key").value = ai.keys[p] || (P.local ? (CFG.LOCAL_URL || "http://localhost:11434/v1") : "");
  $("forgetKey").textContent = P.local ? "Effacer l'adresse" : "Effacer la clé";
  const sel = $("model"), cur = ai.models[p] || P.def;
  if (P.local) { loadLocalModels(); return; }
  sel.innerHTML = P.models.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
  if (!P.models.some(m => m[0] === cur)) sel.add(new Option(cur, cur));
  sel.value = cur;
}
/* IA locale (Ollama, LM Studio…) : API compatible OpenAI sur ton PC */
const localBase = u => String(u || "").trim().replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
let localSeq = 0;
async function loadLocalModels() {
  const sel = $("model"), base = localBase($("key").value), seq = ++localSeq;
  sel.innerHTML = '<option value="">Recherche des modèles…</option>';
  try {
    const r = await fetch(base + "/models");
    const d = await r.json();
    const ids = (d.data || []).map(m => m && m.id).filter(Boolean);
    if (seq !== localSeq) return;
    if (!ids.length) throw new Error("vide");
    sel.innerHTML = ids.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join("");
    if (ai.models.local && ids.includes(ai.models.local)) sel.value = ai.models.local;
    $("keyHint").textContent = `Connecté à ton IA locale : ${ids.length} modèle${ids.length > 1 ? "s" : ""} trouvé${ids.length > 1 ? "s" : ""}.`;
  } catch (e) {
    if (seq !== localSeq) return;
    sel.innerHTML = '<option value="">Aucun modèle trouvé</option>';
    $("keyHint").innerHTML = "Pas de réponse de ton IA locale. Vérifie qu'Ollama ou LM Studio est lancé avec au moins un modèle, que le site est autorisé (CORS, voir le README), et accepte l'« accès au réseau local » si ton navigateur le demande.";
  }
}
{ let t; $("key").addEventListener("input", () => { if ($("provider").value !== "local") return; clearTimeout(t); t = setTimeout(loadLocalModels, 500); }); }
async function callLocal(messages, maxTok) {
  const base = localBase(ai.keys.local), model = ai.models.local;
  if (!model) throw new Error("Choisis un modèle local dans « Réglages IA ».");
  let r;
  try {
    r = await fetch(base + "/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ model, messages, temperature: 0.9, max_tokens: maxTok, stream: false }, /gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}))
    });
  } catch (e) {
    const er = new Error(`Impossible de joindre ton IA locale (${base}). Vérifie qu'elle est lancée, que le site est autorisé (CORS) et que l'accès au réseau local est accepté dans le navigateur.`);
    er.retry = 15; throw er;
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d.error ? (typeof d.error === "string" ? d.error : d.error.message) : "HTTP " + r.status;
    const er = new Error(r.status === 404 ? `Modèle « ${model} » introuvable sur ton IA locale : choisis-en un autre dans « Réglages IA ».` : "Erreur de l'IA locale : " + msg);
    er.retry = 10; throw er;
  }
  const text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
function openSettings() {
  $("provider").value = ai.provider; fillProvider(ai.provider);
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
}
$("provider").addEventListener("change", () => fillProvider($("provider").value));
$("openSettings").addEventListener("click", openSettings);
$("setForm").addEventListener("submit", () => {
  const p = $("provider").value;
  ai.provider = p; ai.keys[p] = $("key").value.trim(); ai.models[p] = $("model").value;
  store.set("tt-provider", p); store.set("tt-keys", ai.keys); store.set("tt-models", ai.models);
  engineLine(); toast(aiKey() ? `${PROVIDERS[p].label} activé` : p === "local" ? "Choisis un modèle local" : "Aucune clé : titres de secours");
});
$("forgetKey").addEventListener("click", () => { const p = $("provider").value; delete ai.keys[p]; $("key").value = ""; store.set("tt-keys", ai.keys); engineLine(); toast("Clé effacée de ce navigateur"); });
function engineLine() {
  $("engine").textContent = aiKey()
    ? `Titres écrits par ${aiModel()} via ${PROVIDERS[ai.provider].label}. Clique sur un titre pour le retoucher avant de le copier ou de l'appliquer.`
    : "Aucune clé API : les titres viennent de modèles simples. Ajoute une clé Groq gratuite dans « Réglages IA » pour des titres écrits par l'IA.";
  const add = $("addKey"); if (add) add.remove();
  if (!aiKey()) { $("engine").insertAdjacentHTML("beforeend", ' <button class="sec" type="button" id="addKey">Ajouter une clé gratuite</button>'); $("addKey").addEventListener("click", openSettings); }
}

/* ======================== génération ======================== */
let current = [], favs = store.get("tt-favs", []), view = "new", busy = false;

function buildPrompt(twist) {
  const m = [...moods].map(k => MOODS.find(x => x[0] === k)[1]).join(", ") || "aucune en particulier";
  const lang = { fr: "en français", en: "in English", mix: "en franglais (mélange naturel français/anglais, style gamer)" }[$("lang").value];
  const len = { court: "courts (environ 30 à 60 caractères)", moyen: "de longueur moyenne (60 à 100 caractères)", long: "riches (100 à 140 caractères)" }[$("len").value];
  const ap = $("apero").checked
    ? `Le streamer est EN APÉRO, niveau « ${LEVELS[$("lvl").value]} » (${$("lvl").value}/4). Rends les titres conviviaux et festifs en proportion : trinquer avec le chat, gameplay approximatif assumé, autodérision. Reste léger et bon enfant, sans inciter à boire davantage ni glorifier l'excès.`
    : "Pas d'apéro ce soir.";
  const avoid = current.map(t => t.titre).slice(0, 16);
  return [
    "Tu es un expert des titres de live Twitch qui donnent envie de cliquer.",
    `Génère 8 titres de stream ${lang}, ${len}, jamais plus de 140 caractères (limite Twitch).`,
    `Jeu / catégorie : ${game.name}. Utilise le vocabulaire, les mécaniques, les mèmes et les références propres à ce jeu.`,
    `Humeur du streamer : ${m}.`,
    ap,
    $("ctx").value.trim() ? "Contexte donné par le streamer : " + $("ctx").value.trim().slice(0, 400) : "",
    $("cmd").value.trim() ? "Place naturellement ces commandes ou tags dans environ la moitié des titres : " + $("cmd").value.trim().slice(0, 80) : "",
    $("emo").checked ? "Ajoute 1 à 2 emojis pertinents par titre." : "N'utilise aucun emoji.",
    twist || "",
    "Varie les styles : punchline, question au chat, défi, autodérision, mystère, jeu de mots. Pas de clickbait mensonger, rien d'offensant, pas de majuscules partout.",
    avoid.length ? "Ne répète pas ces titres déjà proposés : " + JSON.stringify(avoid) : "",
    "FORMAT DE RÉPONSE OBLIGATOIRE : exactement 8 lignes, une par titre, sans numéro, sans puce, sans guillemets autour, sans aucun texte avant ou après.",
    "Chaque ligne : le titre, puis ' ||| ', puis son style en un mot (punchline, question, défi, autodérision, mystère, jeu de mots ou hype).",
    "Exemple de ligne : On tente le top 1 sans les mains ||| défi"
  ].filter(Boolean).join("\n");
}

async function callAI(prompt) {
  if (ai.provider === "local") {
    const t = await callLocal([{ role: "user", content: prompt }], 3000);
    if (!t) throw new Error("Ton IA locale a renvoyé une réponse vide. Réessaie, ou choisis un autre modèle dans « Réglages IA ».");
    return t;
  }
  const key = aiKey(), model = aiModel(), claude = ai.provider === "claude";
  let r;
  try {
    r = claude
      ? await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
        })
      : await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign(
            { model, max_completion_tokens: 4000, temperature: 1, messages: [{ role: "user", content: prompt }] },
            /gpt-oss/.test(model) ? { reasoning_effort: "low", include_reasoning: false } : {}
          ))
        });
  } catch (e) {
    throw new Error(`Impossible de joindre ${PROVIDERS[ai.provider].label} depuis le navigateur (réseau, bloqueur de pub ou appel refusé).`);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d.error && d.error.message || ("HTTP " + r.status);
    throw new Error(
      r.status === 401 ? "Clé API refusée : vérifie-la dans « Réglages IA »."
      : r.status === 404 || /model/i.test(msg) && r.status === 400 ? `Modèle « ${model} » indisponible : choisis-en un autre dans « Réglages IA ».`
      : r.status === 429 ? (claude ? "Trop de demandes d'un coup : patiente quelques secondes." : "Limite gratuite de Groq atteinte pour le moment : patiente une minute, ou change de modèle.")
      : r.status === 529 || r.status === 503 ? "Le service d'IA est surchargé : réessaie dans un instant."
      : (r.status === 400 && /credit|billing/i.test(msg)) ? "Crédit API insuffisant sur ton compte."
      : "Erreur de l'IA : " + msg);
  }
  const text = claude
    ? (d.content || []).filter(c => c.type === "text").map(c => c.text).join("")
    : (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
  const finish = claude ? d.stop_reason : d.choices && d.choices[0] && d.choices[0].finish_reason;
  if (!text.trim()) {
    const e = new Error(finish === "length" || finish === "max_tokens"
      ? "L'IA a manqué de place pour répondre. Réessaie, ou choisis « Llama 3.3 70B » dans « Réglages IA »."
      : "L'IA a renvoyé une réponse vide. Réessaie, ou choisis un autre modèle dans « Réglages IA ».");
    e.raw = JSON.stringify(d).slice(0, 1500);
    throw e;
  }
  return text;
}

/* Lit la réponse de l'IA : format « titre ||| style » ligne par ligne, avec repli sur JSON, même abîmé */
function parseTitles(text) {
  const clean = t => String(t).replace(/\*\*|__|`/g, "").replace(/^\s*\|+|\|+\s*$/g, "").replace(/\s+/g, " ").replace(/^\s*(?:\d+\s*[.)\-:]|[-*•–])\s*/, "").replace(/^["«“'\s]+|["»”'\s,]+$/g, "").trim();
  const out = [];
  const push = (titre, style) => { titre = clean(titre); if (titre.length >= 4 && /\p{L}/u.test(titre) && !out.some(o => o.titre === titre)) out.push({ titre, style: clean(style || "").slice(0, 30) }); };
  // 1) JSON valide
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { const j = JSON.parse(text.slice(a, b + 1)); (j.titres || j.titles || []).forEach(x => x && typeof x.titre === "string" && push(x.titre, x.style)); } catch (e) {}
    // 2) JSON abîmé : on récupère chaque "titre": "…" jusqu'au champ suivant
    if (!out.length) for (const m of text.matchAll(/"titre"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"style"\s*:\s*"([^"]*)"|})/g)) push(m[1].replace(/\\"/g, '"'), m[2]);
    if (out.length) return out;
  }
  // 3) Format ligne par ligne
  const lines = text.replace(/<think>[\s\S]*?<\/think>/g, "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const piped = lines.filter(l => l.includes("|||"));
  if (piped.length) piped.forEach(l => { const [t, s] = l.split("|||"); push(t, s); });
  else lines.filter(l => !/:$/.test(l) && l.length <= 200).forEach(l => push(l, ""));
  return out;
}

async function askAI(prompt) {
  const text = await callAI(prompt);
  const list = parseTitles(text).slice(0, 10);
  if (!list.length) { const e = new Error("Réponse de l'IA illisible, réessaie."); e.raw = text.slice(0, 1500); throw e; }
  return list;
}

function fallback() {
  const g = game.name, e = $("emo").checked, ap = $("apero").checked;
  const T = [`${g} ce soir, on verra bien ce que ça donne`, `Chill sur ${g}, viens papoter`, `On ne lâche rien sur ${g} tant que ce n'est pas gagné`, `${g} : le chat décide de mon destin`, `Premier essai ou cinquantième, qui compte ? ${g}`, `${g} mais je commente tout comme un match de foot`, `Objectif : survivre à ${g} sans rage quit`, `Petit ${g} tranquille… ou pas`];
  const A = [`Apéro ${g} : on trinque à chaque win`, `${g} en mode apéro, le skill est resté au frigo`, `Chips, verre et ${g} : la soirée parfaite`];
  return (ap ? A.concat(T) : T).sort(() => Math.random() - .5).slice(0, 8).map(t => ({ titre: (e ? t + (ap ? " 🍻" : " 🎮") : t).slice(0, 140), style: "modèle" }));
}

async function generate(twist) {
  if (busy) return;
  if (!game) { $("errBox").innerHTML = `<div class="err">Choisis d'abord un jeu ou une catégorie.</div>`; q.focus(); return; }
  busy = true; $("go").disabled = true; $("go").textContent = aiKey() ? "L'IA réfléchit…" : "Génération…"; $("errBox").innerHTML = "";
  view = "new"; setTab(); $("out").innerHTML = '<div class="skel"></div>'.repeat(4);
  let list = null;
  if (aiKey()) {
    try { list = await askAI(buildPrompt(twist)); }
    catch (err) {
      $("errBox").innerHTML = `<div class="err">${esc(err.message)} Voici des titres de secours en attendant.${err.raw ? `<details><summary>Voir la réponse brute de l'IA</summary><pre class="raw"></pre></details>` : ""}</div>`;
      if (err.raw) $("errBox").querySelector(".raw").textContent = err.raw;
    }
  }
  current = list || fallback();
  busy = false; $("go").disabled = false; $("go").textContent = "Générer les titres";
  render(true); $("more").hidden = false;
}
$("f").addEventListener("submit", e => { e.preventDefault(); generate(); });
$("again").addEventListener("click", () => generate());
$("crazy").addEventListener("click", () => generate("Pousse le curseur : titres plus absurdes, plus drôles, plus inattendus."));
$("sober").addEventListener("click", () => generate("Version plus sobre et pro : clair, accrocheur, peu de blagues."));

/* ======================== rendu des titres ======================== */
const ICON = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l5 5 9-10"/></svg>'
};
const isFav = t => favs.some(f => f.titre === t);
function render(anim) {
  const data = view === "new" ? current : favs;
  $("favN").textContent = favs.length ? `(${favs.length})` : "";
  if (!data.length) {
    $("out").innerHTML = view === "new"
      ? `<div class="empty"><h3>Prêt quand tu l'es</h3><p>Choisis ton jeu à gauche, sélectionne une ou deux humeurs, puis lance la génération. Tes réglages sont retenus d'une fois sur l'autre.</p></div>`
      : `<div class="empty"><h3>Aucun favori</h3><p>Touche l'étoile d'un titre pour le garder ici, d'un live à l'autre.</p></div>`;
    $("more").hidden = true; return;
  }
  const applyLabel = TWITCH_READY ? (tw.user ? "Appliquer" : "Connecter pour appliquer") : "";
  $("out").innerHTML = data.map((t, i) => {
    const n = [...t.titre].length;
    return `<article class="t${anim ? " new" : ""}" style="animation-delay:${i * 40}ms" data-i="${i}">
      <div class="txt" contenteditable="true" spellcheck="false" data-i="${i}">${esc(t.titre)}</div>
      <div class="meta"><span class="n${n > 140 ? " over" : ""}">${n} / 140</span>${t.style ? `<span class="tag">${esc(t.style)}</span>` : ""}${t.game && view === "fav" ? `<span>${esc(t.game)}</span>` : ""}</div>
      <div class="acts">${applyLabel ? `<button class="apply" type="button">${applyLabel}</button>` : ""}<button class="ib fav${isFav(t.titre) ? " on" : ""}" type="button" aria-label="Favori">${isFav(t.titre) ? ICON.star : ICON.starO}</button><button class="ib cp" type="button" aria-label="Copier le titre">${ICON.copy}</button></div>
    </article>`;
  }).join("");
}
$("out").addEventListener("paste", e => { if (!e.target.closest(".txt")) return; e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
$("out").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest(".txt")) { e.preventDefault(); e.target.blur(); } });
$("out").addEventListener("input", e => {
  const el = e.target.closest(".txt"); if (!el) return;
  const data = view === "new" ? current : favs, t = data[+el.dataset.i];
  const old = t.titre; t.titre = el.textContent.replace(/\s+/g, " ").trim();
  if (view === "new") { const f = favs.find(x => x.titre === old); if (f) f.titre = t.titre; }
  store.set("tt-favs", favs);
  const n = [...t.titre].length, c = el.parentNode.querySelector(".n"); c.textContent = n + " / 140"; c.classList.toggle("over", n > 140);
});
$("out").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  const i = +b.closest(".t").dataset.i, data = view === "new" ? current : favs, t = data[i];
  if (b.classList.contains("apply")) { applyTitle(t.titre, b); return; }
  if (b.classList.contains("cp")) {
    try { await navigator.clipboard.writeText(t.titre); b.innerHTML = ICON.check; b.classList.add("ok"); setTimeout(() => { b.innerHTML = ICON.copy; b.classList.remove("ok"); }, 1400); }
    catch (err) { const r = document.createRange(); r.selectNodeContents(b.closest(".t").querySelector(".txt")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Titre sélectionné : Ctrl+C pour copier"); }
    return;
  }
  if (b.classList.contains("fav")) {
    if (isFav(t.titre)) favs = favs.filter(f => f.titre !== t.titre);
    else favs.unshift({ titre: t.titre, style: t.style, game: game ? game.name : t.game || "" });
    store.set("tt-favs", favs); render(false);
  }
});
function setTab() { $("tabNew").setAttribute("aria-selected", view === "new"); $("tabFav").setAttribute("aria-selected", view === "fav"); $("more").hidden = view !== "new" || !current.length; ctxLine(); }
$("tabNew").addEventListener("click", () => { view = "new"; setTab(); render(false); });
$("tabFav").addEventListener("click", () => { view = "fav"; setTab(); render(false); });

/* jaquette introuvable : on la masque proprement */
document.addEventListener("error", e => { if (e.target.tagName === "IMG") e.target.style.visibility = "hidden"; }, true);

/* ======================== démarrage ======================== */
async function init() {
  $("ver").textContent = "Version " + APP_VERSION;
  if (!TWITCH_READY) banner(`<div class="info-b"><span>Mode démo : la connexion Twitch n'est pas configurée. Ajoute ton Client ID dans <b>config.js</b> (voir le README).</span></div>`);
  else readOAuthReturn();
  if (TWITCH_READY && location.protocol === "file:") {
    banner(`<div class="err">Tu as ouvert le fichier directement sur ton ordinateur : la connexion Twitch ne peut pas marcher comme ça. Ouvre le site par son adresse GitHub Pages (https://…github.io/…).</div>`);
  } else if (TWITCH_READY && !tw.token && !$("banner").innerHTML) {
    banner(`<div class="info-b"><span>Adresse de retour à déclarer sur dev.twitch.tv (OAuth Redirect URLs), à l'identique : <b id="redir"></b></span><button class="sec" type="button" id="copyRedir">Copier</button></div>`);
    $("redir").textContent = REDIRECT;
    $("copyRedir").addEventListener("click", async () => { try { await navigator.clipboard.writeText(REDIRECT); toast("Adresse copiée"); } catch (e) { toast(REDIRECT); } });
  }
  showPicked(); setApero(); engineLine(); renderAccount(); render(false);
  if (TWITCH_READY && tw.token && await validate()) {
    await loadMe(); updateSearchHint(); fillArt(); render(false);
    setInterval(validate, 60 * 60 * 1000); // Twitch demande de revalider le jeton toutes les heures
  }
}
init();
})();
