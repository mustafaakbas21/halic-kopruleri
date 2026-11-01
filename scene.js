// 3D Haliç sahnesi. Kamera Boğaz tarafından Haliç'e bakar: solda Fatih (güney, +z), sağda Beyoğlu (kuzey, -z).
// Unkapanı Köprüsü (Fatih, kırmızı) güneyden, Galata Köprüsü (Beyoğlu, mavi) kuzeyden kurulur.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("halic");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const HORIZON = new THREE.Color("#e9cf9c");
scene.fog = new THREE.Fog(HORIZON, 60, 210);

// Gökyüzü: gün batımına doğru sepya degrade
{
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#a98a62"); grd.addColorStop(.45, "#d8b98a"); grd.addColorStop(.62, "#f1d8a4"); grd.addColorStop(1, "#e9cf9c");
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}

const camera = new THREE.PerspectiveCamera(38, 1, .5, 600);

// Işık: batıdan alçak güneş
scene.add(new THREE.HemisphereLight("#fbe7c2", "#5d5242", 1.1));
const sun = new THREE.DirectionalLight("#ffd9a0", 2.2);
sun.position.set(-90, 38, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 50, bottom: -50, near: 10, far: 260 });
scene.add(sun);

// Güneş diski
{
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,244,214,1)"); grd.addColorStop(.25, "rgba(255,226,160,.9)"); grd.addColorStop(1, "rgba(255,210,140,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false }));
  spr.position.set(-260, 22, 18); spr.scale.set(70, 70, 1);
  scene.add(spr);
}

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: 0, flatShading: true, ...extra });
const MAT = {
  tas: M("#d2bd92"), tasKoyu: M("#a99470"), ahsap: M("#6b4a30"), demir: M("#3b3631", { roughness: .6, metalness: .3 }),
  krem: M("#efe1c0"), kiremit: M("#b0553a"), kursun: M("#8d8f8a", { roughness: .5, metalness: .2 }),
  kirmizi: M("#c23b2a"), kobalt: M("#2c54a8"), siyah: M("#2b2520"), yesil: M("#6e7d4a"),
};

// Su
const WATER_W = 360, WATER_D = 260;
const waterGeo = new THREE.PlaneGeometry(WATER_W, WATER_D, 110, 80);
waterGeo.rotateX(-Math.PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: "#5f8780", roughness: .35, metalness: .1, flatShading: true }));
water.receiveShadow = true;
scene.add(water);

// Kıyılar ve tepeler
const SHORE = 19; // su yarı genişliği (z)
function shore(sign) {
  const g = new THREE.Group();
  const quay = new THREE.Mesh(new THREE.BoxGeometry(300, 3, 6), MAT.tas);
  quay.position.set(-40, .5, sign * (SHORE + 3)); quay.receiveShadow = true; g.add(quay);
  const land = new THREE.Mesh(new THREE.BoxGeometry(300, 3, 120), MAT.tasKoyu);
  land.position.set(-40, .4, sign * (SHORE + 66)); g.add(land);
  // tepe: üst üste binen basamaklar
  for (let i = 0; i < 4; i++) {
    const hill = new THREE.Mesh(new THREE.BoxGeometry(300, 4 + i * 3, 14), MAT.tasKoyu);
    hill.position.set(-40, 2 + i * 1.5, sign * (SHORE + 16 + i * 12));
    g.add(hill);
  }
  return g;
}
scene.add(shore(1), shore(-1));

