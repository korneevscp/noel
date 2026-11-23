(() => {
"use strict";

const D = window.RR_DATA;
const $ = (s, el = document) => el.querySelector(s);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CASES = [
  { id: 1, title: "La carte de rançon", type: "Photo", file: "01_la_carte_de_rancon.jpg", hint: "Les cartes ont toujours plus à dire qu'il n'y paraît... si on lit le dos." },
  { id: 2, title: "La photo du réveillon", type: "Photo", file: "02_photo_du_reveillon.png", hint: "Tout le monde est sur la photo ? Il manque un morceau." },
  { id: 3, title: "La musique du direct", type: "Audio", file: "03_la_musique_du_direct.wav", hint: "Écoute avec les yeux." },
  { id: 4, title: "La caméra du traîneau", type: "Vidéo", file: "04_camera_du_traineau.mp4", hint: "Il passe devant la caméra. Une seule image. Ne cligne pas des yeux." },
  { id: 5, title: "La lettre de Léa", type: "Texte", file: "05_lettre_de_lea.txt", hint: "Léa a écrit plus que ce qu'on voit." },
];
const TOTAL = CASES.length;

const SUSPECTS = [
  { id: "krampus", name: "Krampus", mug: "👹", role: "Démon des Alpes", desc: "Cornes, chaînes, mauvaise réputation. Le coupable idéal. Un peu trop idéal ?" },
  { id: "merenoel", name: "La Mère Noël", mug: "👵", role: "Épouse", desc: "L'héritage, l'assurance-vie... Elle n'a pas pleuré une seule fois." },
  { id: "rudolph", name: "Rudolph", mug: "🦌", role: "Renne de tête", desc: "Jaloux de la gloire du patron. Son nez brillait encore cette nuit-là." },
  { id: "bonhomme", name: "Le Bonhomme de Neige", mug: "☃️", role: "Gardien", desc: "Présent sur les lieux. Il n'a rien vu. Il n'a pas d'yeux, à vrai dire." },
  { id: "lutin404", name: "Le Lutin n°404", mug: "🧝", role: "Ancien employé", desc: "Licencié en 1997, remplacé par une machine. Introuvable depuis." },
  { id: "grinch", name: "Le Grinch", mug: "💚", role: "Voisin", desc: "Il a déjà volé Noël une fois. Pourquoi pas le Père Noël ?" },
];

const KEY = "redroom_v2";
let S = { solved: {}, letters: {}, wrong: 0, fakes: 0, sound: false, calm: false, accuseFails: 0 };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

function sha256js(ascii) {
  const r = (v, a) => (v >>> a) | (v << (32 - a));
  const K = [], H = [];
  let p = 0;
  for (let c = 2; p < 64; c++) {
    let prime = true;
    for (let d = 2; d * d <= c; d++) if (c % d === 0) { prime = false; break; }
    if (prime) { if (p < 8) H[p] = (Math.pow(c, .5) * 4294967296) | 0; K[p++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; }
  }
  const bytes = new TextEncoder().encode(ascii);
  const l = bytes.length, words = [];
  for (let i = 0; i < l; i++) words[i >> 2] |= bytes[i] << ((3 - i % 4) * 8);
  words[l >> 2] |= 0x80 << ((3 - l % 4) * 8);
  const n = ((l + 8) >> 6) + 1;
  words[n * 16 - 1] = l * 8;
  for (let i = 0; i < n * 16; i++) words[i] |= 0;
  let h = H.slice();
  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16), o = h.slice();
    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const a = w[i - 15], b = w[i - 2];
        w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) | 0;
      }
      const t1 = (h[7] + (r(h[4], 6) ^ r(h[4], 11) ^ r(h[4], 25)) + ((h[4] & h[5]) ^ (~h[4] & h[6])) + K[i] + w[i]) | 0;
      const t2 = ((r(h[0], 2) ^ r(h[0], 13) ^ r(h[0], 22)) + ((h[0] & h[1]) ^ (h[0] & h[2]) ^ (h[1] & h[2]))) | 0;
      h = [(t1 + t2) | 0, h[0], h[1], h[2], (h[3] + t1) | 0, h[4], h[5], h[6]];
    }
    h = h.map((v, i) => (v + o[i]) | 0);
  }
  return h.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
