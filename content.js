// Masa üstü etkileşimleri: yırtık kenarlar, 3D kutu, kart dosyası, kural kitapçığı, büyüteç, parça tepsisi.
// Kart sayıları ve metinler 16 sayfalık kural kitapçığından (Figma "10 · Kural Kitapçığı").

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
  personel: { back: "arka-1", note: "Personel elde tutulmaz: önünde açık durur, çalışınca yorulur. Kadroda en fazla 6 kart.", cards: [["isci", 14], ["usta", 6], ["muhendis", 6], ["dalgic", 4]] },
  malzeme:  { back: "arka-2", note: "Malzeme elde tutulur, inşaatta harcanır. Elde en fazla 8 kart.", cards: [["beton", 16], ["celik", 14], ["tas", 10]] },
  olay:     { back: "arka-3", note: "Olaylar kendi turunda, iki adımın arasında oynanır. Sigorta ise sana oynandığı anda, sıra sende olmasa da.", cards: [["lodos", 3], ["grev", 3], ["gecikme", 2], ["sponsor", 2], ["mesai", 2], ["sigorta", 2]] },
  izin:     { back: "arka-4", note: "Belediye duraklarından (11, 21) alınır. Yalnız 8. parçada, Karşı Kıyı'da harcanır.", cards: [["izin", 6]] },
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

// Büyüteç: kitapçık sayfalarını ve fotoğrafları ekran boyunda gösterir; görsele tıklayınca yakınlaşır.
const viewer = document.getElementById("viewer");
const vStage = document.getElementById("viewer-stage");
const vCap = document.getElementById("viewer-cap");
const vPrev = document.getElementById("viewer-prev");
const vNext = document.getElementById("viewer-next");
let vSlides = [], vAt = 0, vClose = null;
function viewerShow(i) {
  vAt = Math.max(0, Math.min(vSlides.length - 1, i));
  const s = vSlides[vAt];
  viewer.dataset.kind = s.kind;
  delete viewer.dataset.zoom;
  vStage.replaceChildren(...s.imgs.map((im, k) => {
    const el = new Image(im.w, im.h);
    el.src = im.src; el.alt = im.alt; el.dataset.k = k; el.draggable = false;
    return el;
  }));
  vCap.textContent = s.cap;
  vPrev.disabled = vAt === 0;
  vNext.disabled = vAt === vSlides.length - 1;
  vPrev.hidden = vNext.hidden = vSlides.length < 2;
  viewer.scrollTop = 0;
}
function viewerOpen(slides, at, onClose) {
  vSlides = slides; vClose = onClose || null;
  viewerShow(at);
  viewer.showModal();
}
vPrev.addEventListener("click", () => viewerShow(vAt - 1));
vNext.addEventListener("click", () => viewerShow(vAt + 1));
document.getElementById("viewer-x").addEventListener("click", () => viewer.close());
viewer.addEventListener("close", () => { vClose?.(vAt); vStage.replaceChildren(); });
viewer.addEventListener("click", e => {
  if (e.target === viewer || e.target.classList.contains("viewer-body")) { viewer.close(); return; }
  const img = e.target.closest(".viewer-stage img");
  if (!img) return;
  if (viewer.dataset.zoom) delete viewer.dataset.zoom;
  else {
    viewer.dataset.zoom = img.dataset.k;
    vStage.querySelectorAll("img").forEach(el => el.classList.toggle("z", el === img));
  }
  viewer.scrollTop = 0;
});
viewer.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") { viewerShow(vAt + 1); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { viewerShow(vAt - 1); e.preventDefault(); }
});