// Evler
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const houseGeo = new THREE.BoxGeometry(1, 1, 1);
const roofGeo = new THREE.ConeGeometry(.75, .6, 4); roofGeo.rotateY(Math.PI / 4);
const walls = ["#efe1c0", "#e2cfa6", "#d9b98c", "#c9a47c", "#e8d6b5"].map(c => M(c));
function town(sign, count) {
  for (let i = 0; i < count; i++) {
    const x = -150 + rand() * 172;
    const row = Math.floor(rand() * 4);
    const z = sign * (SHORE + 9 + row * 12 + rand() * 7);
    const base = 2 + row * 3.1;
    const w = 2 + rand() * 3, d = 2 + rand() * 3, h = 2 + rand() * 3.5;
    const house = new THREE.Mesh(houseGeo, walls[i % walls.length]);
    house.scale.set(w, h, d); house.position.set(x, base + h / 2, z);
    house.castShadow = house.receiveShadow = true; scene.add(house);
    const roof = new THREE.Mesh(roofGeo, MAT.kiremit);
    roof.scale.set(w * 1.05, 1.4, d * 1.05); roof.position.set(x, base + h + .4, z); scene.add(roof);
  }
}
town(1, 230); town(-1, 230);

// Cami: kubbe + minareler
function mosque({ x, z, base, r, minarets }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, r * 1.3, r * 2.4), MAT.krem);
  body.position.y = r * .65; g.add(body);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(r * .95, r * 1.05, r * .5, 16), MAT.krem);
  drum.position.y = r * 1.5; g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.kursun);
  dome.position.y = r * 1.75; g.add(dome);
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const half = new THREE.Mesh(new THREE.SphereGeometry(r * .45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MAT.kursun);
    half.position.set(dx * r * .9, r * 1.3, dz * r * .9); g.add(half);
  }
  minarets.forEach(([dx, dz, h]) => {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.32, .4, h, 8), MAT.krem);
    shaft.position.set(dx, h / 2, dz); g.add(shaft);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.42, 2.4, 8), MAT.kursun);
    cap.position.set(dx, h + 1.2, dz); g.add(cap);
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .25, 8), MAT.krem);
    balcony.position.set(dx, h * .72, dz); g.add(balcony);
  });
  g.traverse(o => { o.castShadow = true; });
  g.position.set(x, base, z);
  scene.add(g);
}
// Süleymaniye (Fatih tepesi), Yeni Cami (Eminönü)
mosque({ x: -46, z: SHORE + 40, base: 12, r: 5.2, minarets: [[-8, -8, 17], [8, -8, 17], [-8, 8, 21], [8, 8, 21]] });
mosque({ x: 14, z: SHORE + 12, base: 2.8, r: 3.2, minarets: [[-5, -5, 12], [5, -5, 12]] });
mosque({ x: -95, z: SHORE + 30, base: 9, r: 4, minarets: [[-6, -6, 14], [6, -6, 14]] });

// Galata Kulesi
{
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 16, 14), MAT.tas);
  shaft.position.y = 8; g.add(shaft);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.7, 1.4, 14), MAT.tasKoyu);
  gallery.position.y = 16.6; g.add(gallery);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.1, 6.5, 14), MAT.kursun);
  cone.position.y = 20.5; g.add(cone);
  g.traverse(o => { o.castShadow = true; });
  g.position.set(8, 11, -(SHORE + 30));
  scene.add(g);
}

