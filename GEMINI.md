# 🛡️ SİBER GÜVENLİK VE SIFIR HATA ANAYASASI (Cybersecurity & Zero-Error Policy)

Bu projede geliştirilen tüm istemci (React + Phaser) ve sunucu (Node.js + Colyseus) kodlarında **Sıfır Güvenlik Açığı (Zero-Vulnerability)** ve **Sıfır Hata (Zero-Error)** prensibi geçerlidir. Kod yazarken, güncellerken veya paket eklerken aşağıdaki kurallara **kesinlikle ve istisnasız** uyulmalıdır:

---

## 1. Kapatılan Güvenlik Açıkları Kataloğu (Asla Tekrarlanmayacak Hatalar)

Aşağıdaki güvenlik açıkları tespit edilip kapatılmıştır; yeni eklenecek hiçbir özellikte bu hatalar tekrar edilmemelidir:

1. **`NaN` ve `Infinity` Fizik/Koordinat Enjeksiyonu:**
   - **Tehlike:** JavaScript'te `typeof NaN === "number"` ifadesi `true` döner. İstemciden `rotation: NaN` veya `Infinity` gönderildiğinde `Math.cos(NaN)` tüm koordinatları `NaN` yaparak oyun durumunu (GameState) çökertir.
   - **Zorunlu Kural:** İstemciden gelen her sayısal değer mutlaka `typeof val === "number" && Number.isFinite(val)` (`isValidFiniteNumber`) ile doğrulanmalı ve açılar `Math.atan2(Math.sin(a), Math.cos(a))` ile normalize edilmelidir.
2. **Null / Geçersiz Payload Çökmeleri (TypeError DoS):**
   - **Tehlike:** İstemcinin `room.send("move", null)` veya primitive bir değer göndermesi durumunda `data.left` okumasının sunucuyu çökertmesi.
   - **Zorunlu Kural:** Tüm `onMessage` dinleyicilerinde gelen veri `unknown` olarak karşılanmalı ve ilk satırda `if (!data || typeof data !== "object") return;` kontrolü yapılmalıdır.
3. **Yetkisiz Oda ve Mod Değişikliği (Broken Access Control):**
   - **Tehlike:** Odadaki herhangi bir oyuncunun `toggle_mode` mesajı göndererek oyun modunu (Co-op / PvP) değiştirmesi veya spam yapması.
   - **Zorunlu Kural:** Oda ayarlarını değiştirme yetkisi yalnızca **Oda Sahibine (`client.sessionId === this.state.hostId`)** aittir ve işlem başına en az `2000ms` cooldown uygulanmalıdır. Oda sahibi ayrıldığında yetki otomatik olarak sıradaki oyuncuya devredilmelidir.
4. **WebSocket Paket Flood / Bellek Taşması (OOM & DoS):**
   - **Tehlike:** Saniyede binlerce paket veya megabaytlarca büyüklükte tek bir WebSocket paketi gönderilerek sunucunun kilitlenmesi.
   - **Zorunlu Kural:** `WebSocketTransport` üzerinde `maxPayload: 4096` (4KB) sınırı bulunmalı; oyuncu başına saniyelik paket sayacı (`isPacketAllowed`) ile limit aşımında paketler reddedilmeli ve saldırgan istemci (`>280 paket/sn`) `client.leave(4001)` ile atılmalıdır.
5. **İsim Taklidi (Spoofing), XSS ve Sohbet Spam:**
   - **Tehlike:** Oyuncuların `"SİSTEM"`, `"SYSTEM"`, `"ADMIN"` gibi isimler alarak sahte sistem mesajı yayınlaması, görünmez kontrol karakterleri (`\x00-\x1F`) göndermesi veya sohbeti kilitlemesi.
   - **Zorunlu Kural:** Tüm metin girdileri `[\x00-\x1F\x7F<>]` karakterlerinden temizlenmeli, ayrılmış sistem isimleri engellenmeli ve sohbet mesajlarına oyuncu başına en az `750ms` hız sınırı uygulanmalıdır.
6. **Şişkin Meta-Paket ve Alt Bağımlılık (Transitive Dependency) Açıkları:**
   - **Tehlike:** `colyseus` üst paketinin kullanılmayan `@colyseus/auth`, `grant`, `elliptic`, `request-oauth` gibi güvenlik açığı barındıran paketleri projeye dahil etmesi ve eski `nanoid` sürümlerindeki CVE açıkları.
   - **Zorunlu Kural:** Sunucuda üst meta-paket yerine doğrudan `@colyseus/core`, `@colyseus/ws-transport` ve `@colyseus/schema` kullanılmalı; alt bağımlılık açıkları kök `package.json` içinde `"overrides"` ile güvenli sürüme sabitlenmelidir.

---

## 2. Sürüm Güncellemeleri ve Tedarik Zinciri Güvenliği (Dependency & Version Security)