async function sha256(s) {
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {}
  return sha256js(s);
}

const WRONG = [
  "Non.", "Raté. Tu veux un indice ? Arrête.", "Ce n'est même pas un flag. Tu tapes au hasard ?",
  "Il rit. Tu l'entends ?", "Encore raté. Il est tard, tu sais.", "Pourquoi tu t'acharnes ?",
  "Tes yeux piquent ? Va dormir.", "Non. Et lui attend toujours sur sa chaise.",
];
const FAKE = [
  "Tu y as cru ? Vraiment ?", "Oh, celui-là... Je l'ai mis exprès pour toi.",
  "Faux. Mais j'adore te regarder chercher.", "C'était trop facile, non ? Tu aurais dû te méfier.",
  "Un drapeau de plus dans ma collection de mensonges. Merci de l'avoir trouvé.",
  "Raté. Les deux enquêteurs d'avant ont trouvé celui-là aussi.",
];
const PROGRESS = [
  "Pourquoi tu me cherches ?",
  "Une. Ce n'est rien. Arrête maintenant.",
  "Deux. Tu es têtu. Je n'aime pas les gens têtus.",
  "Trois. Tu devrais dormir, tu sais.",
  "Quatre. L'enquêtrice d'avant s'est arrêtée ici. On ne l'a plus revue.",
  "Cinq. Tu as toutes les lettres. Tu sais lire ?",
];
const WHISPERS = [
  "Pourquoi tu me cherches ?", "Tu ferais mieux d'arrêter.", "Regarde derrière toi. ... Non, rien. Pour l'instant.",
  "Tu es seul, là ?", "Je sais combien de temps tu as passé sur cette page.", "Il te reste combien de pièces ? Moi, il me reste combien de temps ?",
  "Ne fais confiance à aucun drapeau.", "Ils m'ont remplacé. Toi aussi, un jour, on te remplacera.",
  "Le son est coupé ? Tant mieux. Tu n'entendras pas les clochettes.", "Tu crois que c'est un jeu. C'est mignon.",
  "Ton écran est la seule lumière dans la pièce, non ?", "Tu as vérifié que la porte était fermée ?",
];
const CHAT_USERS = ["xX_n0sc0p3_Xx", "lutin_fan_97", "sapin_mort", "renne_fantome", "GG_EZ", "pixel_noir", "neige_sale", "speedrun_noel",
  "DarkSouls_Lover", "boule_de_neige", "cheminee_cam", "player_two", "insert_coin", "r3d_r00m_fan", "AFK_depuis_1997", "silent_night"];
const CHAT_MSGS = ["il bouge encore ?", "F", "c'est un fake non ?", "pourquoi le compteur monte tout seul", "il a regardé la caméra là",
  "quelqu'un a appelé la police ?", "la police c'est des lutins aussi", "musique de boîte à musique = 0/10", "first", "ça lag",
  "c'est quoi ce bruit derrière ?", "l'hôte joue à quoi ?", "j'ai entendu un son de jeu vidéo", "il reste combien de temps ?",
  "ce live existe depuis 1997 je jure", "qui a ouvert le fichier ARRETE_MAINTENANT ?", "il y a un nouveau spectateur",
  "le nouveau spectateur enquête lol", "dites au nouveau d'arrêter", "pourquoi le chat sent le sapin brûlé", "gg", "chaise > Père Noël",
  "j'ai trouvé un flag !! ah non c'était un faux", "les rennes tournent toujours en rond dehors", "game over pour lui"];