// Köprüler: oyunun 3D baskı parçaları (Blender, models/halic_parcalar.glb, mm; taban 14×14 mm)
const SEG = (2 * SHORE + 2) / 8; // parça uzunluğu
const KINDS = ["Kıyı Ayağı", "Su Ayağı", "Kiriş", "Kiriş", "Orta Açıklık", "Kiriş", "Su Ayağı", "Karşı Kıyı"];
const MODEL_OF = { "Kıyı Ayağı": "kiyi_ayagi", "Su Ayağı": "su_ayagi", "Kiriş": "kiris", "Orta Açıklık": "orta_aciklik", "Karşı Kıyı": "karsi_kiyi" };
const MM = SEG / 14;   // sahne birimi / mm: 14 mm'lik parça bir köprü bölmesini doldurur
const BASE_Y = -.3;    // taban plakası su çizgisinde
// Baskı plastiği: kamera güneşe karşı baktığından takım renkleri biraz açık tutulur
const PLA = { a: M("#d4513c", { roughness: .55 }), b: M("#4d78cf", { roughness: .55 }) };
function modelPiece(i, teamMat, geos, startSide) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geos[MODEL_OF[KINDS[i]]], teamMat);
  m.scale.setScalar(MM);
  m.rotation.y = startSide * Math.PI / 2; // modelde köprü +x yönünde uzanır, sahnede karşı kıyıya (z) döner
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}
// Yedek: model dosyası yüklenemezse basit parçalar
function makePiece(i, teamMat) {
  const g = new THREE.Group();
  const kind = KINDS[i];
  const deckY = kind === "Orta Açıklık" ? 4.3 : 3.2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, .55, SEG - .12), MAT.ahsap);
  deck.position.y = deckY; g.add(deck);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.22, .7, SEG - .12), teamMat);
    rail.position.set(s * 2.6, deckY + .62, 0); g.add(rail);
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 2.2, 6), MAT.demir);
  lamp.position.set(2.6, deckY + 1.6, 0); g.add(lamp);
  if (kind === "Kıyı Ayağı" || kind === "Karşı Kıyı") {
    const ab = new THREE.Mesh(new THREE.BoxGeometry(6.4, deckY + 1, SEG * .9), MAT.tas);
    ab.position.y = (deckY - 1) / 2 - .2; g.add(ab);
  } else if (kind === "Su Ayağı") {
    // duba: 1912 Galata Köprüsü yüzen dubalar üzerindeydi
    const pontoon = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.6, SEG * .7), MAT.siyah);
    pontoon.position.y = .3; g.add(pontoon);
    for (const s of [-1.6, 1.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.5, deckY - .6, .5), MAT.demir);
      post.position.set(s, (deckY + .6) / 2 + .2, 0); g.add(post);
    }
  } else if (kind === "Orta Açıklık") {
    for (const s of [-2.4, 2.4]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(SEG / 2, .18, 6, 18, Math.PI), MAT.demir);
      arch.rotation.y = Math.PI / 2; arch.position.set(s, deckY + .2, 0); g.add(arch);
    }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .9), new THREE.MeshStandardMaterial({ color: teamMat.color, side: THREE.DoubleSide }));
    flag.position.set(0, deckY + SEG / 2 + 1.2, 0); g.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 6), MAT.demir);
    pole.position.set(-.7, deckY + SEG / 2 + .9, 0); g.add(pole);
  } else {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(5.6, .5, SEG - .12), MAT.demir);
    truss.position.y = deckY - .5; g.add(truss);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function bridge(x, startSide, teamMat, geos) {
  // startSide = +1: güney kıyıdan başlar, -1: kuzey kıyıdan başlar
  const pieces = [];
  for (let i = 0; i < 8; i++) {
    const p = geos ? modelPiece(i, teamMat, geos, startSide) : makePiece(i, teamMat);
    const z = startSide * (SHORE + 1 - SEG * (i + .5));
    const baseY = geos ? BASE_Y : 0;
    p.position.set(x, baseY, z);
    p.userData = { baseY, t: 0 };
    p.visible = false;
    scene.add(p);
    pieces.push(p);
  }
  return pieces;
}
// Hamal piyonları kendi şantiyelerinin rıhtımında bekler (Unkapanı ve Karaköy)
function pawns(geo, mat, x, z) {
  for (const [dx, turn] of [[-4.6, .35], [4.6, -.35]]) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.setScalar(MM);
    m.position.set(x + dx, 2, z);
    m.rotation.y = -Math.PI / 2 + turn; // yüzü Boğaz'a, kameraya dönük
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
}
// Unkapanı: güney (+z) kıyıdan kuzeye; Galata: kuzey (-z) kıyıdan güneye
let bridgeA = [], bridgeB = [];
new GLTFLoader().load("models/halic_parcalar.glb", gltf => {
  const geos = {};
  gltf.scene.traverse(o => { if (o.isMesh) geos[o.name] = o.geometry; });
  bridgeA = bridge(-30, 1, PLA.a, geos);
  bridgeB = bridge(6, -1, PLA.b, geos);
  pawns(geos.piyon, PLA.a, -30, SHORE + 3);
  pawns(geos.piyon, PLA.b, 6, -(SHORE + 3));
}, undefined, () => {
  bridgeA = bridge(-30, 1, MAT.kirmizi);
  bridgeB = bridge(6, -1, MAT.kobalt);
});

