(() => {
"use strict";
const D = window.RR_DATA || { files: {} };
const KEY = "redroom_v2";
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
S.hints = S.hints || {}; S.solved = S.solved || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

const EX = [
  { id: 1, title: "La carte de rançon", file: "01_la_carte_de_rancon.jpg", tech: "Photo",
    story: "Le 2 décembre, cette carte est arrivée à l'atelier. Pas de timbre, pas d'expéditeur. Le ravisseur aime laisser des messages là où personne ne regarde.",
    goal: "Retrouve le message caché dans la carte et extrais-en le flag.",
    hints: ["Une photo, ce n'est pas que des pixels. Regarde les informations rangées avec l'image (métadonnées). Plusieurs champs contiennent des faux.",
            "Le champ « XP Comment » (exiftool, ou clic droit → Propriétés → Détails sous Windows) finit par du Base64. Décode-le, par exemple avec CyberChef."] },
  { id: 2, title: "La photo du réveillon", file: "02_photo_du_reveillon.png", tech: "Photo",
    story: "Le réveillon de l'an dernier à l'atelier. Tout le monde est là. Vraiment tout le monde ? On voit un bout de bonnet vert sous la table...",
    goal: "Fais apparaître la partie de la photo qu'on ne t'a pas montrée.",
    hints: ["La photo est coupée : le fichier dit que l'image est moins haute qu'elle ne l'est vraiment.",
            "Ouvre le PNG dans un éditeur hexa (HxD). La hauteur est aux octets 0x14 à 0x17 (00 00 02 6C = 620). Mets 00 00 03 E8 (1000) puis corrige le CRC du bloc IHDR, ou utilise un outil de réparation de PNG en ligne."] },
  { id: 3, title: "La musique du direct", file: "03_la_musique_du_direct.wav", tech: "Audio",
    story: "La boîte à musique qui tourne en fond du direct. Douce nuit, désaccordée. Certains spectateurs disent qu'il y a autre chose derrière.",
    goal: "Trouve le flag caché dans le son.",
    hints: ["Le flag ne s'entend pas. Il se voit. Les métadonnées du fichier sont un piège.",
            "Ouvre le fichier dans Audacity et passe en vue « Spectrogramme » (menu du nom de la piste). Le flag est écrit dans les aigus. Attention : 0 = zéro, 1 = un."] },
  { id: 4, title: "La caméra du traîneau", file: "04_camera_du_traineau.mp4", tech: "Vidéo",
    story: "Les images de la caméra 03 la nuit de l'enlèvement : le traîneau, les rennes, la neige. Pendant une fraction de seconde, quelqu'un regarde l'objectif.",
    goal: "Retrouve l'image cachée dans la vidéo et lis le flag.",
    hints: ["Certaines images ne durent qu'une seule frame (1/25 de seconde). Il faut avancer image par image. Il y en a deux : une seule dit la vérité.",
            "Dans VLC, appuie sur E pour avancer d'une image. Ou extrais toutes les images : ffmpeg -i 04_camera_du_traineau.mp4 img_%03d.png. Regarde vers la fin de la vidéo."] },
  { id: 5, title: "La lettre de Léa", file: "05_lettre_de_lea.txt", tech: "Texte",
    story: "Léa, 7 ans, a vu le direct sur l'ordinateur de son grand frère. Elle a écrit au Père Noël. Sa lettre pèse plus lourd qu'elle ne devrait.",
    goal: "Trouve ce que Léa a écrit sans que personne ne puisse le voir.",
    hints: ["Il y a beaucoup plus de caractères que ce que tu vois, juste après le mot « Cher ». Le P.S. est un piège.",
            "Ce sont des caractères invisibles (zero-width) : U+200B = 0 et U+200C = 1. Regroupe les bits par 8 pour obtenir les lettres (CyberChef, ou quelques lignes de Python)."] },
];

const TAUNTS = ["Tu as déjà besoin d'aide ? Holly, elle, n'en a pas demandé.", "Un indice. Il note.", "Tu triches un peu. Il aime ça.",
  "Encore un indice ? Tu es sûr de mériter la fin ?", "Il a vu que tu as demandé de l'aide."];
const $ = (s) => document.querySelector(s);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const size = (n) => !n ? "" : n > 1e6 ? ` (${(n / 1e6).toFixed(1)} Mo)` : ` (${Math.max(1, Math.round(n / 1e3))} Ko)`;

let wt;
function whisper(t) { const w = $("#whisper"); w.textContent = t; w.classList.add("show"); clearTimeout(wt); wt = setTimeout(() => w.classList.remove("show"), 4500); }

function total() {
  const n = Object.values(S.hints).reduce((a, b) => a + b, 0);
  $("#hint-total").textContent = `Indices utilisés : ${n} / ${EX.length * 2}`;
}

function render() {
  const list = $("#list"); list.innerHTML = "";
  EX.forEach(ex => {
    const el = document.createElement("article");
    el.className = "ex"; el.id = "ex-" + ex.id;
    el.innerHTML = `
      <div class="ex-head"><span class="num"></span><h3></h3><span class="tech"></span></div>
      <p class="story"></p>
      <p class="goal"><b>Objectif :</b> <span></span></p>
      <p class="goal"><b>Format :</b> <code>B1{...}</code></p>
      <div class="row"></div>
      <div class="hints"></div>`;
    el.querySelector(".num").textContent = String(ex.id).padStart(2, "0");
    el.querySelector("h3").textContent = ex.title;
    el.querySelector(".tech").textContent = ex.tech;
    el.querySelector(".story").textContent = ex.story;
    el.querySelector(".goal span").textContent = ex.goal;
    const row = el.querySelector(".row");
    const a = document.createElement("a"); a.className = "dl"; a.href = "fichiers/" + ex.file; a.download = "";
    a.textContent = "⬇ " + ex.file + size(D.files && D.files[ex.file]);
    row.append(a);
    const used = S.hints[ex.id] || 0;
    if (used < 2) {
      const b = document.createElement("button"); b.className = "btn";
      b.textContent = `Révéler l'indice ${used + 1}/2`;
      let armed = false;
      b.onclick = () => {
        if (!armed) { armed = true; b.textContent = "Sûr ? Il le saura. (cliquer pour confirmer)"; setTimeout(() => { if (armed) { armed = false; b.textContent = `Révéler l'indice ${used + 1}/2`; } }, 4000); return; }
        S.hints[ex.id] = used + 1; save(); render(); total(); whisper(rnd(TAUNTS));
        const t = document.getElementById("ex-" + ex.id); if (t) t.scrollIntoView({ block: "nearest" });
      };
      row.append(b);
    }
    if (S.solved[ex.id]) { const s = document.createElement("span"); s.className = "solved-tag"; s.textContent = "RÉSOLU"; row.append(s); }
    const hb = el.querySelector(".hints");
    for (let i = 0; i < used; i++) {
      const d = document.createElement("div"); d.className = "hint-box";
      const t = document.createElement("b"); t.textContent = `Indice ${i + 1} :`;
      d.append(t, document.createTextNode(" " + ex.hints[i]));
      hb.append(d);
    }
    list.append(el);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  render(); total();
  if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => t.scrollIntoView(), 50); }
});
})();
