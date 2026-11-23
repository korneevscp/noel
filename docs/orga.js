(() => {
"use strict";
const D = window.RR_DATA;
const $ = (s) => document.querySelector(s);

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
const subtle = window.crypto && crypto.subtle;
async function sha256hex(s) {
  if (subtle) {
    try { return [...new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join(""); } catch (e) {}
  }
  return sha256js(s);
}
async function sha256bytes(s) {
  const hex = await sha256hex(s);
  return new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
}
async function deriveKey(user, pw) {
  let k = await sha256hex(D.salt + "orga:" + user.trim() + ":" + pw);
  for (let i = 0; i < D.orga.rounds; i++) k = await sha256hex(k + D.salt);
  return k;
}
async function decrypt(b64, key) {
  const enc = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const out = new Uint8Array(enc.length);
  for (let i = 0, blk = 0; i < enc.length; blk++) {
    const ks = await sha256bytes(`${key}:${blk}`);
    for (let j = 0; j < 32 && i < enc.length; j++, i++) out[i] = enc[i] ^ ks[j];
  }
  return new TextDecoder().decode(out);
}

let fails = 0;
$("#orga-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#orga-msg"), btn = $("#orga-btn");
  btn.disabled = true; msg.className = "msg"; msg.textContent = "Vérification...";
  const key = await deriveKey($("#orga-user").value, $("#orga-pass").value);
  if (await sha256hex("check:" + key) !== D.orga.check) {
    fails++;
    msg.className = "msg bad";
    msg.textContent = fails > 2 ? "Accès refusé. Si tu es un joueur, retourne jouer." : "Identifiants incorrects.";
    setTimeout(() => { btn.disabled = false; }, 1000 * Math.min(fails, 5));
    return;
  }
  $("#orga-content").innerHTML = await decrypt(D.orga.box, key);
  $("#orga-content").hidden = false;
  $("#login").hidden = true;
});
})();