// Kurulum sırası: ekipler sırayla, başlayan ekip her ziyarette değişir
const firstA = Math.random() < .5;
const order = [];
for (let i = 0; i < 8; i++) {
  if (firstA) order.push(["a", i], ["b", i]); else order.push(["b", i], ["a", i]);
}
order.pop(); // son parçadan önce biri kazanır
const winner = order[order.length - 1][0];

// Kart karakterleri: her kartın Blender'da yapılmış bir figürü (models/halic_karakterler.glb).
// Figürler modelde -z'ye bakar; kollar, bacaklar ve üst gövde ayrı düğümdür (kol_sol, kol_sag, bacak_*, ust).
const CHAR = .24; // sahne birimi / oyuncak-mm (boy ≈ 4,3)
const CARD = {
  kr_isci: ["İşçi", "Personel"], kr_usta: ["Usta", "Personel"], kr_muhendis: ["Mühendis", "Personel"], kr_dalgic: ["Dalgıç", "Personel"],
  kr_beton: ["Beton", "Malzeme"], kr_celik: ["Çelik", "Malzeme"], kr_tas: ["Taş", "Malzeme"],
  kr_lodos: ["Lodos", "Olay"], kr_grev: ["Grev", "Olay"], kr_gecikme: ["Gecikme", "Olay"], kr_sponsor: ["Sponsor", "Olay"],
  kr_mesai: ["Mesai", "Olay"], kr_sigorta: ["Sigorta", "Olay"], kr_belediye: ["Belediye İzni", "İzin"],
};
const SASH = { a: "#c23b2a", b: "#2c54a8" };
const actors = [];
const pickables = [];
const nodes = (o, prefix) => { const out = []; o.traverse(c => { if (c.name.startsWith(prefix)) out.push(c); }); return out; };
const node = (o, prefix) => nodes(o, prefix)[0];
const faceTo = (o, dx, dz) => { o.rotation.y = Math.atan2(-dx, -dz); };

function signTexture(text) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
  const draw = () => {
    const g = c.getContext("2d");
    g.fillStyle = "#f4ead2"; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "#c23b2a"; g.lineWidth = 8; g.strokeRect(8, 8, 240, 112);
    g.fillStyle = "#2b2520"; g.font = "72px Bevan, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 128, 70);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load("72px Bevan").then(draw).catch(() => {});
  return tex;
}

function spawn(src, { x, z, y = 2, face = [1, 0], team = "a" }) {
  const o = src.clone(true);
  o.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if (m.material.name === "k_kusak") { m.material = m.material.clone(); m.material.color.set(SASH[team]); }
    pickables.push(m);
  });
  o.userData.card = CARD[src.name];
  o.scale.setScalar(CHAR);
  o.position.set(x, y, z);
  faceTo(o, ...face);
  scene.add(o);
  // animasyon için başlangıç açıları
  o.traverse(c => { c.userData.rx = c.rotation.x; c.userData.ry = c.rotation.y; c.userData.rz = c.rotation.z; });
  return o;
}

