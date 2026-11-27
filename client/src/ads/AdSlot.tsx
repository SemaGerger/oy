import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AD_CONFIG, AD_SLOTS, AdSize, AdSlotKey } from "./adConfig";
import { useTheme } from "../theme/ThemeContext";

interface AdSlotProps {
  slotKey: AdSlotKey;
  /** Oyun içi alt şerit gibi yerlerde kullanıcının geçici olarak kapatabilmesi için */
  dismissible?: boolean;
  /** İsteğe bağlı ekstra kapsayıcı stili */
  style?: React.CSSProperties;
}

type ViewportKind = "mobile" | "tablet" | "desktop" | "desktopWide";

function getViewportKind(width: number): ViewportKind {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  if (width < 1360) return "desktop";
  return "desktopWide";
}

function resolveSize(slotKey: AdSlotKey, vp: ViewportKind): AdSize | null {
  const def = AD_SLOTS[slotKey];
  if (!def) return null;
  if (def.wideDesktopOnly && vp !== "desktopWide") return null;
  if (vp === "mobile") return def.mobile;
  if (vp === "tablet") return def.tablet !== undefined ? def.tablet : def.mobile;
  return def.desktop;
}

export const AdSlot: React.FC<AdSlotProps> = ({ slotKey, dismissible = false, style }) => {
  const { isOffice } = useTheme();
  const [viewport, setViewport] = useState<ViewportKind>(() =>
    getViewportKind(typeof window !== "undefined" ? window.innerWidth : 1280)
  );
  const [dismissed, setDismissed] = useState(false);
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const onResize = () => setViewport(getViewportKind(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const def = AD_SLOTS[slotKey];
  const size = resolveSize(slotKey, viewport);

  // Canlı reklam modunda AdSense / benzeri ağ başlatma kancası
  useEffect(() => {
    if (AD_CONFIG.mode !== "live" || !size || !def?.adSlotId || !AD_CONFIG.publisherId) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      if (Array.isArray(w.adsbygoogle) && adRef.current) {
        w.adsbygoogle.push({});
      }
    } catch {
      // Reklam engelleyici veya yüklenmemiş script durumunda sessizce devam et
    }
  }, [size, def?.adSlotId]);

  if (AD_CONFIG.mode === "off" || dismissed || !def || !size) {
    return null;
  }

  const isPlaceholder = AD_CONFIG.mode === "placeholder" || !def.adSlotId || !AD_CONFIG.publisherId;
  const deviceTag =
    viewport === "mobile"
      ? "MOBİL WEB"
      : viewport === "tablet"
        ? "TABLET"
        : "MASAÜSTÜ";

  return (
    <aside
      aria-label={`Reklam: ${def.title}`}
      data-ad-placement={slotKey}
      data-ad-device={viewport}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        width: `${size.width}px`,
        maxWidth: "100%",
        height: `${size.height}px`,
        minHeight: `${size.height}px`,
        margin: "0 auto",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        pointerEvents: "auto",
        backgroundColor: isOffice
          ? "rgba(241, 245, 249, 0.92)"
          : "rgba(24, 24, 27, 0.86)",
        border: isPlaceholder
          ? isOffice
            ? "1.5px dashed #94a3b8"
            : "1.5px dashed #52525b"
          : isOffice
            ? "1px solid #cbd5e1"
            : "1px solid #3f3f46",
        color: isOffice ? "#475569" : "#a1a1aa",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Reklam alanını gizle"
          title="Gizle"
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "20px",
            height: "20px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: isOffice ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.12)",
            color: isOffice ? "#334155" : "#e4e4e7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          <X size={12} />
        </button>
      )}

      {isPlaceholder ? (
        <div
          style={{
            display: "flex",
            flexDirection: size.height <= 64 ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            gap: size.height <= 64 ? "8px" : "4px",
            padding: "4px 10px",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              padding: "2px 6px",
              borderRadius: "999px",
              backgroundColor: isOffice ? "#e2e8f0" : "#27272a",
              color: isOffice ? "#334155" : "#d4d4d8",
            }}
          >
            REKLAM ALANI • {deviceTag}
          </span>
          <span
            style={{
              fontSize: size.height <= 64 ? "11px" : "12px",
              fontWeight: 700,
              color: isOffice ? "#334155" : "#e4e4e7",
            }}
          >
            {size.label}
          </span>
          {size.height >= 200 && (
            <span style={{ fontSize: "10px", opacity: 0.72 }}>{def.title}</span>
          )}
        </div>
      ) : (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: "inline-block",
            width: `${size.width}px`,
            height: `${size.height}px`,
          }}
          data-ad-client={AD_CONFIG.publisherId}
          data-ad-slot={def.adSlotId}
        />
      )}
    </aside>
  );
};
