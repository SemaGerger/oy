export interface GameMetadata {
  id: string;
  title: string;
  subtitle: string;
  category: "Aksiyon" | "Çok Oyunculu" | "Strateji" | "Yarış" | "Arcade";
  badge?: string;
  badgeColor?: string;
  gradient: string;
  iconName: "swords" | "car" | "trophy" | "zap" | "shield" | "flame";
  isPlayable: boolean;
  playersText: string;
  featured?: boolean;
}

export const GAMES_REGISTRY: GameMetadata[] = [
  {
    id: "survival-arena-2d",
    title: "Survival Arena 2D",
    subtitle: "Engellerin arkasına siper al, arkadaşlarınla Co-op düşman avla veya PvP modunda kapış!",
    category: "Çok Oyunculu",
    badge: "🔥 1. OYUN • AKTİF",
    badgeColor: "#22c55e",
    gradient: "linear-gradient(135deg, #0284c7 0%, #1e1b4b 100%)",
    iconName: "swords",
    isPlayable: true,
    playersText: "1-20 Oyuncu (Online)",
    featured: true,
  },
];
