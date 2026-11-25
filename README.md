# 2D Top-Down Çok Oyunculu Web Oyunu

**React**, **Phaser**, **Colyseus** ve **TypeScript** ile geliştirilmiş, gerçek zamanlı çok oyunculu (multiplayer) 2D Top-Down oyun mimarisi.

---

## 🚀 Projeyi Çalıştırma

Projeyi tek bir komutla hem sunucu (server) hem istemci (client) tarafını eşzamanlı olarak başlatabilirsiniz:

```bash
npm run dev
```

- **İstemci (Client - React + Phaser):** [http://localhost:3000](http://localhost:3000)
- **Sunucu (Server - Colyseus WebSocket):** `ws://localhost:2567` (ve sağlık kontrolü: `http://localhost:2567/health`)

> [!TIP]
> **Çok Oyunculu Test:** Tarayıcınızda iki ayrı sekme açıp [http://localhost:3000](http://localhost:3000) adresine girerek farklı oyuncu isimleriyle bağlanın. Hareketlerin, liderlik tablosunun ve sohbetin anlık senkronizasyonunu test edebilirsiniz.

---

## 🎮 Kontroller & Oynanış

| Eylem | Tuş / Kontrol |
|---|---|
| **Hareket** | `W`, `A`, `S`, `D` veya `Ok Tuşları` |
| **Yön / Bakış** | Mouse imleci |
| **Puan Kazanma** | Haritada beliren sarı altın küreleri toplayın |
| **Sohbet (Chat)** | Sol alttaki sohbet kutusuna yazıp `Enter` veya Gönder |

---

## 📂 Proje Yapısı

```
oy/
├── client/                     # Frontend (React 18 + Phaser 3 + Colyseus.js + Vite)
│   ├── src/
│   │   ├── game/               # Phaser sahneleri ve oyun mantığı
│   │   │   ├── scenes/
│   │   │   │   └── GameScene.ts# 2D harita, oyuncu lerp interpolasyonu, altınlar
│   │   │   ├── EventBus.ts     # Phaser ↔ React haberleşme köprüsü
│   │   │   └── main.ts         # Phaser Game başlatıcı
│   │   ├── network/
│   │   │   └── client.ts       # Colyseus.js istemci bağlantı yöneticisi
│   │   ├── ui/                 # React UI katmanı
│   │   │   ├── HUD.tsx         # Liderlik tablosu, ping, sohbet, kontroller
│   │   │   └── LoginScreen.tsx # Oyuncu adı giriş ekranı
│   │   ├── App.tsx             # Ana React kök bileşeni
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend (Node.js + Colyseus + Express + TypeScript)
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── schema/
│   │   │   │   ├── Player.ts   # Oyuncu şeması (x, y, skor, renk, hız)
│   │   │   │   └── GameState.ts# Oyun oda durumu (players, coins)
│   │   │   └── GameRoom.ts     # 50 FPS simülasyon, hareket & çarpışma kontrolü
│   │   └── index.ts            # Colyseus HTTP & WS sunucu başlatıcı
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                # Monorepo kök dizini (workspaces & concurrently)
└── README.md
```

---

## 🛠️ Gelecek Geliştirme Adımları

1. **Ateş Etme & Mermi Sistemi:** Sol tık ile mermi fırlatma ve oyuncu can (HP) barı ekleme.
2. **Sprite & Animasyonlar:** Vektörel daireler yerine özel pixel art veya 2D karakter sprite'ları ekleme.
3. **Engeller & Harita (Tilemap):** Tiled harita editörü ile duvarlar, binalar veya ormanlar ekleyip raycast / çarpışma sınırları oluşturma.
4. **Ses Efektleri:** Altın toplama ve hareket sesleri için Phaser Sound Manager entegrasyonu.
