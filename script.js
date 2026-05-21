/* TurboBox Garage - mini jeu HTML/CSS/JS sans dépendance */

const STORAGE_KEY = "turboBoxGarageSave_v1";

const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
const rarityConfig = {
  common: { label: "Commun", color: "#9ca7bc", glow: "rgba(156,167,188,.25)", value: 1, stat: 1 },
  uncommon: { label: "Peu commun", color: "#52ffa8", glow: "rgba(82,255,168,.28)", value: 1.8, stat: 1.35 },
  rare: { label: "Rare", color: "#58d5ff", glow: "rgba(88,213,255,.32)", value: 3, stat: 1.85 },
  epic: { label: "Épique", color: "#b66cff", glow: "rgba(182,108,255,.36)", value: 5.2, stat: 2.55 },
  legendary: { label: "Légendaire", color: "#ffd166", glow: "rgba(255,209,102,.42)", value: 9, stat: 3.5 }
};

const boxes = [
  {
    id: "starter",
    name: "Box Starter",
    icon: "📦",
    cost: 350,
    desc: "Pour commencer ton garage. Beaucoup de pièces, petite chance de voiture.",
    carChance: 0.12,
    glow: "rgba(88,213,255,.22)",
    weights: { common: 62, uncommon: 28, rare: 9, epic: 1, legendary: 0 }
  },
  {
    id: "street",
    name: "Box Street",
    icon: "🎁",
    cost: 900,
    desc: "Meilleurs drops, voitures plus fréquentes, parfaite pour progresser.",
    carChance: 0.22,
    glow: "rgba(135,88,255,.25)",
    weights: { common: 35, uncommon: 37, rare: 20, epic: 7, legendary: 1 }
  },
  {
    id: "pro",
    name: "Box Pro Tuning",
    icon: "🔮",
    cost: 2500,
    desc: "La box chère : gros potentiel, pièces puissantes et voitures rares.",
    carChance: 0.34,
    glow: "rgba(255,209,102,.28)",
    weights: { common: 12, uncommon: 28, rare: 32, epic: 21, legendary: 7 }
  }
];

const partTypes = {
  engine: {
    label: "Moteur",
    emoji: "⚙️",
    stat: "power",
    statLabel: "Puissance",
    names: ["Bloc Série", "V6 Sport", "V8 Track", "Moteur Plasma", "Hyperdrive X"]
  },
  turbo: {
    label: "Turbo",
    emoji: "💨",
    stat: "power",
    statLabel: "Puissance",
    names: ["Mini Turbo", "Turbo Street", "Bi-Turbo", "Turbo Quantum", "Twin Nova"]
  },
  tires: {
    label: "Pneus",
    emoji: "🛞",
    stat: "grip",
    statLabel: "Adhérence",
    names: ["Pneus Route", "Semi-Slicks", "Slicks Course", "Pneus Fusion", "Grip Titan"]
  },
  brakes: {
    label: "Freins",
    emoji: "🛑",
    stat: "handling",
    statLabel: "Contrôle",
    names: ["Disques Simples", "Freins Sport", "Carbone Track", "Magnéto-Freins", "AeroStop Z"]
  },
  body: {
    label: "Carrosserie",
    emoji: "🧩",
    stat: "aero",
    statLabel: "Aéro",
    names: ["Kit Basic", "Kit Street", "Kit GT", "Kit Widebody", "Kit Légende"]
  }
};

const carBlueprints = [
  { name: "Comet R", emoji: "🏎️", base: { power: 52, grip: 46, handling: 48, aero: 42 }, value: 900 },
  { name: "Neon Hatch", emoji: "🚗", base: { power: 38, grip: 52, handling: 54, aero: 40 }, value: 650 },
  { name: "Volt Runner", emoji: "🚙", base: { power: 46, grip: 48, handling: 45, aero: 47 }, value: 760 },
  { name: "Shadow GT", emoji: "🏁", base: { power: 60, grip: 54, handling: 50, aero: 58 }, value: 1250 },
  { name: "Falcon X", emoji: "🚘", base: { power: 72, grip: 58, handling: 57, aero: 64 }, value: 1900 },
  { name: "Aurora V12", emoji: "✨", base: { power: 88, grip: 70, handling: 66, aero: 78 }, value: 3400 }
];