// yürüyüş: bacaklar ve (yük taşımıyorsa) kollar karşılıklı sallanır; x ekseninde gidip gelir
function walker(o, x0, x1, speed, { arms = false, phase = 0 } = {}) {
  const legs = nodes(o, "bacak"), armsN = arms ? nodes(o, "kol") : [];
  return t => {
    const span = Math.abs(x1 - x0), d = ((t * speed + phase) % (2 * span) + 2 * span) % (2 * span);
    const fwd = d < span, s = fwd ? d : 2 * span - d;
    o.position.x = x0 + Math.sign(x1 - x0) * s;
    faceTo(o, fwd === (x1 > x0) ? 1 : -1, 0);
    const w = Math.sin(t * speed * 9 + phase);
    legs.forEach(l => { l.rotation.x = l.userData.rx + (l.name.includes("sol") ? w : -w) * .45; });
    armsN.forEach(a => { a.rotation.x = a.userData.rx + (a.name.includes("sol") ? -w : w) * .35; });
    o.position.y = o.userData.baseY + Math.abs(w) * .08;
  };
}

function cast(chars) {
  const g = name => chars[name];
  const add = (name, opts, behave) => {
    const o = spawn(g(name), opts);
    o.userData.baseY = o.position.y;
    // yakın çekim yönü: rıhtımdakilere sudan, sudakilere doğudan bakılır
    const v = opts.view || (Math.abs(opts.z) < SHORE ? [1, .25] : [.35, -Math.sign(opts.z)]);
    o.userData.view = new THREE.Vector3(v[0], 0, v[1]).normalize();
    if (behave) actors.push(behave(o));
    return o;
  };
  // Fatih rıhtımı (güney, +z): hamallar taşı köprüye taşır, usta yontar, mühendis plan yapar
  add("kr_isci", { x: -55, z: 22.2, team: "a" }, o => walker(o, -58, -35, 2.2));
  add("kr_isci", { x: -45, z: 23.8, team: "a" }, o => walker(o, -60, -36, 1.9, { phase: 13 }));
  add("kr_usta", { x: -25.6, z: 21, face: [-.5, -1], team: "a" }, o => {
    const arm = node(o, "kol_sag");
    return t => { arm.rotation.x = arm.userData.rx + Math.sin(t * 4.2) * .5; };
  });
  add("kr_muhendis", { x: -43, z: 22.6, face: [.45, -1], team: "a" }, o => {
    const arm = node(o, "kol_sag"), ust = node(o, "ust");
    return t => { arm.rotation.x = arm.userData.rx + Math.sin(t * 1.3) * .1; ust.rotation.y = ust.userData.ry + Math.sin(t * .6) * .18; };
  });
  add("kr_tas", { x: -50, z: 21.6, face: [.3, -1], team: "a" }, o => {
    const arms = nodes(o, "kol");
    return t => { const k = Math.sin(t * 3.4); arms.forEach(a => { a.rotation.x = a.userData.rx + k * .55 - .2; }); };
  });
  add("kr_sponsor", { x: -14, z: 22.6, face: [.4, -1], team: "a" }, o => t => { o.rotation.y = o.userData.ry + Math.sin(t * .5) * .3; });
  add("kr_gecikme", { x: 23, z: 21.6, face: [.3, -1], team: "a" }, o => {
    const foot = node(o, "bacak_sag");
    return t => { foot.rotation.x = foot.userData.rx + Math.max(0, Math.sin(t * 7)) * .3; };
  });
  // suda: dalgıç Unkapanı'nın su ayağında iner çıkar, kayıkçı lodosta sallanır
  add("kr_dalgic", { x: -26.3, z: 11.6, y: -2.2, face: [1, 0], team: "a" }, o => t => {
    o.position.y = o.userData.baseY + Math.sin(t * .7) * 1.1;
    o.rotation.z = Math.sin(t * 1.1) * .05;
  });
  add("kr_lodos", { x: -6, z: 5, y: -.2, face: [.2, 1], team: "a" }, o => t => {
    o.position.x = -6 + Math.sin(t * .05) * 16;
    o.position.y = o.userData.baseY + Math.sin(t * 1.6) * .3;
    o.rotation.z = Math.sin(t * 1.7) * .2;
    o.rotation.x = Math.sin(t * 1.25) * .08;
  });
  // Beyoğlu rıhtımı (kuzey, -z): çelik kiriş ve harç köprüye taşınır, grevci oturur, memur mühürler
  add("kr_celik", { x: 30, z: -22.3, team: "b" }, o => walker(o, 34, 11, 1.6));
  add("kr_beton", { x: -20, z: -23.6, team: "b" }, o => walker(o, -24, 1, 1.8, { phase: 7 }));
  add("kr_grev", { x: -9.5, z: -22.6, face: [.4, 1], team: "b" }, o => {
    const ust = node(o, "ust");
    return t => { ust.rotation.y = ust.userData.ry + Math.sin(t * .9) * .25; };
  });
  add("kr_belediye", { x: -1.5, z: -23.6, face: [.45, 1], team: "b" }, o => {
    const arm = node(o, "kol_sag");
    return t => { arm.rotation.x = arm.userData.rx + Math.max(0, Math.sin(t * 2.4)) * .35; };
  });
  add("kr_sigorta", { x: 16, z: -24, team: "b" }, o => walker(o, 15, 36, 1.1, { phase: 4 }));
  const mesai = add("kr_mesai", { x: 11.6, z: -21.3, face: [-.5, 1], team: "b" }, o => {
    const arm = node(o, "kol_sag");
    return t => { arm.rotation.z = arm.userData.rz + Math.sin(t * 1.8) * .06; };
  });
  // Mesai'nin feneri gerçekten ışık verir
  const glass = node(mesai, "fener_cam");
  const lamp = new THREE.PointLight("#ffcf7a", 9, 16, 2);
  scene.add(lamp);
  actors.push(() => glass.getWorldPosition(lamp.position));
  // Grev tabelası
  const face = node(scene.children.find(c => c.userData.card?.[0] === "Grev"), "tabela_yuz");
  if (face) face.material = new THREE.MeshStandardMaterial({ map: signTexture("GREV"), roughness: .9 });
}