// Kural kitapçığı: 16 sayfa A5, tel dikiş. 8 yaprak; yaprak i'nin ön yüzü 2i+1, arka yüzü 2i+2.
// Geniş ekranda açık kitap (çift sayfa), dar ekranda tek sayfa.
const KITAP = {
  adlar: ["Kapak", "Haliç'in iki yakası", "Oyuna genel bakış", "Bileşenler", "Oyun tahtası", "Duraklar",
    "Kartlar ve personel", "Malzeme, izin ve olay", "Kurulum", "Oyuncu sayısına göre", "Tur akışı ve hareket",
    "İnşaat", "Örnek tur ve oyunun sonu", "Serbest alanlar ve ev kuralları", "Sık sorulanlar ve terimler", "Arka kapak: tur özeti"],
  // kenardan taşan işaret kâğıtları: [yaprak, etiket, renk]; yaprağın iki yüzünde de görünür
  isaretler: [[1, "Genel bakış", "#E0A030"], [2, "Bileşenler", "#2EA3A0"], [3, "Duraklar", "#6E9A45"],
    [4, "Kurulum", "#C23B2A"], [5, "Tur akışı", "#22479A"], [6, "İnşaat", "#6B3B5E"], [7, "SSS", "#D0704F"]],
  // bölüm listesi (dar ekranda ve klavyeyle): [sayfa, etiket, renk]
  bolumler: [[1, "Kapak", "#8C8A84"], [3, "Genel bakış", "#E0A030"], [4, "Bileşenler", "#2EA3A0"], [5, "Tahta", "#2EA3A0"],
    [6, "Duraklar", "#6E9A45"], [7, "Kartlar", "#6E9A45"], [9, "Kurulum", "#C23B2A"], [10, "Oyuncu sayısı", "#C23B2A"],
    [11, "Tur akışı", "#22479A"], [12, "İnşaat", "#6B3B5E"], [13, "Örnek tur", "#6B3B5E"], [14, "Ev kuralları", "#D0704F"],
    [15, "SSS", "#D0704F"], [16, "Tur özeti", "#8C8A84"]],
};
const SAYFA = KITAP.adlar.length, YAPRAK = SAYFA / 2;
const pageSrc = (n, big) => `img/kitapcik/k${String(n).padStart(2, "0")}${big ? "" : "-1x"}.webp`;
const pageAlt = n => `Kural kitapçığı, sayfa ${n}: ${KITAP.adlar[n - 1]}`;

const book = document.getElementById("book");
const single = document.getElementById("book-single");
const singleImg = single.querySelector("img");
const bPrev = document.getElementById("book-prev");
const bNext = document.getElementById("book-next");
const bPager = document.getElementById("book-pager");
const narrow = matchMedia("(max-width: 760px)");

const sheets = [];
for (let i = 0; i < YAPRAK; i++) {
  const sh = document.createElement("div");
  sh.className = "sheet"; sh.dataset.i = i;
  for (const [side, n] of [["front", 2 * i + 1], ["back", 2 * i + 2]]) {
    const pg = document.createElement("div");
    pg.className = "pg " + side;
    const img = new Image(592, 840);
    img.alt = pageAlt(n); img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
    img.srcset = `${pageSrc(n)} 592w, ${pageSrc(n, true)} 1184w`;
    img.sizes = "(max-width: 1075px) 40vw, 430px";
    img.src = pageSrc(n);
    pg.appendChild(img);
    sh.appendChild(pg);
  }
  sheets.push(sh);
  book.appendChild(sh);
}
KITAP.isaretler.forEach(([i, label, color], k) => {
  for (const pg of sheets[i].querySelectorAll(".pg")) {
    const f = document.createElement("button");
    f.type = "button"; f.className = "flag"; f.tabIndex = -1;
    f.setAttribute("aria-hidden", "true");
    f.append(document.createElement("span"));
    f.firstChild.textContent = label; f.dataset.go = i;
    f.style.setProperty("--fc", color); f.style.setProperty("--k", k);
    pg.appendChild(f);
  }
});
const bIndex = document.getElementById("book-index");
KITAP.bolumler.forEach(([n, label, color]) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = label; b.dataset.page = n;
  b.style.setProperty("--fc", color);
  b.setAttribute("aria-label", `${label}, sayfa ${n}`);
  bIndex.appendChild(b);
});

