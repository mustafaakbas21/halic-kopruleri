// Masa üstü etkileşimleri: yırtık kenarlar, 3D kutu, kart dosyası, kitapçık, parça tepsisi.
// Kart sayıları ve metinleri "Kurallar: Heavy ve Light" belgesinden.

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Yırtık kâğıt kenarı: üst ve alt kenara düzensiz bir çizgi
function seeded(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function tear(el) {
  const rnd = seeded(Number(el.dataset.seed) || 1);
  const pts = [];
  const n = 46;
  for (let i = 0; i <= n; i++) pts.push(`${(i / n * 100).toFixed(2)}% ${(rnd() * 9).toFixed(1)}px`);
  for (let i = n; i >= 0; i--) pts.push(`${(i / n * 100).toFixed(2)}% calc(100% - ${(rnd() * 9).toFixed(1)}px)`);
  el.style.setProperty("--tear", `polygon(${pts.join(",")})`);
}
document.querySelectorAll(".torn").forEach(tear);

// 3D kutu: sürükle ya da düğmeyle çevir
const box = document.getElementById("box");
const rest = { rx: 52, rz: -14 };
let rot = { ...rest };
let flipped = false;
function applyBox() {
  box.style.setProperty("--rx", rot.rx + "deg");
  box.style.setProperty("--rz", rot.rz + "deg");
}
let drag = null;
box.addEventListener("pointerdown", e => {
  drag = { x: e.clientX, y: e.clientY, rx: rot.rx, rz: rot.rz };
  box.setPointerCapture(e.pointerId);
  box.classList.add("dragging");
});
box.addEventListener("pointermove", e => {
  if (!drag) return;
  rot.rz = drag.rz + (e.clientX - drag.x) * .4;
  rot.rx = Math.max(10, Math.min(250, drag.rx - (e.clientY - drag.y) * .4));
  applyBox();
});
const endDrag = () => {
  if (!drag) return;
  drag = null; box.classList.remove("dragging");
  flipped = rot.rx > 140;
};
box.addEventListener("pointerup", endDrag);
box.addEventListener("pointercancel", endDrag);
document.getElementById("flip").addEventListener("click", () => {
  flipped = !flipped;
  rot = flipped ? { rx: 52 + 180, rz: rest.rz + 360 * 0 } : { ...rest };
  applyBox();
  document.getElementById("flip").textContent = flipped ? "Kapağa dön" : "Kutuyu çevir";
});
// imleçle hafif eğim
if (!reduce) {
  addEventListener("pointermove", e => {
    if (drag) return;
    const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
    box.style.setProperty("--rz", (rot.rz + dx * 6) + "deg");
    box.style.setProperty("--rx", (rot.rx + dy * 4) + "deg");
  }, { passive: true });
}
applyBox();

// Kart dosyası
const DECKS = {
  personel: { back: "arka-1", note: "Personel harcanmaz, yorulur. Kadronda en fazla 6 kişi olabilir.", cards: [["isci", 14], ["usta", 6], ["muhendis", 6], ["dalgic", 4]] },
  malzeme:  { back: "arka-2", note: "Malzeme elde tutulur ve inşaatta harcanır. Elde en fazla 8 kart.", cards: [["beton", 16], ["celik", 14], ["tas", 10]] },
  olay:     { back: "arka-3", note: "Olaylar kendi turunda oynanır. Sigorta ise sana oynandığı anda.", cards: [["lodos", 3], ["grev", 3], ["gecikme", 2], ["sponsor", 2], ["mesai", 2], ["sigorta", 2]] },
  izin:     { back: "arka-4", note: "İzin yalnızca 8. parçada, Karşı Kıyı'da harcanır.", cards: [["izin", 6]] },
};
const NAMES = { isci: "İşçi", usta: "Usta", muhendis: "Mühendis", dalgic: "Dalgıç", beton: "Beton", celik: "Çelik", tas: "Taş", lodos: "Lodos", grev: "Grev", gecikme: "Gecikme", sponsor: "Sponsor", mesai: "Mesai", sigorta: "Sigorta", izin: "Belediye İzni" };
const spread = document.getElementById("spread");
function renderDeck(key) {
  const d = DECKS[key];
  const rnd = seeded(key.length * 7);
  document.getElementById("deck-note").textContent = d.note + " Kartın üstüne tıkla, arkasını gör.";
  spread.innerHTML = "";
  d.cards.forEach(([slug, n]) => {
    const b = document.createElement("button");
    b.className = "fcard"; b.type = "button";
    b.style.setProperty("--r", ((rnd() - .5) * 6).toFixed(1) + "deg");
    b.setAttribute("aria-label", `${NAMES[slug]}, destede ${n} adet. Çevirmek için tıkla.`);
    b.innerHTML = `
      <span class="count">×${n}</span>
      <span class="inner">
        <img src="img/figma/k-${slug}.webp" alt="${NAMES[slug]} kartı" loading="lazy">
        <img class="back" src="img/figma/${d.back}.webp" alt="" loading="lazy">
      </span>`;
    b.addEventListener("click", () => b.classList.toggle("flipped"));
    spread.appendChild(b);
  });
}
document.querySelectorAll(".folder-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".folder-tabs button").forEach(b => b.setAttribute("aria-selected", String(b === btn)));
    renderDeck(btn.dataset.deck);
  });
});
renderDeck("personel");

// Kitapçık: tek yaprak çevrilir (2. sayfanın arkası 3. sayfa)
const leaf = document.getElementById("leaf");
const turn = document.getElementById("turn");
turn.addEventListener("click", () => {
  const on = leaf.classList.toggle("turned");
  turn.textContent = on ? "← Geri çevir" : "Sayfayı çevir →";
  document.getElementById("pager").textContent = on ? "Sayfa 3–4 / 4" : "Sayfa 1–2 / 4";
});

// Parça tepsisi
for (const t of ["a", "b"]) {
  const row = document.getElementById("tray-" + t);
  for (let i = 1; i <= 8; i++) {
    const img = document.createElement("img");
    img.src = `img/figma/p-${t}${i}.webp`;
    img.alt = `${t.toUpperCase()}${i}`;
    img.loading = "lazy";
    row.appendChild(img);
  }
}

// Gazetedeki 3D levhadan gelen ilerleme
addEventListener("bridge-progress", e => {
  document.getElementById("ta").textContent = e.detail.a;
  document.getElementById("tb").textContent = e.detail.b;
});