new GLTFLoader().load("models/halic_karakterler.glb?v=2", gltf => {
  const chars = {};
  gltf.scene.children.forEach(c => { if (CARD[c.name]) chars[c.name] = c; });
  gltf.scene.traverse(o => { if (o.isMesh) { o.material.flatShading = true; o.material.needsUpdate = true; } });
  cast(chars);
  // ?karakter=muhendis: sayfa o karakterin yakın çekimiyle açılır (sunum için)
  const want = new URLSearchParams(location.search).get("karakter") || pendingKey;
  if (want) focusKey(want);
}, undefined, () => {});

// Karakterin üstüne gelince hangi kart olduğunu söyle
const tip = document.createElement("div");
tip.className = "char-tip";
tip.hidden = true;
canvas.parentElement.appendChild(tip);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let o = ray.intersectObjects(pickables, false)[0]?.object;
  while (o && !o.userData.card) o = o.parent;
  return o || null;
}
canvas.addEventListener("pointermove", e => {
  const o = pick(e);
  canvas.style.cursor = o ? "zoom-in" : "";
  if (!o) { tip.hidden = true; return; }
  const r = canvas.getBoundingClientRect();
  tip.innerHTML = `<b>${o.userData.card[0]}</b><span>${o.userData.card[1]} kartı</span>`;
  tip.style.left = `${e.clientX - r.left + 14}px`;
  tip.style.top = `${e.clientY - r.top + 10}px`;
  tip.hidden = false;
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });

// Karaktere tıklayınca kamera ona yaklaşır; boşluğa tıklayınca ya da Esc ile geri döner
let focus = null, lastFocus = null, focusMix = 0, pendingKey = null;
const castBar = document.querySelector(".cast");
const keyOf = o => Object.keys(CARD).find(k => CARD[k] === o?.userData.card)?.slice(3) || "";
function syncCast() {
  const k = focus ? keyOf(focus) : "";
  castBar?.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
}
function focusKey(k) {
  if (!k) { focus = null; syncCast(); return; }
  const hit = scene.children.find(c => c.userData.card && CARD["kr_" + k] === c.userData.card);
  if (!hit) { pendingKey = k; return; } // karakterler henüz yüklenmedi
  focus = lastFocus = hit;
  syncCast();
}
canvas.addEventListener("click", e => { focus = pick(e); if (focus) lastFocus = focus; syncCast(); });
addEventListener("keydown", e => { if (e.key === "Escape") { focus = null; syncCast(); } });
// Alttaki mini karakter şeridi: basınca kamera o karaktere gider
castBar?.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  focusKey(b.dataset.k);
  canvas.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
});
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), fPos = new THREE.Vector3(), fDir = new THREE.Vector3();

// Vapur
const ferry = new THREE.Group();
{
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 11), MAT.siyah); hull.position.y = .5; ferry.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3, 4), MAT.siyah);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, .5); bow.position.set(0, .5, 6.8); ferry.add(bow);
  const deckhouse = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 7), MAT.krem); deckhouse.position.y = 2; ferry.add(deckhouse);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(.55, .6, 2.6, 10), M("#2f6f86")); funnel.position.y = 4; ferry.add(funnel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .4, 10), MAT.siyah); band.position.y = 5.1; ferry.add(band);
  ferry.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
scene.add(ferry);
const smoke = [];
const smokeMat = new THREE.MeshStandardMaterial({ color: "#6b6258", transparent: true, opacity: .5, roughness: 1, flatShading: true, depthWrite: false });
for (let i = 0; i < 14; i++) {
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), smokeMat.clone());
  s.userData.phase = i / 14; scene.add(s); smoke.push(s);
}

// Kayıklar
const boats = [];
for (let i = 0; i < 9; i++) {
  const b = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1, .5, 3.6), MAT.ahsap); b.add(hull);
  const man = new THREE.Mesh(new THREE.CylinderGeometry(.18, .25, .9, 6), MAT.siyah); man.position.set(0, .7, .4); b.add(man);
  const fez = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, .22, 6), MAT.kirmizi); fez.position.set(0, 1.25, .4); b.add(fez);
  b.position.set(-120 + rand() * 170, 0, (rand() * 2 - 1) * (SHORE - 4));
  b.rotation.y = rand() * Math.PI;
  b.userData = { phase: rand() * 6, drift: (rand() - .5) * .05 };
  b.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(b); boats.push(b);
}

// Martılar
const gulls = [];
const gullGeo = new THREE.BufferGeometry();
gullGeo.setAttribute("position", new THREE.Float32BufferAttribute([-1, .3, 0, 0, 0, 0, 0, 0, 0, 1, .3, 0], 3));
for (let i = 0; i < 12; i++) {
  const l = new THREE.LineSegments(gullGeo, new THREE.LineBasicMaterial({ color: "#3b3229" }));
  l.userData = { r: 14 + rand() * 30, h: 14 + rand() * 10, s: .1 + rand() * .15, p: rand() * 6, cx: -20 + rand() * 40 };
  scene.add(l); gulls.push(l);
}

// Kaydırma ve imleç
let progress = 0, target = 0;
const mouse = { x: 0, y: 0 };
addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
// Levha ekranın altından girip üst yarıya çıkana kadar köprüler tamamlanır
function readScroll() {
  const r = canvas.getBoundingClientRect();
  const t = (innerHeight - r.top) / (innerHeight * .55 + r.height);
  target = Math.max(0, Math.min(1, t));
}
addEventListener("scroll", readScroll, { passive: true });

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = 40;
  camera.updateProjectionMatrix();
  readScroll();
}
addEventListener("resize", resize);
resize();

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