let AC = null, master = null;
function audioStart() {
  if (AC) { AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.0; master.connect(AC.destination);
    master.gain.linearRampToValueAtTime(0.9, AC.currentTime + 3);
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180; lp.connect(master);
    [55, 58.3, 82.4].forEach((f, i) => {
      const o = AC.createOscillator(); o.type = i === 2 ? "sine" : "sawtooth"; o.frequency.value = f;
      const g = AC.createGain(); g.gain.value = i === 2 ? 0.02 : 0.035;
      const lfo = AC.createOscillator(); lfo.frequency.value = 0.07 + i * 0.03;
      const lg = AC.createGain(); lg.gain.value = 0.015; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(lp); o.start();
    });
    musicBoxLoop();
  } catch (e) { AC = null; }
}
function tone(freq, t, dur = 2.2, vol = 0.05, type = "sine") {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
}
function musicBoxLoop() {
  const mel = [[392, 1.5], [440, .5], [392, 1], [329.6, 3], [392, 1.5], [440, .5], [392, 1], [329.6, 3]];
  const play = () => {
    if (!AC || !S.sound) return setTimeout(play, 8000);
    let t = AC.currentTime + .1;
    const detune = 0.94 + Math.random() * 0.03;
    mel.forEach(([f, b]) => { tone(f * detune, t, 2.4, 0.035); tone(f * detune * 2, t, 1.2, 0.008); t += b * 0.55; });
    setTimeout(play, 22000 + Math.random() * 20000);
  };
  setTimeout(play, 4000);
}
function sfx(kind) {
  if (!AC || !S.sound) return;
  const t = AC.currentTime;
  if (kind === "bad") { tone(70, t, .5, .12, "square"); tone(66, t + .05, .5, .1, "square"); }
  if (kind === "fake") { [523, 494, 466, 440].forEach((f, i) => tone(f, t + i * .12, .4, .04, "triangle")); }
  if (kind === "good") { [392, 523, 659].forEach((f, i) => tone(f * 0.97, t + i * .18, 1.6, .05)); }
  if (kind === "whisper") {
    const len = AC.sampleRate * 1.2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len) * 0.4;
    const src = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
    bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 3; g.gain.value = 0.12;
    src.buffer = buf; src.connect(bp); bp.connect(g); g.connect(master); src.start();
  }
}
function setSound(on) {
  S.sound = on; save();
  $("#sound-toggle").textContent = on ? "🔊" : "🔇";
  if (on) audioStart(); else if (AC) AC.suspend();
}