let state = {
  money: 1600,
  cars: [],
  parts: [],
  selectedCarId: null,
  stats: { boxesOpened: 0, miniGamesPlayed: 0, earned: 0 }
};

let currentFilter = "all";
let combineSelection = [];
let pendingReward = null;
let reaction = { waiting: false, green: false, timeout: null, start: 0 };
let workshop = { active: false, clicks: 0, timer: null };
let timing = { active: false, dir: 1, pos: 0, frame: null };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function moneyText(value) {
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickWeighted(weights) {
  const total = Object.values(weights).reduce((sum, n) => sum + n, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function playTone(freq = 440, duration = 0.08, gain = 0.03) {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.frequency.value = freq;
    oscillator.type = "triangle";
    volume.gain.value = gain;
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch (_) {
    // Son indisponible : le jeu continue sans audio.
  }
}

function createPart(forcedRarity = null, forcedType = null) {
  const rarity = forcedRarity || pickWeighted({ common: 45, uncommon: 28, rare: 17, epic: 8, legendary: 2 });
  const type = forcedType || randomFrom(Object.keys(partTypes));
  const config = rarityConfig[rarity];
  const info = partTypes[type];
  const rarityIndex = rarityOrder.indexOf(rarity);
  const statValue = Math.round((10 + Math.random() * 14 + rarityIndex * 11) * config.stat);
  const value = Math.round((95 + statValue * 9) * config.value);

  return {
    id: uid("part"),
    kind: "part",
    type,
    rarity,
    name: `${info.names[rarityIndex]} ${suffixByRarity(rarity)}`,
    stat: info.stat,
    statValue,
    value
  };
}

function createCar(forcedRarity = null) {
  const rarity = forcedRarity || pickWeighted({ common: 42, uncommon: 30, rare: 18, epic: 8, legendary: 2 });
  const rarityIndex = rarityOrder.indexOf(rarity);
  const blueprint = carBlueprints[clamp(Math.floor(Math.random() * (rarityIndex + 2)), 0, carBlueprints.length - 1)];
  const config = rarityConfig[rarity];
  const boost = 1 + rarityIndex * 0.13 + Math.random() * 0.08;
  const base = Object.fromEntries(Object.entries(blueprint.base).map(([stat, value]) => [stat, Math.round(value * boost)]));

  return {
    id: uid("car"),
    kind: "car",
    name: `${blueprint.name} ${suffixByRarity(rarity)}`,
    emoji: blueprint.emoji,
    rarity,
    base,
    slots: { engine: null, turbo: null, tires: null, brakes: null, body: null },
    value: Math.round(blueprint.value * config.value * (0.82 + Math.random() * 0.35))
  };
}

function suffixByRarity(rarity) {
  return {
    common: "MK1",
    uncommon: "Sport",
    rare: "RS",
    epic: "ProSpec",
    legendary: "Legend"
  }[rarity];
}

function rewardFromBox(box) {
  const rarity = pickWeighted(box.weights);
  return Math.random() < box.carChance ? createCar(rarity) : createPart(rarity);
}

function carStats(car) {
  const stats = { ...car.base };
  Object.values(car.slots).forEach((part) => {
    if (!part) return;
    stats[part.stat] = (stats[part.stat] || 0) + part.statValue;
  });
  const score = Math.round(stats.power * 1.1 + stats.grip * 0.9 + stats.handling * 0.9 + stats.aero * 0.65);
  return { ...stats, score };
}

function carSellValue(car) {
  const partsValue = Object.values(car.slots).reduce((sum, part) => sum + (part ? Math.round(part.value * 0.5) : 0), 0);
  return Math.round(car.value * 0.72 + partsValue);
}

function addReward(reward) {
  if (reward.kind === "car") {
    state.cars.push(reward);
    if (!state.selectedCarId) state.selectedCarId = reward.id;
  } else {
    state.parts.push(reward);
  }
  state.stats.boxesOpened += 1;
  saveGame();
  renderAll();
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state.cars.push(createCar("common"));
    state.parts.push(createPart("common", "engine"), createPart("common", "tires"));
    state.selectedCarId = state.cars[0].id;
    saveGame();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
    if (!state.stats) state.stats = { boxesOpened: 0, miniGamesPlayed: 0, earned: 0 };
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
    loadGame();
  }
}

function renderAll() {
  renderMoney();
  renderBoxes();
  renderGarage();
  renderSelectedCar();
  renderInventory();
}

function renderMoney() {
  $("#moneyLabel").textContent = moneyText(state.money);
}

function renderBoxes() {
  const grid = $("#boxGrid");
  grid.innerHTML = boxes.map((box) => `
    <article class="box-card" style="--boxGlow:${box.glow}">
      <div class="box-icon">${box.icon}</div>
      <h3>${box.name}</h3>
      <p>${box.desc}</p>
      <div class="drop-list">
        <span class="badge">🚗 ${Math.round(box.carChance * 100)}% voiture</span>
        <span class="badge">🧰 ${Math.round((1 - box.carChance) * 100)}% pièce</span>
        <span class="badge">✨ jusqu'à ${bestRarityLabel(box.weights)}</span>
      </div>
      <p class="price">${moneyText(box.cost)}</p>
      <button class="primary-btn" data-open-box="${box.id}">Ouvrir</button>
    </article>
  `).join("");
}

function bestRarityLabel(weights) {
  const best = [...rarityOrder].reverse().find((rarity) => weights[rarity] > 0);
  return rarityConfig[best].label;
}

function renderGarage() {
  const grid = $("#garageGrid");
  if (!state.cars.length) {
    grid.innerHTML = `<div class="empty-state item-card">Aucune voiture. Ouvre une box ou gagne de l'argent aux mini-jeux.</div>`;
    return;
  }

  grid.innerHTML = state.cars.map((car) => {
    const rarity = rarityConfig[car.rarity];
    const stats = carStats(car);
    const isSelected = car.id === state.selectedCarId;
    return `
      <article class="item-card" style="--rarityColor:${rarity.color}">
        <div class="item-top">
          <div>
            <span class="badge" style="color:${rarity.color}">${rarity.label}</span>
            <h3>${car.name}</h3>
          </div>
          <div class="item-emoji">${car.emoji}</div>
        </div>
        <div class="stats">
          <span class="stat-pill">⚡ <strong>${stats.power}</strong></span>
          <span class="stat-pill">🛞 <strong>${stats.grip}</strong></span>
          <span class="stat-pill">🎯 <strong>${stats.handling}</strong></span>
          <span class="stat-pill">🌬️ <strong>${stats.aero}</strong></span>
          <span class="stat-pill">🏆 <strong>${stats.score}</strong></span>
        </div>
        <p>Valeur vente : ${moneyText(carSellValue(car))}</p>
        <div class="item-actions">
          <button class="small-btn" data-select-car="${car.id}">${isSelected ? "Sélectionnée" : "Choisir"}</button>
          <button class="danger-btn" data-sell-car="${car.id}">Vendre</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderSelectedCar() {
  const container = $("#selectedCar");
  const car = state.cars.find((item) => item.id === state.selectedCarId);

  if (!car) {
    container.className = "selected-car empty-state";
    container.innerHTML = "Sélectionne une voiture pour voir les pièces installées.";
    return;
  }

  const rarity = rarityConfig[car.rarity];
  const stats = carStats(car);
  container.className = "selected-car";
  container.innerHTML = `
    <div class="selected-layout">
      <div class="car-preview-card" style="--rarityColor:${rarity.color}">
        <span class="badge" style="color:${rarity.color}">${rarity.label}</span>
        <h3>${car.emoji} ${car.name}</h3>
        <div class="tuned-car"></div>
        <div class="preview-wheel left"></div>
        <div class="preview-wheel right"></div>
      </div>
      <div>
        <h3>Performance totale : ${stats.score}</h3>
        <div class="stats">
          <span class="stat-pill">⚡ Puissance <strong>${stats.power}</strong></span>
          <span class="stat-pill">🛞 Grip <strong>${stats.grip}</strong></span>
          <span class="stat-pill">🎯 Contrôle <strong>${stats.handling}</strong></span>
          <span class="stat-pill">🌬️ Aéro <strong>${stats.aero}</strong></span>
        </div>
        <div class="slot-grid">
          ${Object.keys(partTypes).map((type) => renderSlot(car, type)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderSlot(car, type) {
  const part = car.slots[type];
  const info = partTypes[type];
  if (!part) {
    return `
      <div class="slot-card">
        <h4>${info.emoji} ${info.label}</h4>
        <p>Vide. Installe une pièce depuis l'inventaire.</p>
      </div>
    `;
  }

  const rarity = rarityConfig[part.rarity];
  return `
    <div class="slot-card" style="border-color:${rarity.color}">
      <h4>${info.emoji} ${info.label}</h4>
      <p><strong>${part.name}</strong><br>${rarity.label} • +${part.statValue} ${info.statLabel}</p>
      <button class="small-btn" data-remove-part="${type}">Enlever</button>
    </div>
  `;
}

function renderInventory() {
  const grid = $("#inventoryGrid");
  const parts = currentFilter === "all" ? state.parts : state.parts.filter((part) => part.type === currentFilter);

  if (!parts.length) {
    grid.innerHTML = `<div class="empty-state item-card">Aucune pièce ici. Ouvre des box ou change de filtre.</div>`;
    renderCombineStatus();
    return;
  }

  grid.innerHTML = parts.map((part) => {
    const rarity = rarityConfig[part.rarity];
    const info = partTypes[part.type];
    const selected = combineSelection.includes(part.id);
    return `
      <article class="item-card ${selected ? "selected-for-combine" : ""}" style="--rarityColor:${rarity.color}">
        <div class="item-top">
          <div>
            <span class="badge" style="color:${rarity.color}">${rarity.label}</span>
            <h3>${part.name}</h3>
          </div>
          <div class="item-emoji">${info.emoji}</div>
        </div>
        <div class="stats">
          <span class="stat-pill">${info.label}</span>
          <span class="stat-pill">+<strong>${part.statValue}</strong> ${info.statLabel}</span>
        </div>
        <p>Valeur vente : ${moneyText(part.value)}</p>
        <div class="item-actions">
          <button class="small-btn" data-install-part="${part.id}">Monter</button>
          <button class="small-btn" data-toggle-combine="${part.id}">${selected ? "Retirer" : "Combi"}</button>
          <button class="danger-btn" data-sell-part="${part.id}">Vendre</button>
        </div>
      </article>
    `;
  }).join("");

  renderCombineStatus();
}

function renderCombineStatus() {
  const selectedParts = combineSelection.map((id) => state.parts.find((part) => part.id === id)).filter(Boolean);
  combineSelection = selectedParts.map((part) => part.id);

  const status = $("#combineStatus");
  const button = $("#combineBtn");

  if (!selectedParts.length) {
    status.textContent = "Aucune pièce sélectionnée.";
    button.disabled = true;
    return;
  }

  const valid = canCombine(selectedParts);
  const first = selectedParts[0];
  const details = first ? `${partTypes[first.type].label} • ${rarityConfig[first.rarity].label}` : "";
  status.textContent = `${selectedParts.length}/3 sélectionnées (${details}) ${valid ? "— prêt à combiner." : "— même type et même rareté requis."}`;
  button.disabled = !valid;
}

function canCombine(parts) {
  if (parts.length !== 3) return false;
  const [first] = parts;
  if (!first || first.rarity === "legendary") return false;
  return parts.every((part) => part.type === first.type && part.rarity === first.rarity);
}

function switchTab(tabId) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  $$(".panel").forEach((panel) => panel.classList.toggle("active-panel", panel.id === tabId));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

function openBox(boxId) {
  const box = boxes.find((item) => item.id === boxId);
  if (!box) return;
  if (state.money < box.cost) {
    showToast("Pas assez d'argent. Va faire un mini-jeu pour te refaire !");
    switchTab("minigames");
    return;
  }

  state.money -= box.cost;
  pendingReward = rewardFromBox(box);
  saveGame();
  renderMoney();
  launchOpeningAnimation(box, pendingReward);
}

function launchOpeningAnimation(box, reward) {
  const modal = $("#openingModal");
  const track = $("#rouletteTrack");
  const reveal = $("#rewardReveal");
  const close = $("#closeModalBtn");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  reveal.innerHTML = "";
  close.classList.add("hidden");
  track.style.transition = "none";
  track.style.transform = "translateX(0)";

  const fakeRewards = Array.from({ length: 21 }, () => rewardFromBox(box));
  fakeRewards.splice(15, 0, reward);
  track.innerHTML = fakeRewards.map((item) => {
    const rarity = rarityConfig[item.rarity];
    const emoji = item.kind === "car" ? item.emoji : partTypes[item.type].emoji;
    return `<div class="roulette-card" style="--rarityColor:${rarity.color}" title="${rarity.label}">${emoji}</div>`;
  }).join("");

  playTone(280, 0.12, 0.04);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.transition = "transform 2.4s cubic-bezier(.11,.82,.18,1)";
      track.style.transform = "translateX(-1710px)";
    });
  });

  setTimeout(() => {
    const rarity = rarityConfig[reward.rarity];
    const isCar = reward.kind === "car";
    const title = isCar ? reward.name : reward.name;
    const icon = isCar ? reward.emoji : partTypes[reward.type].emoji;
    const desc = isCar
      ? `Voiture complète • Valeur ${moneyText(reward.value)}`
      : `${partTypes[reward.type].label} • +${reward.statValue} ${partTypes[reward.type].statLabel} • Valeur ${moneyText(reward.value)}`;

    reveal.innerHTML = `
      <div class="reward-card" style="--rarityGlow:${rarity.glow}">
        <div class="item-emoji">${icon}</div>
        <span class="badge" style="color:${rarity.color}">${rarity.label}</span>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
    `;
    close.classList.remove("hidden");
    playTone(reward.rarity === "legendary" ? 880 : 620, 0.18, 0.05);
  }, 2500);
}

function closeOpeningModal() {
  if (!pendingReward) return;
  addReward(pendingReward);
  showToast(`${pendingReward.kind === "car" ? "Voiture" : "Pièce"} ajoutée à ton garage !`);
  pendingReward = null;
  $("#openingModal").classList.add("hidden");
  $("#openingModal").setAttribute("aria-hidden", "true");
}

function installPart(partId) {
  const car = state.cars.find((item) => item.id === state.selectedCarId);
  const part = state.parts.find((item) => item.id === partId);
  if (!car) {
    showToast("Sélectionne une voiture avant de monter une pièce.");
    switchTab("garage");
    return;
  }
  if (!part) return;

  const previous = car.slots[part.type];
  car.slots[part.type] = part;
  state.parts = state.parts.filter((item) => item.id !== partId);
  if (previous) state.parts.push(previous);
  combineSelection = combineSelection.filter((id) => id !== partId);
  saveGame();
  renderAll();
  showToast(`${part.name} montée sur ${car.name}.`);
}

function removePart(type) {
  const car = state.cars.find((item) => item.id === state.selectedCarId);
  if (!car || !car.slots[type]) return;
  state.parts.push(car.slots[type]);
  car.slots[type] = null;
  saveGame();
  renderAll();
  showToast("Pièce retirée et remise dans l'inventaire.");
}

function sellPart(partId) {
  const part = state.parts.find((item) => item.id === partId);
  if (!part) return;
  state.money += part.value;
  state.parts = state.parts.filter((item) => item.id !== partId);
  combineSelection = combineSelection.filter((id) => id !== partId);
  saveGame();
  renderAll();
  showToast(`Pièce vendue pour ${moneyText(part.value)}.`);
}

function sellCar(carId) {
  const car = state.cars.find((item) => item.id === carId);
  if (!car) return;
  const value = carSellValue(car);
  state.money += value;
  Object.values(car.slots).forEach((part) => {
    if (part) state.parts.push(part);
  });
  state.cars = state.cars.filter((item) => item.id !== carId);
  if (state.selectedCarId === carId) state.selectedCarId = state.cars[0]?.id || null;
  saveGame();
  renderAll();
  showToast(`Voiture vendue pour ${moneyText(value)}. Les pièces montées sont récupérées.`);
}

function toggleCombine(partId) {
  const part = state.parts.find((item) => item.id === partId);
  if (!part) return;

  if (combineSelection.includes(partId)) {
    combineSelection = combineSelection.filter((id) => id !== partId);
  } else {
    if (combineSelection.length >= 3) combineSelection.shift();
    combineSelection.push(partId);
  }
  renderInventory();
}

function combineParts() {
  const selectedParts = combineSelection.map((id) => state.parts.find((part) => part.id === id)).filter(Boolean);
  if (!canCombine(selectedParts)) return;

  const first = selectedParts[0];
  const nextRarity = rarityOrder[rarityOrder.indexOf(first.rarity) + 1];
  const upgraded = createPart(nextRarity, first.type);
  upgraded.statValue += Math.round(selectedParts.reduce((sum, part) => sum + part.statValue, 0) * 0.08);
  upgraded.value += Math.round(selectedParts.reduce((sum, part) => sum + part.value, 0) * 0.12);

  const selectedIds = new Set(selectedParts.map((part) => part.id));
  state.parts = state.parts.filter((part) => !selectedIds.has(part.id));
  state.parts.push(upgraded);
  combineSelection = [];
  saveGame();
  renderAll();
  showToast(`Combinaison réussie : ${upgraded.name} obtenu !`);
}

function earnMoney(amount, message) {
  const reward = Math.max(0, Math.round(amount));
  state.money += reward;
  state.stats.miniGamesPlayed += 1;
  state.stats.earned += reward;
  saveGame();
  renderMoney();
  showToast(`${message} +${moneyText(reward)}`);
}

function startReactionGame() {
  const button = $("#reactionBtn");
  const lights = $("#lights");
  const result = $("#reactionResult");

  if (!reaction.waiting && !reaction.green) {
    reaction.waiting = true;
    reaction.green = false;
    button.textContent = "Clique au vert !";
    result.textContent = "Feux rouges...";
    lights.className = "lights red";
    playTone(220, 0.08, 0.035);

    const delay = 1300 + Math.random() * 2300;
    reaction.timeout = setTimeout(() => {
      reaction.waiting = false;
      reaction.green = true;
      reaction.start = performance.now();
      lights.className = "lights green";
      result.textContent = "VERT ! Clique !";
      playTone(520, 0.08, 0.04);
    }, delay);
    return;
  }

  if (reaction.waiting) {
    clearTimeout(reaction.timeout);
    reaction.waiting = false;
    lights.className = "lights";
    button.textContent = "Relancer";
    result.textContent = "Trop tôt ! Pénalité atelier : +25 € seulement.";
    earnMoney(25, "Faux départ, compensation");
    return;
  }

  if (reaction.green) {
    const reactionTime = performance.now() - reaction.start;
    reaction.green = false;
    lights.className = "lights";
    button.textContent = "Relancer";
    const reward = clamp(420 - reactionTime * 0.65, 60, 360);
    result.textContent = `${Math.round(reactionTime)} ms de réaction.`;
    earnMoney(reward, "Départ parfait");
  }
}

function startWorkshopGame() {
  if (workshop.active) return;
  const zone = $("#workshopZone");
  const button = $("#workshopBtn");
  const result = $("#workshopResult");

  workshop.active = true;
  workshop.clicks = 0;
  button.disabled = true;
  zone.classList.add("active");
  result.textContent = "Réparations : 0 — 8s restantes";
  playTone(330, 0.08, 0.035);

  let remaining = 8;
  workshop.timer = setInterval(() => {
    remaining -= 1;
    result.textContent = `Réparations : ${workshop.clicks} — ${remaining}s restantes`;
    if (remaining <= 0) {
      clearInterval(workshop.timer);
      workshop.active = false;
      button.disabled = false;
      zone.classList.remove("active");
      const reward = workshop.clicks * 18 + Math.min(workshop.clicks, 30) * 4;
      result.textContent = `Terminé : ${workshop.clicks} réparations.`;
      earnMoney(reward, "Atelier express");
    }
  }, 1000);
}

function workshopClick() {
  if (!workshop.active) return;
  workshop.clicks += 1;
  $("#workshopResult").textContent = `Réparations : ${workshop.clicks}`;
  $("#workshopZone").style.transform = `scale(${1 + Math.min(workshop.clicks, 15) * 0.006})`;
  playTone(300 + workshop.clicks * 5, 0.025, 0.015);
}

function startOrStopTimingGame() {
  const button = $("#timingBtn");
  const result = $("#timingResult");

  if (!timing.active) {
    timing.active = true;
    timing.pos = 0;
    timing.dir = 1;
    button.textContent = "Stop !";
    result.textContent = "Vise le centre...";
    moveTimingPointer();
    return;
  }

  timing.active = false;
  cancelAnimationFrame(timing.frame);
  button.textContent = "Rejouer";
  const distance = Math.abs(timing.pos - 50);
  const accuracy = clamp(100 - distance * 4.2, 0, 100);
  const reward = 55 + accuracy * 3.4;
  result.textContent = `Précision : ${Math.round(accuracy)}%`;
  earnMoney(reward, "Drift timing");
}

function moveTimingPointer() {
  if (!timing.active) return;
  timing.pos += timing.dir * 1.55;
  if (timing.pos >= 98) {
    timing.pos = 98;
    timing.dir = -1;
  }
  if (timing.pos <= 0) {
    timing.pos = 0;
    timing.dir = 1;
  }
  $("#timingPointer").style.left = `${timing.pos}%`;
  timing.frame = requestAnimationFrame(moveTimingPointer);
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.matches(".tab")) switchTab(target.dataset.tab);
    if (target.dataset.openBox) openBox(target.dataset.openBox);
    if (target.dataset.selectCar) {
      state.selectedCarId = target.dataset.selectCar;
      saveGame();
      renderAll();
      showToast("Voiture sélectionnée.");
    }
    if (target.dataset.sellCar) sellCar(target.dataset.sellCar);
    if (target.dataset.installPart) installPart(target.dataset.installPart);
    if (target.dataset.sellPart) sellPart(target.dataset.sellPart);
    if (target.dataset.toggleCombine) toggleCombine(target.dataset.toggleCombine);
    if (target.dataset.removePart) removePart(target.dataset.removePart);
  });

  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter;
      renderInventory();
    });
  });

  $("#combineBtn").addEventListener("click", combineParts);
  $("#closeModalBtn").addEventListener("click", closeOpeningModal);
  $("#quickBoxBtn").addEventListener("click", () => switchTab("boxes"));
  $("#saveBtn").addEventListener("click", () => {
    saveGame();
    showToast("Sauvegarde locale effectuée.");
  });

  $("#reactionBtn").addEventListener("click", startReactionGame);
  $("#workshopBtn").addEventListener("click", startWorkshopGame);
  $("#workshopZone").addEventListener("click", workshopClick);
  $("#timingBtn").addEventListener("click", startOrStopTimingGame);
}

loadGame();
bindEvents();
renderAll();
showToast("Bienvenue dans TurboBox Garage !");