const clock = new THREE.Clock();
let lastCount = { a: -1, b: -1 };
const ease = t => 1 - Math.pow(1 - t, 3);

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = clock.getElapsedTime();
  progress += (target - progress) * (reduce ? 1 : .08);

  // Dalgalar
  const pos = waterGeo.attributes.position.array;
  if (!reduce || t < .1) {
    for (let i = 0; i < pos.length; i += 3) {
      const x = waterBase[i], z = waterBase[i + 2];
      pos[i + 1] = Math.sin(x * .12 + t * .9) * .22 + Math.cos(z * .2 + t * .7 + x * .03) * .18;
    }
    waterGeo.attributes.position.needsUpdate = true;
    waterGeo.computeVertexNormals();
  }

  // Köprü parçaları: ilk ikisi hazır, gerisi kaydırmayla
  const counts = { a: 0, b: 0 };
  if (bridgeA.length) order.forEach(([team, i], k) => {
    const start = k < 2 ? -1 : .04 + (k - 2) / (order.length - 2) * .82;
    const local = Math.max(0, Math.min(1, (progress - start) / .05));
    const piece = (team === "a" ? bridgeA : bridgeB)[i];
    piece.visible = local > 0;
    piece.position.y = piece.userData.baseY + (1 - ease(local)) * 9;
    piece.rotation.z = (1 - ease(local)) * (team === "a" ? .25 : -.25);
    if (local >= 1) counts[team]++;
  });
  if (bridgeA.length && (counts.a !== lastCount.a || counts.b !== lastCount.b)) {
    lastCount = counts;
    dispatchEvent(new CustomEvent("bridge-progress", { detail: { ...counts, winner } }));
  }

  // Vapur: Karaköy ile Eminönü arasında gidip gelir
  const fz = Math.sin(t * .09) * (SHORE - 6);
  ferry.position.set(30, Math.sin(t * 1.3) * .12, fz);
  ferry.rotation.y = Math.cos(t * .09) > 0 ? 0 : Math.PI;
  ferry.rotation.z = Math.sin(t * 1.1) * .02;
  smoke.forEach(s => {
    const k = (s.userData.phase + t * .12) % 1;
    s.position.set(30 + k * 6, 5.4 + k * 7, fz + Math.sin(k * 6 + t) * .4);
    s.scale.setScalar(.6 + k * 2.4);
    s.material.opacity = .55 * (1 - k);
  });

  boats.forEach(b => {
    b.position.y = Math.sin(t * 1.4 + b.userData.phase) * .15;
    b.rotation.z = Math.sin(t * 1.1 + b.userData.phase) * .06;
    b.position.x += b.userData.drift;
    if (b.position.x > 60) b.position.x = -120; if (b.position.x < -120) b.position.x = 60;
  });

  if (!reduce) actors.forEach(a => a(t));

  gulls.forEach(g => {
    const u = g.userData, a = t * u.s + u.p;
    g.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 2 + u.p) * .6, Math.sin(a) * u.r * .6);
    g.rotation.y = -a;
    g.scale.set(1, 1 + Math.sin(t * 8 + u.p) * .5, 1);
  });

  // Kamera: Boğaz'dan Haliç'e doğru yaklaşır
  const p = ease(progress);
  camPos.set(
    86 - p * 26 + mouse.x * 3,
    40 - p * 12 - mouse.y * 2,
    20 - p * 22 + mouse.x * 2
  );
  camLook.set(-14 - p * 4, 0 + p * 1.5, -2 + p * 4);
  // seçilen karaktere yakın çekim
  focusMix += ((focus ? 1 : 0) - focusMix) * (reduce ? 1 : .06);
  if (lastFocus && focusMix > .001) {
    lastFocus.getWorldPosition(fPos);
    fDir.copy(lastFocus.userData.view);
    const k = ease(Math.min(1, focusMix));
    camPos.lerp(fDir.multiplyScalar(9.5).add(fPos).setY(fPos.y + 7), k);
    camLook.lerp(fPos.setY(fPos.y + 2), k);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  renderer.render(scene, camera);
}
frame();
