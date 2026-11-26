export interface HeroSkin {
  id: string;
  name: string;
  spriteKey: string;
  spritePath: string;
  accent: string;
}

export const HERO_SKINS: HeroSkin[] = [
  {
    id: "cyber_cat",
    name: "Siber Kedi",
    spriteKey: "hero_cyber_cat",
    spritePath: "/assets/sprites/hero_cyber_cat.webp",
    accent: "#06b6d4",
  },
  {
    id: "cactus_cowboy",
    name: "Kaktüs Kovboy",
    spriteKey: "hero_cactus_cowboy",
    spritePath: "/assets/sprites/hero_cactus_cowboy.webp",
    accent: "#22c55e",
  },
  {
    id: "astro_duck",
    name: "Astronot Ördek",
    spriteKey: "hero_astro_duck",
    spritePath: "/assets/sprites/hero_astro_duck.webp",
    accent: "#38bdf8",
  },
  {
    id: "samurai_frog",
    name: "Samuray Kurbağa",
    spriteKey: "hero_samurai_frog",
    spritePath: "/assets/sprites/hero_samurai_frog.webp",
    accent: "#ef4444",
  },
  {
    id: "steampunk_owl",
    name: "Buharlı Baykuş",
    spriteKey: "hero_steampunk_owl",
    spritePath: "/assets/sprites/hero_steampunk_owl.webp",
    accent: "#f59e0b",
  },
  {
    id: "slime_knight",
    name: "Şövalye Slime",
    spriteKey: "hero_slime_knight",
    spritePath: "/assets/sprites/hero_slime_knight.webp",
    accent: "#14b8a6",
  },
];

const HERO_STORAGE_KEY = "sitecont_hero_skin";
const VALID_HERO_IDS = new Set(HERO_SKINS.map((h) => h.id));

export function isValidHeroId(id: unknown): id is string {
  return typeof id === "string" && VALID_HERO_IDS.has(id);
}

export function getSavedHeroId(): string {
  try {
    const saved = localStorage.getItem(HERO_STORAGE_KEY);
    if (isValidHeroId(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return HERO_SKINS[0].id;
}

export function saveHeroId(id: string): void {
  if (!isValidHeroId(id)) return;
  try {
    localStorage.setItem(HERO_STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }
}

export function getHeroById(id?: string): HeroSkin {
  return HERO_SKINS.find((h) => h.id === id) ?? HERO_SKINS[0];
}