function noiseLoop() {
  const c = $("#noise"), ctx = c.getContext("2d");
  c.width = 160; c.height = 90;
  const img = ctx.createImageData(160, 90);
  let last = 0;
  const frame = (ts) => {
    if (!S.calm && ts - last > 70) {
      last = ts;
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = v; img.data[i + 1] = v * .6; img.data[i + 2] = v * .6; img.data[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function flicker() {
  if (S.calm) return;
  document.body.classList.add("flicker");
  setTimeout(() => document.body.classList.remove("flicker"), 400);
}
let whisperTimer = null;
function whisper(text, ms = 5200) {
  const w = $("#whisper");
  w.textContent = text; w.classList.add("show"); sfx("whisper");
  clearTimeout(whisperTimer);
  whisperTimer = setTimeout(() => w.classList.remove("show"), ms);
}
function nowHM() { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

function chat(user, text, host = false) {
  const log = $("#chat-log"), li = document.createElement("li");
  if (host) li.className = "host";
  const b = document.createElement("b"); b.textContent = (host ? "▲ HÔTE" : user) + " : ";
  li.append(b, document.createTextNode(text));
  log.append(li);
  while (log.children.length > 60) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
function chatLoop() {
  const tick = () => {
    if (Math.random() < 0.08) {
      const h = new Date().getHours();
      chat("", rnd([
        "Bienvenue au nouveau spectateur. Tu enquêtes ? Pourquoi ?",
        `Il est ${nowHM()} chez toi. Tu ne dors pas ?`,
        "Le nouveau spectateur a téléchargé des fichiers. Intéressant.",
        h < 6 ? "Les gens qui restent debout à cette heure-ci... ils cherchent quoi ?" : "Continue de regarder. C'est tout ce que tu peux faire.",
        "Tu ferais mieux d'arrêter.",
      ]), true);
    } else chat(rnd(CHAT_USERS), rnd(CHAT_MSGS));
    setTimeout(tick, 1800 + Math.random() * 4200);
  };
  for (let i = 0; i < 6; i++) chat(rnd(CHAT_USERS), rnd(CHAT_MSGS));
  tick();
}
function viewersLoop() {
  let v = 1666;
  setInterval(() => {
    v += Math.round((Math.random() - 0.45) * 9);
    if (Math.random() < 0.02) v = 666;
    $("#viewers").textContent = "spectateurs : " + v.toLocaleString("fr-FR");
  }, 1500);
}
function countdownLoop() {
  const upd = () => {
    const now = new Date();
    let target = new Date(now.getFullYear(), 11, 25, 0, 0, 0);
    if (now >= target) target = new Date(now.getFullYear() + 1, 11, 25);
    let s = Math.floor((target - now) / 1000);
    const dd = Math.floor(s / 86400); s %= 86400;
    const hh = String(Math.floor(s / 3600)).padStart(2, "0"), mm = String(Math.floor(s % 3600 / 60)).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
    $("#countdown").textContent = (dd ? dd + "j " : "") + `${hh}:${mm}:${ss}`;
  };
  upd(); setInterval(upd, 1000);
}

function fmtSize(n) { return n > 1e6 ? (n / 1e6).toFixed(1) + " Mo" : Math.max(1, Math.round(n / 1e3)) + " Ko"; }

function renderSuspects() {
  $("#suspects").innerHTML = "";
  $("#accuse-grid").innerHTML = "";
  SUSPECTS.forEach(s => {
    const el = document.createElement("div");
    el.className = "suspect";
    el.innerHTML = `<div class="mug"></div><h4></h4><p class="role"></p><p class="desc"></p>`;
    el.querySelector(".mug").textContent = s.mug;
    el.querySelector("h4").textContent = s.name;
    el.querySelector(".role").textContent = s.role;
    el.querySelector(".desc").textContent = s.desc;
    if (s.id === "krampus") { const t = document.createElement("span"); t.className = "tag"; t.textContent = "SUSPECT N°1"; el.append(t); }
    $("#suspects").append(el);
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="radio" name="suspect"> <span></span>`;
    lab.querySelector("input").value = s.id;
    lab.querySelector("span").textContent = s.mug + " " + s.name;
    $("#accuse-grid").append(lab);
  });
}

function renderCases() {
  const box = $("#cases"); box.innerHTML = "";
  CASES.forEach(c => {
    const el = document.createElement("article");
    el.className = "case"; el.id = "case-" + c.id;
    if (S.solved[c.id]) el.classList.add("solved");
    el.innerHTML = `
      <div class="num"></div><h4></h4><p class="hint"></p>
      <a class="dl" download></a>
      <form autocomplete="off"><input placeholder="B1{...}" spellcheck="false" aria-label="Flag"><button class="btn">Valider</button></form>
      <p class="warn">⚠️ En présentiel, soumets tes flags sur le site CTF prévu par les organisateurs.</p>
      <p class="msg" aria-live="polite"></p>`;
    el.querySelector(".num").textContent = String(c.id).padStart(2, "0");
    el.querySelector("h4").textContent = c.title + " · " + c.type;
    el.querySelector(".hint").textContent = "« " + c.hint + " »";
    const en = document.createElement("a");
    en.className = "enonce-link"; en.href = "enonces.html#ex-" + c.id;
    const used = (S.hints && S.hints[c.id]) || 0;
    en.textContent = `📄 Énoncé & indices (${used}/2 utilisés)`;
    el.querySelector(".hint").after(en);
    const a = el.querySelector(".dl");
    a.href = "fichiers/" + c.file;
    a.textContent = "⬇ " + c.file + " (" + fmtSize(D.files[c.file] || 0) + ")";
    a.addEventListener("click", () => { if (Math.random() < 0.35) setTimeout(() => whisper(rnd(["Tu télécharges mes affaires, maintenant ?", "Je vois ce que tu ouvres.", "Fais attention à ce que tu ouvres."])), 900); });
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      check(el.querySelector("input").value, c.id, el.querySelector(".msg"), el);
    });
    box.append(el);
  });
}

function renderProgress() {
  const L = $("#letters"); L.innerHTML = "";
  let n = 0;
  for (let i = 1; i <= TOTAL; i++) {
    const d = document.createElement("div");
    d.className = "letter" + (S.letters[i] ? " found" : "");
    d.textContent = S.letters[i] || "?";
    L.append(d);
    if (S.solved[i]) n++;
  }
  $("#progress-text").textContent = `${n} / ${TOTAL} épreuves résolues. ${PROGRESS[n]}` + (S.fakes ? `  ·  Faux drapeaux avalés : ${S.fakes}.` : "");
  const open = n === TOTAL;
  $("#accuse-locked").hidden = open;
  $("#accuse-form").hidden = !open;
  renderArchives();
}

function freshMsg(cardEl, msgEl) {
  return (cardEl && document.querySelector("#" + cardEl.id + " .msg")) || msgEl;
}
async function check(raw, caseId, msgEl, cardEl) {
  const flag = (raw || "").trim();
  if (!flag) return;
  if (!/^B1\{[^{}]+\}$/.test(flag)) {
    msgEl.className = "msg bad";
    msgEl.textContent = "Format obligatoire : B1{...}. Même ça, tu n'y arrives pas ?";
    sfx("bad");
    if (cardEl) { cardEl.classList.remove("shake"); void cardEl.offsetWidth; cardEl.classList.add("shake"); }
    return;
  }
  const h = await sha256(D.salt + flag);
  const realId = Object.keys(D.real).find(k => D.real[k] === h);
  msgEl.className = "msg";
  if (realId) {
    const id = Number(realId);
    const already = S.solved[id];
    S.solved[id] = true; S.letters[id] = flag[flag.indexOf("{") + 1]; (S.flags = S.flags || {})[id] = flag; save();
    if (!already) setTimeout(() => whisper("Un nouvel enregistrement a été récupéré. Section Archives.", 4000), 6500);
    sfx("good"); renderCases(); renderProgress();
    msgEl = freshMsg(cardEl, msgEl);
    msgEl.className = "msg good";
    msgEl.textContent = (caseId && caseId !== id)
      ? `Vrai flag... mais pas pour cette pièce. Il appartient à la pièce ${String(id).padStart(2, "0")}. Je l'ai rangé là-bas.`
      : (already ? "Tu l'avais déjà. Tu tournes en rond ?" : "...C'est le bon. Je n'aime pas ça.");
    const n = Object.keys(S.solved).length;
    setTimeout(() => whisper(PROGRESS[Math.min(n, TOTAL)]), 1200);
    if (n === TOTAL && !already) {
      flicker();
      chat("", "Il a les cinq lettres. Il sait. Ou il croit savoir.", true);
      setTimeout(() => location.hash = "#accuser", 2500);
    } else chat("", rnd(["Quelqu'un se rapproche.", "Le nouveau spectateur a trouvé quelque chose. Dommage.", "Tu crois que ça change quelque chose ?"]), true);
    return;
  }
  if (h in D.fakes) {
    S.fakes++; save();
    msgEl.classList.add("fake");
    msgEl.textContent = D.fakes[h] || rnd(FAKE);
    sfx("fake"); flicker(); renderProgress();
    chat("", rnd(["Hahaha. Il a avalé celui-là.", "Un de plus.", "Regardez-le. Il croyait avoir trouvé."]), true);
    if (cardEl) { cardEl.classList.remove("shake"); void cardEl.offsetWidth; cardEl.classList.add("shake"); }
    return;
  }
  S.wrong++; save();
  msgEl.classList.add("bad");
  msgEl.textContent = /^B1\{.+\}$/.test(flag) ? rnd(WRONG) : "Le format, c'est B1{...}. Même ça, tu n'y arrives pas ?";
  sfx("bad");
  if (cardEl) { cardEl.classList.remove("shake"); void cardEl.offsetWidth; cardEl.classList.add("shake"); }
}

async function accuse(e) {
  e.preventDefault();
  const sel = document.querySelector('input[name="suspect"]:checked');
  const msg = $("#accuse-msg");
  msg.className = "msg";
  if (!sel) { msg.classList.add("bad"); msg.textContent = "Tu n'oses pas choisir ? Je comprends."; return; }
  const h = await sha256(D.salt + "suspect:" + sel.value + "|" + allFlags());
  if (h === D.culprit) return ending();
  S.accuseFails++; save();
  const s = SUSPECTS.find(x => x.id === sel.value);
  msg.classList.add("bad");
  msg.textContent = `${s.name} ? Non. ${s.name} est innocent·e. Le direct continue. Et ça, c'est de ta faute.`;
  sfx("bad"); flicker();
  chat("", `Le spectateur accuse ${s.name}. Tout le monde rit.`, true);
}
async function sha256bytes(s) {
  if (window.crypto && crypto.subtle) {
    try { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); } catch (e) {}
  }
  const hex = sha256js(s);
  return new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
}
function allFlags() { return CASES.map(c => (S.flags && S.flags[c.id]) || "").join("|"); }

const ARCH_TITLES = { 1: "Jour 1 · Le communiqué", 2: "Jour 4 · Sous la table", 3: "Jour 8 · Douce nuit",
  4: "Jour 15 · Quatre sur cinq", 5: "Jour 23 · La lettre" };
async function renderArchives() {
  const box = $("#archives-list");
  if (!box) return;
  box.innerHTML = "";
  for (const { id } of CASES) {
    const el = document.createElement("article");
    el.className = "arch";
    const h = document.createElement("h4");
    h.textContent = String(id).padStart(2, "0") + " · " + ARCH_TITLES[id];
    el.append(h);
    const key = S.flags && S.flags[id];
    if (!key) {
      el.classList.add("arch-locked");
      const p = document.createElement("p");
      p.textContent = "▒▒▒▒ ▒▒ ▒▒▒▒▒▒▒ ▒▒▒▒▒ · enregistrement corrompu · résous l'épreuve pour le récupérer";
      el.append(p);
    } else {
      const lines = await decryptBlob(D.fragments[String(id)], key);
      for (const [who, txt] of lines) {
        const p = document.createElement("p");
        const b = document.createElement("b"); b.textContent = who;
        if (who.startsWith("▲")) p.className = "host";
        p.append(b, document.createElement("br"), document.createTextNode(txt));
        el.append(p);
      }
    }
    box.append(el);
  }
}

async function decryptBlob(b64, key) {
  const enc = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const out = new Uint8Array(enc.length);
  for (let i = 0, blk = 0; i < enc.length; blk++) {
    const ks = await sha256bytes(`${key}:${blk}`);
    for (let j = 0; j < 32 && i < enc.length; j++, i++) out[i] = enc[i] ^ ks[j];
  }
  try { return JSON.parse(new TextDecoder().decode(out)); }
  catch (e) { return [["big", "..."], ["", "Quelque chose ne va pas. Tu as triché ?"]]; }
}
async function ending() {
  const box = $("#ending-text"); box.innerHTML = "";
  $("#ending").hidden = false;
  document.title = "RED ROOM - FIN";
  const lines = await decryptBlob(D.ending, allFlags());
  for (let [cls, t] of lines) {
    t = t.replace("{HEURE}", nowHM());
    const p = document.createElement("p");
    p.className = "line" + (cls === "big" ? " big" : "");
    if (cls === "code") { const c = document.createElement("code"); c.textContent = t; p.append(c); } else p.textContent = t;
    box.append(p);
    sfx(cls === "big" ? "whisper" : "good");
    await sleep(cls === "big" ? 2600 : 2000);
    if (cls === "flick") flicker();
  }
  const b = document.createElement("button");
  b.className = "btn"; b.textContent = "Fermer les yeux";
  b.onclick = () => { $("#ending").hidden = true; document.title = "RED ROOM"; };
  box.append(b);
}

function psycho() {
  const loop = () => { whisper(rnd(WHISPERS)); setTimeout(loop, 40000 + Math.random() * 45000); };
  setTimeout(loop, 25000);
  const h = new Date().getHours();
  if (h >= 0 && h < 6) setTimeout(() => whisper(`Il est ${nowHM()}. Qu'est-ce que tu fais encore debout ?`), 9000);
  const titles = ["Reviens...", "Je t'attends.", "Tu as peur ?", "Il est toujours là."];
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) document.title = rnd(titles);
    else { document.title = "RED ROOM"; setTimeout(() => whisper(rnd(["Tu es revenu. Je savais que tu reviendrais.", "Où étais-tu ?", "Tu ne peux pas t'en empêcher, hein ?"])), 700); }
  });
  let idle;
  const resetIdle = () => { clearTimeout(idle); idle = setTimeout(() => whisper("Tu es encore là ? Je t'entends respirer."), 75000); };
  ["mousemove", "keydown", "scroll", "touchstart"].forEach(ev => addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();
  document.addEventListener("copy", () => whisper("Tu copies quoi, là ?"));
  document.addEventListener("contextmenu", () => whisper("Tu cherches quelque chose ?", 2500));
  const fl = () => { flicker(); setTimeout(fl, 20000 + Math.random() * 30000); };
  setTimeout(fl, 15000);
  const K = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let ki = 0;
  addEventListener("keydown", (e) => {
    ki = (e.key === K[ki] || e.key.toLowerCase() === K[ki]) ? ki + 1 : (e.key === K[0] ? 1 : 0);
    if (ki === K.length) { ki = 0; flicker(); whisper("↑↑↓↓←→←→BA... B1{X01.EXE ta bien eu ses un fake}", 9000); }
  });
  const pupils = document.querySelectorAll(".eye i");
  addEventListener("mousemove", (e) => {
    pupils.forEach(p => {
      const r = p.parentElement.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 300));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 300));
      p.style.transform = `translate(${dx * 8}px, ${dy * 1}px)`;
    });
  }, { passive: true });
  console.log("%cPOURQUOI TU REGARDES DANS LA CONSOLE ?", "color:#ff2b2b;font-size:28px;font-weight:bold;text-shadow:0 0 8px red");
  console.log("%cTu crois que je cache mes secrets ici ? Tiens, un cadeau : " + atob("QjF7WDAxLkVYRSB0YSBiaWVuIGV1IHNlcyB1biBmYWtlfQ=="), "color:#e8dcd6;font-size:14px");
}

