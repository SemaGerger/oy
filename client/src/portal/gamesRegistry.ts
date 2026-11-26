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
  requiresAuth: boolean;
  playersText: string;
  featured?: boolean;
}

export const GAMES_REGISTRY: GameMetadata[] = [
  {
    id: "survival-arena-2d",
    title: "Survival Arena 2D",
    subtitle: "Kayaların ve siper duvarlarının arkasına saklan, arkadaşlarınla düşman dalgalarını temizle veya PvP modunda kapış.",
    category: "Çok Oyunculu",
    badge: "CANLI",
    badgeColor: "#16a34a",
    gradient: "#2c3832",
    iconName: "swords",
    isPlayable: true,
    requiresAuth: true,
    playersText: "1-20 Oyuncu",
    featured: true,
  },
];
