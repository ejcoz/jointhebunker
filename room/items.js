// Join the Bunker: room catalogue. Every item draws itself in room coordinates (viewBox 0 0 300 400).
// slot = where it goes (one item per slot). box = the slot's area, used for catalogue thumbnails.
(() => {
const SLOTS = {
  lights: { n: "Ceiling", box: [0, 8, 300, 64] },
  wallA: { n: "Poster", box: [66, 70, 70, 72] },
  wallB: { n: "Wall", box: [226, 142, 72, 72] },
  blanket: { n: "Blanket", box: [20, 160, 204, 46] },
  pillow: { n: "Pillow", box: [24, 156, 56, 34] },
  top: { n: "On the locker", box: [112, 200, 62, 56] },
  locker: { n: "Footlocker", box: [64, 246, 108, 58] },
  rug: { n: "Rug", box: [30, 312, 204, 54] },
  corner: { n: "Corner", box: [4, 270, 66, 126] },
  petbed: { n: "Pet bed", box: [90, 300, 160, 70] },
  pettoy: { n: "Pet toy", box: [190, 336, 50, 40] },
  pethat: { n: "Pet hat", box: [130, 150, 80, 50] }
};
const CATS = [["all", "All"], ["bed", "Bed"], ["wall", "Walls"], ["floor", "Floor"], ["stuff", "Stuff"], ["lights", "Lights"], ["pet", "Pets"]];
const I = [];
const add = (id, n, c, slot, cat, d, draw, x = {}) => I.push(Object.assign({ id, n, c, slot, cat, d, draw }, x));

// ---- blankets (drawn over the mattress) ----
const blanket = (a, b, pat) => () => {
  let s = `<rect x="26" y="178" width="192" height="20" rx="5" fill="${a}" stroke="#121210" stroke-width="1.5"/><rect x="26" y="190" width="192" height="8" rx="4" fill="${b}"/>`;
  if (pat === "stripe") for (let k = 0; k < 8; k++) s += `<rect x="${34 + k * 24}" y="178" width="8" height="20" fill="${b}" opacity=".8"/>`;
  if (pat === "check") for (let k = 0; k < 16; k++) s += `<rect x="${26 + k * 12}" y="${178 + (k % 2) * 10}" width="12" height="10" fill="${b}" opacity=".7"/>`;
  if (pat === "star") for (let k = 0; k < 7; k++) s += star(44 + k * 26, 186 + (k % 2) * 4, 4, "#f2c230");
  if (pat === "plaid") { for (let k = 0; k < 8; k++) s += `<rect x="${32 + k * 24}" y="178" width="6" height="20" fill="${b}" opacity=".6"/>`; s += `<rect x="26" y="184" width="192" height="4" fill="${b}" opacity=".6"/>`; }
  return s + `<path d="M60 180 q20 6 40 0 M120 182 q24 7 48 0" stroke="#00000044" fill="none" stroke-width="1.5"/>`;
};
const star = (x, y, r, c) => { let p = ""; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; p += (k ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1); } return `<path d="${p}Z" fill="${c}"/>`; };
add("blanket-red", "Red blanket", 15, "blanket", "bed", "Warmer than the green ones.", blanket("#b8322a", "#7a1c16"));
add("blanket-navy", "Navy blanket", 15, "blanket", "bed", "Regulation, but darker.", blanket("#2b3f6b", "#1a2744"));
add("blanket-stripe", "Striped blanket", 30, "blanket", "bed", "Hand-sewn on B5.", blanket("#e8dcc0", "#b8322a", "stripe"));
add("blanket-check", "Checker blanket", 35, "blanket", "bed", "Doubles as a game board.", blanket("#1b1a15", "#e8dcc0", "check"));
add("blanket-plaid", "Plaid blanket", 40, "blanket", "bed", "Smells like a cabin.", blanket("#3f6b3a", "#b8322a", "plaid"));
add("blanket-star", "Star blanket", 60, "blanket", "bed", "The sky, but indoors.", blanket("#1a2744", "#0f1830", "star"));
add("blanket-gold", "Gold blanket", 150, "blanket", "bed", "For survivors who made it.", blanket("#e0a82a", "#a8741a"), { rare: true });
// ---- pillows ----
const pillow = (f, extra = "") => () => `<rect x="30" y="166" width="42" height="16" rx="7" fill="${f}" stroke="#121210"/>${extra}`;
add("pillow-stripe", "Striped pillow", 10, "pillow", "bed", "Blue and white.", pillow("#e8f0ff", `<path d="M38 167 v14 M48 167 v14 M58 167 v14 M66 168 v12" stroke="#2f7dd1" stroke-width="3"/>`));
add("pillow-heart", "Heart pillow", 15, "pillow", "bed", "Someone stitched it by hand.", pillow("#f7c1cf", `<path d="M51 179 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4z" fill="#c5476a"/>`));
add("pillow-star", "Star pillow", 15, "pillow", "bed", "Sweet dreams, survivor.", pillow("#1a2744", star(51, 174, 6, "#f2c230")));
add("pillow-gold", "Gold pillow", 80, "pillow", "bed", "Fancy. Very fancy.", pillow("#ffc23a", `<rect x="34" y="169" width="34" height="10" rx="4" fill="none" stroke="#a8741a"/>`), { rare: true });
// ---- posters (wall A) ----
const poster = (art, cap) => () => `<g transform="translate(78 78)"><rect width="46" height="56" fill="#f1ece0" stroke="#121210" stroke-width="1.5"/><svg x="4" y="4" width="38" height="40" viewBox="0 0 38 40">${art}</svg><text x="23" y="52" text-anchor="middle" style="font:400 5.6px Anton,sans-serif;fill:#3a2606;letter-spacing:.08em">${cap}</text></g>`;
add("poster-sunset", "Sunset poster", 20, "wallA", "wall", "What the sky used to look like.", poster(`<rect width="38" height="40" fill="#e8432e"/><rect width="38" height="22" fill="#f28c3a"/><circle cx="19" cy="26" r="9" fill="#ffd27a"/><path d="M0 32 l10 -8 l8 6 l10 -10 l10 10 v10 h-38z" fill="#2a1b2e"/>`, "THE SURFACE"));
add("poster-mountain", "Mountain poster", 20, "wallA", "wall", "Snow you can't remember.", poster(`<rect width="38" height="40" fill="#9fd6ff"/><path d="M0 40 l12 -24 l7 10 l8 -16 l11 30z" fill="#4b5a7a"/><path d="M12 16 l4 8 l-8 0z M27 10 l4 8 l-8 0z" fill="#fff"/>`, "THE PEAKS"));
add("poster-ocean", "Ocean poster", 20, "wallA", "wall", "Waves, from memory.", poster(`<rect width="38" height="40" fill="#2f7dd1"/><rect width="38" height="16" fill="#bfe0ff"/><path d="M0 22 q5 -4 10 0 t10 0 t10 0 t10 0 M0 30 q5 -4 10 0 t10 0 t10 0 t10 0" stroke="#e8f4ff" stroke-width="2" fill="none"/><circle cx="30" cy="8" r="4" fill="#fff6c8"/>`, "THE SEA"));
add("poster-stars", "Night sky poster", 25, "wallA", "wall", "Every star, named by someone on B5.", poster(`<rect width="38" height="40" fill="#0f1830"/>${[[6,6],[14,12],[28,5],[33,18],[9,24],[22,22],[30,32],[5,35],[17,32]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.1" fill="#fff"/>`).join("")}<path d="M24 8 a7 7 0 1 0 6 10 a6 6 0 1 1 -6 -10z" fill="#ffd27a"/>`, "THE NIGHT"));
add("poster-rocket", "Rocket poster", 30, "wallA", "wall", "Someone's leaving. Not you.", poster(`<rect width="38" height="40" fill="#f2c230"/><path d="M19 4 q8 10 4 24 h-8 q-4 -14 4 -24z" fill="#e8dcc0" stroke="#121210"/><circle cx="19" cy="15" r="3" fill="#2f7dd1" stroke="#121210"/><path d="M15 28 l-5 6 l5 -2z M23 28 l5 6 l-5 -2z" fill="#c5221f"/><path d="M16 28 l3 9 l3 -9z" fill="#ff8c2a"/>`, "LIFT-OFF"));
add("poster-map", "Bunker map", 40, "wallA", "wall", "All eight floors. Wait. Eight?", poster(`<rect width="38" height="40" fill="#e8dcc0"/>${[0,1,2,3,4,5,6].map(k=>`<rect x="6" y="${3 + k * 4.6}" width="26" height="3.4" fill="${k===6?"#c98b4f":"#8a8670"}"/>`).join("")}<rect x="15" y="36" width="8" height="3" fill="#c5221f"/>`, "BUNKER 1–8"));
add("poster-desert", "Desert poster", 20, "wallA", "wall", "Too hot. Stay down here.", poster(`<rect width="38" height="40" fill="#f6c38a"/><rect y="28" width="38" height="12" fill="#d88a3a"/><circle cx="28" cy="10" r="6" fill="#fff1a8"/><path d="M10 28 v-14 m0 4 h-4 v-5 m4 7 h4 v-6" stroke="#3f6b3a" stroke-width="3" fill="none" stroke-linecap="round"/>`, "THE DUNES"));
add("poster-gold", "Gold record", 120, "wallA", "wall", "Platinum, technically.", () => `<g transform="translate(78 80)"><rect width="46" height="52" fill="#15130f" stroke="#a8741a" stroke-width="2"/><circle cx="23" cy="22" r="15" fill="#e0a82a"/><circle cx="23" cy="22" r="11" fill="none" stroke="#a8741a"/><circle cx="23" cy="22" r="4" fill="#15130f"/><rect x="8" y="42" width="30" height="5" fill="#e0a82a"/></g>`, { rare: true });
// ---- wall B ----
add("wall-banner-gold", "Floor banner", 50, "wallB", "wall", "Gold on black. Shows your floor.", o => `<g transform="translate(240 146)"><path d="M0 0 h40 v50 l-20 -10 l-20 10z" fill="#15130f" stroke="#121210"/><path d="M0 0 h40" stroke="#f2c230" stroke-width="3"/><text x="20" y="24" text-anchor="middle" style="font:400 13px Anton,sans-serif;fill:#f2c230">${o.lvl || "B?"}</text><path d="M12 30 l8 -5 l8 5" stroke="#f2c230" fill="none" stroke-width="2"/></g>`);
add("wall-banner-red", "Watch banner", 50, "wallB", "wall", "For the Hatch Watch.", () => `<g transform="translate(240 146)"><path d="M0 0 h40 v50 l-20 -10 l-20 10z" fill="#7a1c16" stroke="#121210"/><path d="M0 0 h40" stroke="#f2c230" stroke-width="3"/><circle cx="20" cy="20" r="9" fill="none" stroke="#f2c230" stroke-width="2.5"/><path d="M20 11 v18 M11 20 h18" stroke="#f2c230" stroke-width="2"/></g>`);
add("wall-clock", "Wall clock", 30, "wallB", "wall", "Still ticking. Somehow.", () => `<g transform="translate(260 172)"><circle r="17" fill="#f1ece0" stroke="#121210" stroke-width="3"/>${[0,1,2,3,4,5,6,7,8,9,10,11].map(k=>`<rect x="-.8" y="-14" width="1.6" height="3" fill="#121210" transform="rotate(${k*30})"/>`).join("")}<path d="M0 0 v-9" stroke="#121210" stroke-width="2.2"/><path class="tick" d="M0 0 v-13" stroke="#c5221f" stroke-width="1.2"/><circle r="1.8" fill="#121210"/></g>`);
add("wall-shelf", "Book shelf", 45, "wallB", "wall", "Every book down here, read twice.", () => `<g transform="translate(236 178)"><rect x="0" y="20" width="56" height="5" fill="#8a5a2b" stroke="#121210"/>${[["#c5221f",14],["#2f7dd1",18],["#3fae49",12],["#f2c230",16],["#e8dcc0",15],["#7a3a2a",17]].map(([c,h],k)=>`<rect x="${3 + k * 8.4}" y="${20 - h}" width="7.4" height="${h}" fill="${c}" stroke="#121210" stroke-width=".8"/>`).join("")}</g>`);
add("wall-cork", "Photo board", 40, "wallB", "wall", "People from before.", () => `<g transform="translate(236 154)"><rect width="54" height="42" fill="#c98b4f" stroke="#5a3a1a" stroke-width="2.5"/>${[[6,6,"#bfe0ff"],[22,10,"#f7c1cf"],[38,5,"#ffe2a0"],[10,24,"#c9f0b4"],[30,24,"#e8dcc0"]].map(([x,y,c],k)=>`<rect x="${x}" y="${y}" width="13" height="11" fill="#fff" transform="rotate(${k%2?-6:5} ${x+6} ${y+5})"/><rect x="${x+1.5}" y="${y+1.5}" width="10" height="7" fill="${c}" transform="rotate(${k%2?-6:5} ${x+6} ${y+5})"/><circle cx="${x+6}" cy="${y}" r="1.4" fill="#c5221f"/>`).join("")}</g>`);
add("wall-mirror", "Round mirror", 35, "wallB", "wall", "You look like you need sleep.", () => `<g transform="translate(260 174)"><circle r="19" fill="#9fd6ff" stroke="#8a8670" stroke-width="4"/><path d="M-9 -8 l8 -6 M-6 0 l13 -10" stroke="#fff" stroke-width="2" opacity=".7"/></g>`);
add("wall-pennants", "Pennant string", 25, "wallB", "wall", "Every floor's colours.", () => `<path d="M230 150 q31 14 62 0" stroke="#121210" fill="none"/>${[0,1,2,3,4,5].map(k=>{const x=234+k*10.5,y=150+7*Math.sin(Math.PI*(k+.5)/6);return `<path d="M${x} ${y} h9 l-4.5 11z" fill="${["#c5221f","#f2c230","#3fae49","#2f7dd1","#ff7ad9","#e8dcc0"][k]}"/>`}).join("")}`);
// ---- on the locker ----
const top = s => () => `<g transform="translate(142 238)">${s}</g>`;
add("top-radio", "Old radio", 35, "top", "stuff", "Mostly static. Mostly.", top(`<rect x="-18" y="-12" width="36" height="24" rx="4" fill="#8a5a2b" stroke="#121210" stroke-width="1.5"/><circle cx="-7" cy="0" r="7" fill="#2b2420"/><circle cx="-7" cy="0" r="7" fill="none" stroke="#c9c1ad" stroke-dasharray="2 2"/><rect x="3" y="-5" width="11" height="4" fill="#ffd27a"/><circle cx="9" cy="6" r="2.5" fill="#c9c1ad"/><path d="M10 -12 l8 -12" stroke="#121210" stroke-width="1.5"/>`));
add("top-tv", "Tiny TV", 80, "top", "stuff", "One channel. It's the static one.", top(`<rect x="-20" y="-20" width="40" height="32" rx="5" fill="#5e5a48" stroke="#121210" stroke-width="1.5"/><rect class="static" x="-15" y="-15" width="24" height="22" rx="3" fill="#9fd6ff"/><circle cx="14" cy="-8" r="2.2" fill="#c9c1ad"/><circle cx="14" cy="0" r="2.2" fill="#c9c1ad"/><path d="M-6 -20 l-8 -10 M6 -20 l8 -10" stroke="#121210" stroke-width="1.5"/>`));
add("top-lamp", "Desk lamp", 30, "top", "stuff", "Reading light for the long nights.", top(`<ellipse cx="0" cy="11" rx="12" ry="3" fill="#2e2c24"/><path d="M0 10 l-6 -16 l10 -10" stroke="#2e2c24" stroke-width="3" fill="none"/><path d="M0 -20 l16 4 l-4 10z" fill="#3fae49" stroke="#121210"/><circle cx="10" cy="-8" r="10" fill="#ffd27a" opacity=".35"/>`));
add("top-lava", "Lava lamp", 70, "top", "stuff", "Groovy, in a bunker kind of way.", top(`<path d="M-5 12 h10 l-2 -6 h-6z" fill="#5e5a48"/><path d="M-6 6 l-3 -22 h18 l-3 22z" fill="#ff7ad9" opacity=".55" stroke="#121210"/><circle class="lava" cx="0" cy="-2" r="3.5" fill="#ff3b8a"/><circle class="lava2" cx="1" cy="-12" r="2.5" fill="#ff3b8a"/><path d="M-9 -16 h18 l-3 -6 h-12z" fill="#5e5a48"/>`));
add("top-books", "Book stack", 15, "top", "stuff", "Three books, one bookmark.", top(`<rect x="-16" y="2" width="32" height="8" fill="#c5221f" stroke="#121210"/><rect x="-13" y="-6" width="27" height="8" fill="#2f7dd1" stroke="#121210"/><rect x="-15" y="-13" width="29" height="7" fill="#3fae49" stroke="#121210"/><path d="M6 -13 v-6 l2 2 l2 -2 v6" fill="#f2c230"/>`));
add("top-globe", "Snow globe", 45, "top", "stuff", "A tiny bunker, inside a tinier world.", top(`<rect x="-10" y="4" width="20" height="8" rx="2" fill="#8a5a2b" stroke="#121210"/><circle cx="0" cy="-6" r="12" fill="#bfe0ff" opacity=".7" stroke="#121210"/><path d="M-5 2 v-6 l5 -4 l5 4 v6z" fill="#8a8670"/>${[[-6,-12],[4,-14],[7,-6],[-8,-4],[0,-16]].map(([x,y])=>`<circle class="snow" cx="${x}" cy="${y}" r="1" fill="#fff"/>`).join("")}`));
add("top-trophy", "Trophy", 100, "top", "stuff", "For winning. At what? Doesn't matter.", top(`<rect x="-10" y="6" width="20" height="6" fill="#5e5a48" stroke="#121210"/><path d="M-3 6 h6 v-6 h-6z" fill="#e0a82a"/><path d="M-11 -18 h22 q0 18 -11 18 q-11 0 -11 -18z" fill="#e0a82a" stroke="#a8741a"/><path d="M-11 -14 q-7 0 -6 6 q1 4 7 3 M11 -14 q7 0 6 6 q-1 4 -7 3" stroke="#e0a82a" stroke-width="2.5" fill="none"/>`), { rare: true });
add("top-cassette", "Tape player", 40, "top", "stuff", "One mixtape. It's good, actually.", top(`<rect x="-20" y="-10" width="40" height="22" rx="3" fill="#2e2c24" stroke="#121210"/><rect x="-14" y="-6" width="28" height="12" rx="2" fill="#e8dcc0"/><circle cx="-6" cy="0" r="3" fill="#2e2c24"/><circle cx="6" cy="0" r="3" fill="#2e2c24"/><rect x="-14" y="8" width="6" height="3" fill="#c5221f"/>`));
add("top-mug", "Plant in a mug", 20, "top", "stuff", "Coffee's gone. The plant stayed.", top(`<path d="M-8 -2 h16 v12 q0 3 -3 3 h-10 q-3 0 -3 -3z" fill="#f1ece0" stroke="#121210"/><path d="M8 1 q6 0 5 5 q-1 3 -5 3" stroke="#121210" fill="none" stroke-width="1.5"/><path d="M0 -2 q-8 -10 -2 -16 M0 -2 q4 -12 10 -12 M0 -2 q-2 -8 -10 -8" stroke="#3fae49" stroke-width="3.5" fill="none" stroke-linecap="round"/>`));
add("top-candle", "Candle jar", 15, "top", "stuff", "Smells like pine. Allegedly.", top(`<rect x="-8" y="-6" width="16" height="18" rx="3" fill="#ffd27a" opacity=".8" stroke="#121210"/><path class="flame" d="M0 -14 q4 4 0 8 q-4 -4 0 -8z" fill="#ff8c2a"/><circle cx="0" cy="-8" r="10" fill="#ffc23a" opacity=".2"/>`));
// ---- footlocker skins ----
const locker = (f, extra = "") => () => `<rect x="70" y="252" width="96" height="46" rx="3" fill="${f}" stroke="#121210" stroke-width="1.5"/><rect x="70" y="262" width="96" height="5" fill="#00000040"/>${extra}<rect x="112" y="270" width="12" height="10" rx="2" fill="#f2c230" stroke="#121210"/>`;
add("locker-red", "Red footlocker", 25, "locker", "stuff", "Fire-engine red.", locker("#a8322a"));
add("locker-navy", "Navy footlocker", 25, "locker", "stuff", "Navy, like the old fleet.", locker("#2b3f6b"));
add("locker-stickers", "Sticker locker", 45, "locker", "stuff", "Covered in stickers. Yours now.", locker("#4f5a3a", `${star(84, 282, 6, "#f2c230")}<circle cx="150" cy="282" r="6" fill="#ff7ad9"/><rect x="94" y="276" width="12" height="9" rx="2" fill="#3aa0ff" transform="rotate(-10 100 280)"/><path d="M134 274 l4 8 l4 -8z" fill="#3fae49"/>`));
add("locker-hazard", "Hazard locker", 50, "locker", "stuff", "Yellow and black. Very official.", locker("#f2c230", `${[0,1,2,3,4,5,6].map(k=>`<path d="M${70 + k * 14} 298 l10 -14 h6 l-10 14z" fill="#15130f"/>`).join("")}`));
add("locker-gold", "Gold footlocker", 200, "locker", "stuff", "Shiny enough to see yourself in.", locker("#e0a82a", `<rect x="76" y="270" width="84" height="2" fill="#fff6c8" opacity=".6"/>`), { rare: true });
// ---- rugs ----
const rug = (a, b, c2, pat) => () => {
  let s = `<ellipse cx="130" cy="338" rx="92" ry="20" fill="${a}"/>`;
  if (pat === "ring") s += `<ellipse cx="130" cy="338" rx="80" ry="15" fill="none" stroke="${b}" stroke-width="3" stroke-dasharray="6 4"/><ellipse cx="130" cy="338" rx="58" ry="9" fill="none" stroke="${c2}" stroke-width="2"/>`;
  if (pat === "stripe") s += `<ellipse cx="130" cy="338" rx="70" ry="14" fill="none" stroke="${b}" stroke-width="5"/><ellipse cx="130" cy="338" rx="44" ry="8" fill="none" stroke="${c2}" stroke-width="5"/>`;
  if (pat === "check") { s = `<path d="M50 322 h160 l14 30 h-188z" fill="${a}"/>`; for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) if ((r + k) % 2) s += `<path d="M${50 - r * 4.7 + k * (20 + r * 1.2)} ${322 + r * 10} h${20 + r * 1.2} l-1.5 10 h-${20 + r * 1.2}z" fill="${b}"/>`; }
  if (pat === "star") s += star(130, 338, 13, b);
  if (pat === "b") s += `<text x="130" y="345" text-anchor="middle" style="font:400 20px Anton,sans-serif;fill:${b}">B</text>`;
  return s;
};
add("rug-braided", "Braided rug", 25, "rug", "floor", "No more cold feet.", rug("#7a3a2a", "#c98b4f", "#e6c27a", "ring"));
add("rug-blue", "Round blue rug", 25, "rug", "floor", "Calm. Very calm.", rug("#2b3f6b", "#5a9be0", "#bfe0ff", "stripe"));
add("rug-check", "Checker rug", 40, "rug", "floor", "Black and white tiles, but soft.", rug("#e8dcc0", "#1b1a15", "", "check"));
add("rug-star", "Star rug", 45, "rug", "floor", "Wish on it.", rug("#1a2744", "#f2c230", "", "star"));
add("rug-green", "Garden rug", 30, "rug", "floor", "Feels like grass if you squint.", rug("#3f6b3a", "#6aa84f", "#9cf04a", "stripe"));
add("rug-gold", "Bunker rug", 150, "rug", "floor", "The big gold B.", rug("#15130f", "#f2c230", "", "b"), { rare: true });
// ---- corner ----
const corner = s => () => `<g transform="translate(36 374)">${s}</g>`;
add("corner-plant", "Potted plant", 25, "corner", "floor", "A cutting from the garden.", corner(`<path d="M-12 -22 h24 l-3 22 h-18z" fill="#b8611f" stroke="#121210" stroke-width="1.5"/><path d="M0 -22 q-14 -20 -6 -34 M0 -22 q2 -26 12 -32 M0 -22 q16 -14 18 -24 M0 -22 q-20 -6 -22 -18" stroke="#3fae49" stroke-width="5" fill="none" stroke-linecap="round"/>`));
add("corner-cactus", "Cactus", 20, "corner", "floor", "Low maintenance. Like you.", corner(`<path d="M-11 -18 h22 l-3 18 h-16z" fill="#c98b4f" stroke="#121210" stroke-width="1.5"/><rect x="-6" y="-58" width="12" height="40" rx="6" fill="#3f8a3a" stroke="#1f3a1b"/><path d="M-6 -34 h-6 v-12 M6 -40 h6 v-10" stroke="#3f8a3a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="0" cy="-58" r="3" fill="#ff7ad9"/>`));
add("corner-fern", "Tall fern", 40, "corner", "floor", "Taller than the guard on B6.", corner(`<rect x="-10" y="-20" width="20" height="20" rx="3" fill="#5e5a48" stroke="#121210"/>${[-50,-30,-10,10,30,50].map(a=>`<path d="M0 -20 q${a*.5} -40 ${a*.9} -70" stroke="#3fae49" stroke-width="4" fill="none" stroke-linecap="round"/>`).join("")}`));
add("corner-floorlamp", "Floor lamp", 45, "corner", "lights", "Warm light for the corner.", corner(`<ellipse cx="0" cy="-2" rx="12" ry="3" fill="#2e2c24"/><rect x="-1.5" y="-80" width="3" height="78" fill="#2e2c24"/><path d="M-14 -78 h28 l-6 -16 h-16z" fill="#e8dcc0" stroke="#121210"/><circle cx="0" cy="-72" r="26" fill="#ffd27a" opacity=".25"/>`));
add("corner-beanbag", "Beanbag", 60, "corner", "floor", "The best seat in the bunker.", corner(`<path d="M-28 0 q-6 -34 22 -38 q30 -2 32 30 q1 8 -6 8z" fill="#c5221f" stroke="#121210" stroke-width="1.5"/><path d="M-10 -26 q8 6 20 0" stroke="#00000044" stroke-width="2" fill="none"/>`));
add("corner-guitar", "Guitar", 90, "corner", "floor", "Knows three songs. They're all sad.", corner(`<path d="M-6 0 l3 -14 h6 l3 14z" fill="#2e2c24"/><g transform="rotate(-8)"><ellipse cx="0" cy="-26" rx="13" ry="15" fill="#c98b4f" stroke="#121210"/><ellipse cx="0" cy="-46" rx="10" ry="11" fill="#c98b4f" stroke="#121210"/><circle cx="0" cy="-34" r="4" fill="#2e2c24"/><rect x="-2" y="-90" width="4" height="46" fill="#5a3a1a"/><rect x="-4" y="-96" width="8" height="8" rx="2" fill="#5a3a1a"/></g>`));
add("corner-crates", "Supply crates", 30, "corner", "floor", "Rations. Don't tell the cook.", corner(`<rect x="-26" y="-26" width="30" height="26" fill="#8a5a2b" stroke="#121210"/><path d="M-26 -26 l30 26 M4 -26 l-30 26" stroke="#5a3a1a"/><rect x="-14" y="-48" width="26" height="22" fill="#a8743a" stroke="#121210"/><text x="-1" y="-33" text-anchor="middle" style="font:400 8px Anton,sans-serif;fill:#3a2606">B4</text>`));
add("corner-fridge", "Mini fridge", 70, "corner", "floor", "Just snacks. Mostly.", corner(`<rect x="-18" y="-48" width="36" height="48" rx="4" fill="#e8f0ff" stroke="#121210" stroke-width="1.5"/><path d="M-18 -30 h36" stroke="#121210"/><rect x="10" y="-44" width="3" height="10" rx="1" fill="#8a8670"/><rect x="10" y="-24" width="3" height="14" rx="1" fill="#8a8670"/>${star(-6, -40, 4, "#ff7ad9")}`));
// ---- ceiling lights ----
const lights = cols => () => { let s = `<path d="M0 34 Q150 64 300 34" stroke="#121210" stroke-width="1" fill="none"/>`; for (let k = 0; k < 15; k++) { const t = (k + .5) / 15, x = t * 300, y = 22 + 30 * (1 - (2 * t - 1) ** 2) + 8, c = cols[k % cols.length]; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${c}" opacity=".18"/><circle class="twinkle" style="animation-delay:${(k % 5) * .4}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${c}"/>`; } return s; };
add("lights-rainbow", "Rainbow lights", 30, "lights", "lights", "Salvaged from the surface.", lights(["#ff5a4a", "#f2c230", "#3fae49", "#3aa0ff", "#ff7ad9"]));
add("lights-warm", "Warm lights", 30, "lights", "lights", "Cozy. Like a cabin.", lights(["#ffd27a", "#ffe2a0"]));
add("lights-blue", "Icicle lights", 35, "lights", "lights", "Cold colour, warm feeling.", lights(["#9fd6ff", "#e8f4ff", "#3aa0ff"]));
add("lights-holiday", "Holiday lights", 35, "lights", "lights", "Red and green. Every day.", lights(["#ff3b3b", "#3fae49"]));
add("lights-pink", "Pink lights", 35, "lights", "lights", "Pink and purple glow.", lights(["#ff7ad9", "#b48cff"]));
add("lights-gold", "Gold lights", 120, "lights", "lights", "For the survivors' survivors.", lights(["#ffc23a", "#fff1a8"]), { rare: true });
// ---- pet stuff (shown only with a bunkmate; the room places it by pet) ----
add("pet-cushion-blue", "Blue pet cushion", 20, "petbed", "pet", "For your bunkmate.", () => "", { pet: true, color: "#2f7dd1" });
add("pet-cushion-red", "Red pet cushion", 20, "petbed", "pet", "For your bunkmate.", () => "", { pet: true, color: "#c5221f" });
add("pet-cushion-plaid", "Plaid pet cushion", 35, "petbed", "pet", "The fancy one.", () => "", { pet: true, color: "#3f6b3a", plaid: true });
add("pet-ball", "Chew ball", 15, "pettoy", "pet", "Squeaks. A lot.", () => `<circle cx="214" cy="356" r="6" fill="#ff3b3b" stroke="#121210"/><path d="M209 353 q5 4 10 0" stroke="#fff" stroke-width="1.5" fill="none"/>`, { pet: true, toy: true });
add("pet-crown", "Pet crown", 90, "pethat", "pet", "Royalty of B-floor.", () => "", { pet: true, crown: true, rare: true });

window.BK_ITEMS = { SLOTS, CATS, ITEMS: I, BY: Object.fromEntries(I.map(i => [i.id, i])), star };
})();
