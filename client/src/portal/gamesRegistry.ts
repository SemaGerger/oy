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
    subtitle: "Arkadaşlarınla Co-op düşman avla veya PvP modunda birbirinizle kapışın!",
    category: "Çok Oyunculu",
    badge: "🔥 1. OYUN • AKTİF",
    badgeColor: "#22c55e",
    gradient: "linear-gradient(135deg, #0284c7 0%, #1e1b4b 100%)",
    iconName: "swords",
    isPlayable: true,
    playersText: "1-20 Oyuncu (Online)",
    featured: true,
  },
  {
    id: "nitro-drift-2d",
    title: "Nitro Drift Arena",
    subtitle: "Çok oyunculu 2D üstten görünümlü drift ve çarpışan arabalar yarışı.",
    category: "Yarış",
    badge: "YAKINDA (2. Oyun)",
    badgeColor: "#f59e0b",
    gradient: "linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)",
    iconName: "car",
    isPlayable: false,
    playersText: "Çok Oyunculu",
  },
  {
    id: "tower-defense-coop",
    title: "Kule Savunması Co-op",
    subtitle: "Arkadaşlarınla stratejik kuleler kur ve kaleyi koru.",
    category: "Strateji",
    badge: "YAKINDA (3. Oyun)",
    badgeColor: "#94a3b8",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #3b0764 100%)",
    iconName: "shield",
    isPlayable: false,
    playersText: "1-4 Oyuncu",
  },
  {
    id: "cyber-bomber-io",
    title: "Cyber Bomber .IO",
    subtitle: "Labirentte bombalar yerleştir, duvarları yık ve rakipleri ele!",
    category: "Aksiyon",
    badge: "YAKINDA (4. Oyun)",
    badgeColor: "#94a3b8",
    gradient: "linear-gradient(135deg, #e11d48 0%, #4c0519 100%)",
    iconName: "flame",
    isPlayable: false,
    playersText: "Online .IO",
  },
  {
    id: "neon-hockey-duel",
    title: "Neon Air Hockey",
    subtitle: "1v1 hızlı refleksli neon hava hokeyi turnuvası.",
    category: "Arcade",
    badge: "YAKINDA (5. Oyun)",
    badgeColor: "#94a3b8",
    gradient: "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
    iconName: "zap",
    isPlayable: false,
    playersText: "2 Oyuncu (1v1)",
  },
  {
    id: "battle-tanks-2d",
    title: "Tank Wars 2D",
    subtitle: "Sekmeli mermilerle taktiksel çok oyunculu tank savaşı.",
    category: "Çok Oyunculu",
    badge: "YAKINDA (6. Oyun)",
    badgeColor: "#94a3b8",
    gradient: "linear-gradient(135deg, #2563eb 0%, #172554 100%)",
    iconName: "trophy",
    isPlayable: false,
    playersText: "Takımlı Savaş",
  },
];