function applyCalm() {
  document.body.classList.toggle("calm", !!S.calm);
  $("#calm-toggle").textContent = "Effets réduits : " + (S.calm ? "oui" : "non");
}
function enter(withSound) {
  S.calm = $("#calm-mode").checked || S.calm; save(); applyCalm();
  $("#gate").hidden = true; $("#app").hidden = false;
  setSound(withSound);
  renderSuspects(); renderCases(); renderProgress();
  chatLoop(); viewersLoop(); countdownLoop(); psycho();
  setTimeout(() => whisper(Object.keys(S.solved).length ? "Tu es revenu." : "Pourquoi tu me cherches ?"), 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  noiseLoop();
  $("#calm-mode").checked = !!S.calm; applyCalm();
  const h = new Date().getHours();
  $("#gate-time").textContent = (h >= 22 || h < 6) ? `Il est ${nowHM()}. Tu es sûr de vouloir entrer maintenant ?` : `${nowHM()} - le direct est en cours.`;
  $("#enter-sound").onclick = () => enter(true);
  $("#enter-mute").onclick = () => enter(false);
  $("#sound-toggle").onclick = () => setSound(!S.sound);
  $("#calm-toggle").onclick = () => { S.calm = !S.calm; save(); applyCalm(); };
  $("#reset").onclick = () => {
    if (confirm("Effacer toute ta progression ? Il oubliera que tu es venu. Toi, non.")) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    }
  };
  $("#free-form").addEventListener("submit", (e) => { e.preventDefault(); check($("#free-input").value, null, $("#free-msg"), null); });
  $("#accuse-form").addEventListener("submit", accuse);
});
})();

