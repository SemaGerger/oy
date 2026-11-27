/**
 * Merkezi Reklam Yapılandırması (AdSense / Özel Sponsor / Oyun Ağı Hazır)
 *
 * Reklam almaya başladığınızda:
 * 1. `AD_CONFIG.mode` değerini `"live"` yapın (yerleri görmek için `"placeholder"`, tamamen kapatmak için `"off"`).
 * 2. `publisherId` alanına yayıncı kimliğinizi (ör. "ca-pub-XXXXXXXXXXXXXXXX") girin.
 * 3. `AD_SLOTS` altındaki ilgili `adSlotId` alanlarını reklam ağınızdan aldığınız slot ID'lerle doldurun.
 */

export type AdMode = "off" | "placeholder" | "live";

export type AdSlotKey =
  | "portal_top_banner"
  | "portal_mid_banner"
  | "portal_left_rail"
  | "portal_right_rail"
  | "lobby_companion"
  | "ingame_bottom_bar"
  | "respawn_intermission";

export interface AdSize {
  width: number;
  height: number;
  label: string;
}

export interface AdSlotDefinition {
  key: AdSlotKey;
  title: string;
  /** Reklam ağından (AdSense / GAM vb.) alınacak slot ID */
  adSlotId: string;
  /** Masaüstü (>= 1024px) boyutu; null ise masaüstünde gösterilmez */
  desktop: AdSize | null;
  /** Mobil web (< 768px) boyutu; null ise mobilde gösterilmez */
  mobile: AdSize | null;
  /** Tablet (768px - 1023px) boyutu; belirtilmezse mobile veya desktop kullanılır */
  tablet?: AdSize | null;
  /** Sadece çok geniş masaüstü ekranlarda (>= 1360px) kenar boşluğu reklamı mı? */
  wideDesktopOnly?: boolean;
}

export const AD_CONFIG: {
  mode: AdMode;
  publisherId: string;
} = {
  // Şimdilik reklam yerleşimlerini önizlemek için "placeholder".
  // Yayında gizlemek için "off", canlı reklam ağı bağlayınca "live" yapın.
  mode: "placeholder",
  publisherId: "",
};

export const AD_SLOTS: Record<AdSlotKey, AdSlotDefinition> = {
  portal_top_banner: {
    key: "portal_top_banner",
    title: "Ana Sayfa Üst Banner",
    adSlotId: "",
    desktop: { width: 728, height: 90, label: "728×90 Leaderboard" },
    tablet: { width: 728, height: 90, label: "728×90 Leaderboard" },
    mobile: { width: 320, height: 50, label: "320×50 Mobil Banner" },
  },
  portal_mid_banner: {
    key: "portal_mid_banner",
    title: "Ana Sayfa Alt Banner",
    adSlotId: "",
    desktop: { width: 728, height: 90, label: "728×90 Leaderboard" },
    tablet: { width: 728, height: 90, label: "728×90 Leaderboard" },
    mobile: { width: 300, height: 250, label: "300×250 Mobil Kutu" },
  },
  portal_left_rail: {
    key: "portal_left_rail",
    title: "Masaüstü Sol Kenar",
    adSlotId: "",
    desktop: { width: 160, height: 600, label: "160×600 Skyscraper" },
    tablet: null,
    mobile: null,
    wideDesktopOnly: true,
  },
  portal_right_rail: {
    key: "portal_right_rail",
    title: "Masaüstü Sağ Kenar",
    adSlotId: "",
    desktop: { width: 160, height: 600, label: "160×600 Skyscraper" },
    tablet: null,
    mobile: null,
    wideDesktopOnly: true,
  },
  lobby_companion: {
    key: "lobby_companion",
    title: "Lobi Reklam Alanı",
    adSlotId: "",
    desktop: { width: 300, height: 250, label: "300×250 Kutu" },
    tablet: { width: 320, height: 100, label: "320×100 Banner" },
    mobile: { width: 320, height: 50, label: "320×50 Mobil Banner" },
  },
  ingame_bottom_bar: {
    key: "ingame_bottom_bar",
    title: "Oyun İçi Alt Şerit (Sadece Masaüstü)",
    adSlotId: "",
    desktop: { width: 468, height: 60, label: "468×60 Mini Banner" },
    tablet: null,
    mobile: null, // Mobilde oyun içi dokunmatik alanı asla daraltmaz
  },
  respawn_intermission: {
    key: "respawn_intermission",
    title: "Yeniden Doğma Arası",
    adSlotId: "",
    desktop: { width: 300, height: 250, label: "300×250 Kutu" },
    tablet: { width: 300, height: 250, label: "300×250 Kutu" },
    mobile: { width: 320, height: 100, label: "320×100 Büyük Mobil" },
  },
};