let cur = 0;   // çevrilmiş yaprak sayısı: 0 kapalı (ön kapak), 8 arka kapak
let page = 1;  // dar ekranda gösterilen sayfa
let zTop = 20;
const moving = new Set();
const isNarrow = () => narrow.matches;

function layout() {
  sheets.forEach((sh, i) => {
    const t = i < cur;
    if (!moving.has(sh)) {
      sh.classList.toggle("turned", t);
      sh.style.zIndex = t ? i + 1 : YAPRAK - i;
    }
    sh.classList.toggle("is-next", i === cur);
    sh.classList.toggle("is-prev", i === cur - 1);
    sh.querySelector(".front").setAttribute("aria-hidden", String(i !== cur));
    sh.querySelector(".back").setAttribute("aria-hidden", String(i !== cur - 1));
  });
  book.classList.toggle("closed-front", cur === 0);
  book.classList.toggle("closed-back", cur === YAPRAK);
  book.classList.toggle("center", cur === YAPRAK / 2);
  book.style.setProperty("--ls", cur);
  book.style.setProperty("--rs", YAPRAK - cur);
  pagerUpdate();
}

function pagerUpdate() {
  let head, sub, first, last;
  if (isNarrow()) {
    head = `Sayfa ${page} / ${SAYFA}`; sub = KITAP.adlar[page - 1];
    first = page === 1; last = page === SAYFA;
  } else {
    first = cur === 0; last = cur === YAPRAK;
    if (first) { head = "Kapak"; sub = "16 sayfa"; }
    else if (last) { head = "Arka kapak"; sub = "Tur özeti"; }
    else { head = `Sayfa ${2 * cur}–${2 * cur + 1} / ${SAYFA}`; sub = `${KITAP.adlar[2 * cur - 1]} · ${KITAP.adlar[2 * cur]}`; }
  }
  bPager.innerHTML = `<b>${head}</b><small>${sub}</small>`;
  bPrev.disabled = first; bNext.disabled = last;
  const visible = isNarrow() ? [page] : [2 * cur, 2 * cur + 1];
  bIndex.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", String(visible.includes(+b.dataset.page))));
  // dar ekranda işaret şeridi yana kayar: geçerli bölümü ortaya getir (sayfayı dikey kaydırmadan)
  const on = bIndex.querySelector('[aria-current="true"]');
  if (on && bIndex.scrollWidth > bIndex.clientWidth) {
    bIndex.scrollTo({ left: on.offsetLeft - bIndex.offsetLeft - (bIndex.clientWidth - on.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }
}

// Yaprakları sırayla çevirir; birden çok yaprak atlanırken hafif bir gecikmeyle hepsi döner.
function go(target) {
  target = Math.max(0, Math.min(YAPRAK, target));
  if (target === cur) return;
  const dir = Math.sign(target - cur);
  const order = [];
  for (let i = cur; i !== target; i += dir) order.push(dir > 0 ? i : i - 1);
  cur = target;
  page = cur === 0 ? 1 : Math.min(SAYFA, 2 * cur);
  book.classList.add("turning");
  order.forEach((i, k) => {
    const sh = sheets[i];
    moving.add(sh);
    clearTimeout(sh._start); clearTimeout(sh._end);
    sh._start = setTimeout(() => {
      sh.style.zIndex = ++zTop;
      sh.classList.toggle("turned", dir > 0);
    }, k * 120);
    sh._end = setTimeout(() => {
      moving.delete(sh);
      if (!moving.size) { zTop = 20; book.classList.remove("turning"); }
      layout();
    }, k * 120 + 950);
  });
  layout();
}

// Dar ekran: tek sayfa, kaydırarak ya da dokunarak çevrilir
function showPage(n, dir = 0) {
  n = Math.max(1, Math.min(SAYFA, n));
  if (n === page && dir) return;
  page = n;
  cur = Math.floor(page / 2);
  const big = devicePixelRatio > 1.3;
  singleImg.src = pageSrc(page, big);
  singleImg.alt = pageAlt(page);
  singleImg.classList.remove("turn-f", "turn-b");
  if (dir) { void singleImg.offsetWidth; singleImg.classList.add(dir > 0 ? "turn-f" : "turn-b"); }
  for (const m of [page - 1, page + 1]) if (m >= 1 && m <= SAYFA) new Image().src = pageSrc(m, big);
  layout();
}
const step = d => isNarrow() ? showPage(page + d, d) : go(cur + d);
bPrev.addEventListener("click", () => step(-1));
bNext.addEventListener("click", () => step(1));
bIndex.addEventListener("click", e => {
  const b = e.target.closest("button[data-page]");
  if (!b) return;
  const n = +b.dataset.page;
  if (isNarrow()) showPage(n, n > page ? 1 : -1);
  else go(Math.floor(n / 2));
});
book.addEventListener("click", e => {
  const f = e.target.closest(".flag");
  if (f) { go(+f.dataset.go); return; }
  const sh = e.target.closest(".sheet");
  if (!sh) return;
  const i = +sh.dataset.i;
  go(sh.classList.contains("turned") ? i : i + 1);
});
book.addEventListener("keydown", e => {
  const k = e.key;
  if (k === "ArrowRight" || k === "PageDown") go(cur + 1);
  else if (k === "ArrowLeft" || k === "PageUp") go(cur - 1);
  else if (k === "Home") go(0);
  else if (k === "End") go(YAPRAK);
  else if (k === "Enter") openReader();
  else return;
  e.preventDefault();
});
// tek sayfada: sağa/sola kaydır, ya da sayfanın sağına/soluna dokun
let swipe = null;
single.addEventListener("pointerdown", e => { swipe = { x: e.clientX, y: e.clientY }; });
single.addEventListener("pointerup", e => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showPage(page + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
    const r = single.getBoundingClientRect();
    showPage(page + (e.clientX > r.left + r.width / 2 ? 1 : -1), e.clientX > r.left + r.width / 2 ? 1 : -1);
  }
});
narrow.addEventListener("change", () => isNarrow() ? showPage(page) : layout());

// Büyüterek oku: geniş ekranda çift sayfa, dar ekranda tek sayfa
function openReader() {
  const slide = n => ({ src: pageSrc(n, true), alt: pageAlt(n), w: 1184, h: 1680 });
  let slides, at;
  if (isNarrow()) {
    slides = KITAP.adlar.map((ad, k) => ({ kind: "page", imgs: [slide(k + 1)], cap: `Sayfa ${k + 1} / ${SAYFA} · ${ad}` }));
    at = page - 1;
  } else {
    slides = [];
    for (let s = 0; s <= YAPRAK; s++) {
      const ns = [2 * s, 2 * s + 1].filter(n => n >= 1 && n <= SAYFA);
      slides.push({ kind: "spread", imgs: ns.map(slide),
        cap: ns.length === 1 ? `${KITAP.adlar[ns[0] - 1]} · sayfaya tıkla, yakınlaşsın` : `Sayfa ${ns[0]}–${ns[1]} / ${SAYFA} · sayfaya tıkla, yakınlaşsın` });
    }
    at = cur;
  }
  viewerOpen(slides, at, i => isNarrow() ? showPage(i + 1) : go(i));
}
document.getElementById("book-read").addEventListener("click", openReader);
if (isNarrow()) showPage(1); else layout();

// Dijital sürüm: baskılara tıklayınca büyür
const SHOTS = [
  { src: "img/dijital/oyun.webp", alt: "Unity sürümünde oyun ekranı, Hareket adımı", cap: "Unity sürümü · Hareket adımı: ZAR ya da KARTLA GİT" },
  { src: "img/dijital/menu.webp", alt: "Unity sürümünün ana menüsü ve masadaki oyun kutusu", cap: "Unity sürümü · Ana menü" },
];
document.querySelectorAll(".shot").forEach(b => b.addEventListener("click", () => {
  viewerOpen(SHOTS.map(s => ({ kind: "photo", imgs: [{ src: s.src, alt: s.alt, w: 1600, h: 900 }], cap: s.cap })), +b.dataset.shot);
}));

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
