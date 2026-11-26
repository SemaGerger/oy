---
trigger: always_on
description: Siber Güvenlik, Sürüm Güncellemeleri ve Sıfır Hata Anayasası (Zero-Vulnerability & Zero-Error Policy)
---

# 🛡️ SİBER GÜVENLİK VE SIFIR HATA ANAYASASI (Cybersecurity & Zero-Error Policy)

Bu projede geliştirilen tüm istemci (React + Phaser) ve sunucu (Node.js + Colyseus) kodlarında **Sıfır Güvenlik Açığı (Zero-Vulnerability)** ve **Sıfır Hata (Zero-Error)** prensibi geçerlidir.

## 1. Kapatılan Güvenlik Açıkları Kataloğu (Asla Tekrarlanmayacak Hatalar)
1. **`NaN` / `Infinity` Fizik ve Koordinat Enjeksiyonu:** `typeof NaN === "number"` doğru döndüğü için istemciden gelen her sayısal değer (`rotation` vb.) mutlaka `typeof val === "number" && Number.isFinite(val)` ile doğrulanmalı ve açılar `Math.atan2(Math.sin(a), Math.cos(a))` ile normalize edilmelidir.
2. **Null / Geçersiz Payload Çökmeleri:** Tüm `onMessage` dinleyicilerinde gelen veri `unknown` olarak karşılanmalı ve `if (!data || typeof data !== "object") return;` kontrolü yapılmalıdır.
3. **Yetkisiz Oda/Mod Değişikliği (Broken Access Control):** Oda ayarlarını (`toggle_mode` ile Co-op / PvP geçişi) yalnızca **Oda Sahibi (`client.sessionId === this.state.hostId`)** değiştirebilir (minimum `2000ms` cooldown ile). Oda sahibi ayrıldığında yetki otomatik olarak sıradaki oyuncuya devredilir.
4. **WebSocket Paket Flood ve Bellek Taşması (OOM / DoS):** `WebSocketTransport` üzerinde `maxPayload: 4096` (4KB) sınırı uygulanmalı; oyuncu başına saniyelik paket sayacı (`isPacketAllowed`) ile limit aşımında paketler reddedilmeli ve saldırgan istemci (`>280 paket/sn`) `client.leave(4001)` ile atılmalıdır.
5. **İsim Taklidi (Spoofing), XSS ve Sohbet Spam:** Tüm metin girdileri `[\x00-\x1F\x7F<>]` kontrol karakterlerinden temizlenmeli, `"SİSTEM"`, `"SYSTEM"`, `"ADMIN"`, `"MOD"` gibi ayrılmış isimler engellenmeli ve sohbet mesajlarına oyuncu başına en az `750ms` hız sınırı uygulanmalıdır.
6. **Şişkin Meta-Paket ve Alt Bağımlılık (Transitive Dependency) Açıkları:** Kullanılmayan `@colyseus/auth`, `grant`, `elliptic`, `request-oauth` çeken `colyseus` meta-paketi yerine doğrudan `@colyseus/core`, `@colyseus/ws-transport` ve `@colyseus/schema` kullanılmalı; alt bağımlılık açıkları kök `package.json` içinde `"overrides"` ile yamalı sürüme sabitlenmelidir.

## 2. Sürüm Güncellemeleri ve Bağımlılık Güvenliği (Supply Chain Cybersecurity)
- **Sıfır CVE Zorunluluğu (`npm audit`):** Yeni paket eklendiğinde veya sürüm güncellendiğinde `npm audit --registry=https://registry.npmjs.org` çalıştırılmalı ve **`found 0 vulnerabilities`** sonucu doğrulanmalıdır.
- **Overrides Kullanımı:** Alt bağımlılıklarda (ör. `nanoid`, `uuid`, `ws`) güvenlik açığı çıkarsa kök `package.json` içindeki `"overrides"` alanı ile güvenli sürüme zorlanmalıdır.
- **Minimal Bağımlılık:** Gereksiz üçüncü parti paketler asla eklenmemelidir.

## 3. Sunucu Yetkili Mimari (Server-Authoritative Architecture)
- İstemciden asla `x`, `y`, `hp`, `maxHp`, `damage`, `speed`, `kills` veya `score` kabul edilmez. İstemci yalnızca niyet (`left`, `right`, `up`, `down`, `rotation`, `shooting`) gönderir; tüm fizik, çarpışma ve skor hesaplamaları sunucuda yapılır.

## 4. İstemci (React + Phaser) ve Ağ Güvenliği
- Asla `dangerouslySetInnerHTML`, `innerHTML`, `eval()` veya `new Function()` kullanılmaz.
- URL'den okunan oda kodu (`?room=`) `/^[a-zA-Z0-9_-]{1,24}$/` regex kontrolünden geçirilmelidir.
- Express sunucusunda `app.disable("x-powered-by")`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` ve `express.json({ limit: "10kb" })` zorunludur.

## 5. Hata Yapmayı Minimuma İndirme Protokolü (Zero-Error Protocol)
- **Zorunlu Derleme Kontrolü:** Her kod değişikliğinden sonra hem sunucu (`npm run build --workspace=server`) hem istemci (`npx tsc --noEmit --project client/tsconfig.json`) derlenerek sıfır hata olduğu doğrulanmalıdır.
- **PowerShell Uyumluluğu:** Terminal komutları birleştirilirken `&&` yerine `;` kullanılmalıdır.
- **Bellek Sızıntısı Önleme:** Phaser nesneleri odadan çıkıldığında veya silindiğinde `.destroy()` ile yok edilmeli, React `useEffect` içindeki `EventBus.on` dinleyicileri cleanup içinde `EventBus.off` ile kaldırılmalıdır.

## 6. Yayınlama (Deploy) Bildirimi ve Panel Yolları Zorunluluğu
Her kod değişikliğinden sonra kullanıcıya hangi tarafın (`client/dist` ve/veya `server`) yayınlanması gerektiğini ve doğrudan panel yollarını mutlaka belirt:
- **Cloudflare Workers (`client/dist`):** `https://dash.cloudflare.com/3cabbf9b4a1f86a9780c6896fff8a7ae/workers/services/view/rapid-moon-a6a3/production` ➔ `Deployments` / `New deployment` ➔ `c:\Users\SEMA.GERGER\Documents\GitHub\oy\client\dist`
- **Render Sunucu (`server/`):** `git push` sonrası `https://dashboard.render.com/web/srv-dc3e2467bikc73cu7h2g` ➔ `Manual Deploy` ➔ `Deploy latest commit`
- **Canlı Site & Sunucu:** `https://game.sitecont.io` • `https://sitecont-game-server.onrender.com/health`