1. **Minimal Bağımlılık İlkesi:** Projeye gereksiz hiçbir üçüncü parti paket eklenmemelidir.
2. **Güvenlik Denetimi (`npm audit`):** Yeni bir paket eklendiğinde veya sürüm güncellendiğinde mutlaka `npm audit --registry=https://registry.npmjs.org` komutu çalıştırılmalı ve sonucun **`found 0 vulnerabilities`** olduğu doğrulanmalıdır.
3. **Overrides ile Güvenli Sürüm Zorlama:** Bir kütüphanenin alt bağımlılığında (ör. `nanoid`, `uuid`, `ws`) yeni bir CVE güvenlik açığı çıkarsa, ilgili alt paket kök `package.json` içindeki `"overrides"` alanına eklenerek yamalı (patched) sürüme zorlanmalıdır.
4. **Sürüm Sabitleme ve Uyum:** `@colyseus/core`, `@colyseus/ws-transport`, `@colyseus/schema` ve `colyseus.js` sürümleri birbiriyle tam uyumlu tutulmalı; major sürüm geçişlerinde kırıcı değişiklikler (breaking changes) test edilmeden geçilmemelidir.

---

## 3. Sunucu Yetkili Mimari (Server-Authoritative Architecture)

- **Asla İstemciye Güvenme (Never Trust the Client):** İstemciden asla doğrudan koordinat (`x`, `y`), can (`hp`, `maxHp`), hasar (`damage`), hız (`speed`), öldürme (`kills`) veya skor (`score`) kabul edilmez.
- **Sadece Niyet (Intent) Kabul Et:** İstemci yalnızca yön tuşları (`left`, `right`, `up`, `down`), bakış açısı (`rotation`) ve ateş etme niyeti (`shooting`) gönderebilir.
- **Sunucu Hesaplaması:** Ateş hızı (fire-rate cooldown: `170ms`), mermi başlangıç noktası, çarpışma algılama (hit detection), düşman yapay zekası ve yeniden doğma (`respawnTimer`) tamamen sunucuda 50 FPS döngüsünde hesaplanır.

---

## 4. İstemci (React + Phaser) ve Ağ Güvenliği

- **XSS Koruması:** React bileşenlerinde asla `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval()` veya `new Function()` kullanılmaz.
- **URL Parametre Doğrulaması:** URL'den okunan oda davet kodu (`?room=`) yalnızca `/^[a-zA-Z0-9_-]{1,24}$/` regex kontrolünden geçtikten sonra kabul edilir.
- **HTTP Güvenlik Başlıkları:** Express sunucusunda `app.disable("x-powered-by")`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` ve `express.json({ limit: "10kb" })` her zaman aktif olmalıdır.

---

## 5. Hata Yapmayı Minimuma İndirme Protokolü (Zero-Error Protocol)

1. **Zorunlu Derleme ve Tip Kontrolü:** Her kod değişikliğinden sonra hem sunucu (`npm run build --workspace=server`) hem istemci (`npx tsc --noEmit --project client/tsconfig.json`) derlenerek **sıfır TypeScript hatası** olduğu kanıtlanmalıdır.
2. **Savunmacı Programlama (Defensive Coding):** Ağdan, kullanıcıdan veya URL'den gelen her veri `unknown` kabul edilmeli; `null`/`undefined` kontrolleri (`?.` ve `??`) eksiksiz yapılmalıdır.
3. **PowerShell Komut Uyumluluğu:** Çalışma ortamı Windows PowerShell olduğu için terminal komutları birleştirilirken `&&` yerine `;` kullanılmalı veya komutlar ayrı çalıştırılmalıdır.
4. **Bellek Sızıntısı (Memory Leak) Önleme:**
   - Phaser sahnesinde (`GameScene.ts`) odadan ayrılan oyuncu, yok olan düşman, mermi ve altınların `Container` nesneleri mutlaka `.destroy()` ile temizlenmelidir.
   - React `useEffect` kancalarında açılan tüm `EventBus.on` dinleyicileri ve `setInterval` zamanlayıcıları cleanup fonksiyonunda (`EventBus.off`, `clearInterval`) kapatılmalıdır.

---

## 6. Mobil Uyumluluk Zorunluluğu (Mobile-Playable Mandate)

- **Tüm Oyunlar Mobilde Oynanabilir Olmalıdır:** Portalda eklenecek her yeni oyun mutlaka **dokunmatik (touch / sürükleme / sanal joystick)** kontrol desteğiyle tasarlanmalı, sadece klavyeye bağımlı olmamalıdır.
- **Responsive HUD & Canvas:** Oyun `canvas` öğesinde `touch-action: none` ve sayfada `overscroll-behavior: none` zorunludur; mobil ekranlarda (`<768px`) sohbet varsayılan kapalı, skor tablosu kompakt ve masaüstü klavye ipuçları gizli olmalıdır.
- **Ofis (Light) ve Eğlence (Dark) Tema Desteği:** Yeni eklenecek tüm oyunlar `ThemeContext` (`isOffice`) ile uyumlu olmalıdır.

