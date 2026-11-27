export interface HeroSkin {
  id: string;
  name: string;
  tagline: string;
  spriteKey: string;
  spritePath: string;
  accent: string;
  unlockLevel: number;
  /** Mermi hasarı çarpanı */
  damageMult: number;
  /** Bomba yıkım gücü (hasar + patlama yarıçapı) çarpanı */
  blastMult: number;
}

export const HERO_SKINS: HeroSkin[] = [
  {
    id: "slime_knight",
    name: "Şövalye Slime",
    tagline: "Altın miğferli cesur başlangıç savaşçısı!",
    spriteKey: "hero_slime_knight",
    spritePath: "/assets/sprites/hero_slime_knight.webp",
    accent: "#14b8a6",
    unlockLevel: 1, damageMult: 1, blastMult: 1,
  },
  {
    id: "cactus_cowboy",
    name: "Kaktüs Kovboy",
    tagline: "Çölün en dikenli ve hızlı nişancısı!",
    spriteKey: "hero_cactus_cowboy",
    spritePath: "/assets/sprites/hero_cactus_cowboy.webp",
    accent: "#22c55e",
    unlockLevel: 2, damageMult: 1.2, blastMult: 1.15,
  },
  {
    id: "astro_duck",
    name: "Astronot Ördek",
    tagline: "Jetpack'li galaksi koruyucusu!",
    spriteKey: "hero_astro_duck",
    spritePath: "/assets/sprites/hero_astro_duck.webp",
    accent: "#38bdf8",
    unlockLevel: 3, damageMult: 1.45, blastMult: 1.3,
  },
  {
    id: "samurai_frog",
    name: "Samuray Kurbağa",
    tagline: "Katanasıyla gölgeleri yaran usta savaşçı!",
    spriteKey: "hero_samurai_frog",
    spritePath: "/assets/sprites/hero_samurai_frog.webp",
    accent: "#ef4444",
    unlockLevel: 4, damageMult: 1.75, blastMult: 1.5,
  },
  {
    id: "steampunk_owl",
    name: "Buharlı Baykuş",
    tagline: "Mekanik kanatlı gökyüzü komutanı!",
    spriteKey: "hero_steampunk_owl",
    spritePath: "/assets/sprites/hero_steampunk_owl.webp",
    accent: "#f59e0b",
    unlockLevel: 5, damageMult: 2.1, blastMult: 1.75,
  },
  {
    id: "cyber_cat",
    name: "Siber Kedi",
    tagline: "Arenanın efsanevi neon suikastçısı!",
    spriteKey: "hero_cyber_cat",
    spritePath: "/assets/sprites/hero_cyber_cat.webp",
    accent: "#06b6d4",
    unlockLevel: 6, damageMult: 2.5, blastMult: 2,
  },
];

// Cumulative XP thresholds for Levels 1..6; beyond Level 6 each level is +5000 XP
const LEVEL_XP_THRESHOLDS = [0, 1800, 5000, 10000, 17000, 27000];

const HERO_STORAGE_KEY = "sitecont_hero_skin";
const XP_STORAGE_KEY = "sitecont_player_xp";
const VALID_HERO_IDS = new Set(HERO_SKINS.map((h) => h.id));

export interface PlayerProgress {
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressRatio: number;
}

export function getStoredXp(): number {
  try {
    const raw = Number(localStorage.getItem(XP_STORAGE_KEY) || "0");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

export function computeProgressFromXp(xp: number): PlayerProgress {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;

  let level = 1;
  let prevThreshold = 0;
  let nextThreshold = LEVEL_XP_THRESHOLDS[1];

  for (let i = 1; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
      prevThreshold = LEVEL_XP_THRESHOLDS[i];
      nextThreshold =
        i + 1 < LEVEL_XP_THRESHOLDS.length
          ? LEVEL_XP_THRESHOLDS[i + 1]
          : LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1] + 5000;
    } else {
      nextThreshold = LEVEL_XP_THRESHOLDS[i];
      break;
    }
  }

  const maxFixed = LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
  if (safeXp >= maxFixed) {
    const extraLevels = Math.floor((safeXp - maxFixed) / 5000);
    level = LEVEL_XP_THRESHOLDS.length + extraLevels;
    prevThreshold = maxFixed + extraLevels * 5000;
    nextThreshold = prevThreshold + 5000;
  }

  const span = Math.max(1, nextThreshold - prevThreshold);
  const currentLevelXp = safeXp - prevThreshold;
  const progressRatio = Math.max(0, Math.min(1, currentLevelXp / span));

  return {
    xp: safeXp,
    level,
    currentLevelXp,
    nextLevelXp: span,
    progressRatio,
  };
}

export function getPlayerProgress(): PlayerProgress {
  return computeProgressFromXp(getStoredXp());
}

export function addPlayerXp(delta: number): {
  leveledUp: boolean;
  progress: PlayerProgress;
  unlockedHero: HeroSkin | null;
} {
  if (!Number.isFinite(delta) || delta <= 0) {
    return { leveledUp: false, progress: getPlayerProgress(), unlockedHero: null };
  }
  const prevXp = getStoredXp();
  const prevLevel = computeProgressFromXp(prevXp).level;
  const nextXp = prevXp + Math.floor(delta);
  try {
    localStorage.setItem(XP_STORAGE_KEY, String(nextXp));
  } catch {
    // ignore storage errors
  }
  const progress = computeProgressFromXp(nextXp);
  const leveledUp = progress.level > prevLevel;
  const unlockedHero = leveledUp
    ? HERO_SKINS.find((h) => h.unlockLevel === progress.level) ?? null
    : null;

  return { leveledUp, progress, unlockedHero };
}

export function isValidHeroId(id: unknown): id is string {
  return typeof id === "string" && VALID_HERO_IDS.has(id);
}

export function isHeroUnlocked(id: string, level: number = getPlayerProgress().level): boolean {
  const hero = HERO_SKINS.find((h) => h.id === id);
  if (!hero) return false;
  return level >= hero.unlockLevel;
}

export function getSavedHeroId(): string {
  const level = getPlayerProgress().level;
  try {
    const saved = localStorage.getItem(HERO_STORAGE_KEY);
    if (isValidHeroId(saved) && isHeroUnlocked(saved, level)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return HERO_SKINS[0].id;
}

export function saveHeroId(id: string): void {
  if (!isValidHeroId(id) || !isHeroUnlocked(id)) return;
  try {
    localStorage.setItem(HERO_STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }
}

export function getHeroById(id?: string): HeroSkin {
  return HERO_SKINS.find((h) => h.id === id) ?? HERO_SKINS[0];
}

export const WORLD_SPRITES: Array<{ key: string; path: string }> = [
  { key: "prop_rock", path: "/assets/sprites/prop_rock.webp" },
  { key: "prop_barrier", path: "/assets/sprites/prop_barrier.webp" },
  { key: "prop_pillar", path: "/assets/sprites/prop_pillar.webp" },
  { key: "prop_bush", path: "/assets/sprites/prop_bush.webp" },
  { key: "enemy_tank", path: "/assets/sprites/enemy_tank.webp" },
  { key: "boss_crimson_dragon", path: "/assets/sprites/boss_crimson_dragon.webp" },
  { key: "boss_octo_king", path: "/assets/sprites/boss_octo_king.webp" },
  { key: "boss_magma_titan", path: "/assets/sprites/boss_magma_titan.webp" },
];

export const BOSS_SPRITE_KEYS = [
  "boss_crimson_dragon",
  "boss_octo_king",
  "boss_magma_titan",
] as const;

