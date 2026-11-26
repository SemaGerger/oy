# 📌 Sitecont Game — Önemli Linkler ve Yayın Notları

## 🌐 Canlı Siteler
- **Oyun Sitesi (Ön Yüz — Cloudflare):** https://game.sitecont.io
- **Oyun Sunucusu (Backend — Render):** https://sitecont-game-server.onrender.com
- **Sunucu Sağlık Kontrolü (Health Check):** https://sitecont-game-server.onrender.com/health

---

## 🛠️ Yönetim Panelleri
- **Cloudflare Workers Paneli (Ön Yüz Yükleme & Domain):**
  https://dash.cloudflare.com/3cabbf9b4a1f86a9780c6896fff8a7ae/workers/services/view/rapid-moon-a6a3/production
- **Cloudflare Ana Sayfa:**
  https://dash.cloudflare.com/3cabbf9b4a1f86a9780c6896fff8a7ae/home
- **Render Paneli (Oyun Sunucusu & Environment Variables):**
  https://dashboard.render.com/
- **Google Cloud Console (Google ile Giriş / OAuth Credentials):**
  https://console.cloud.google.com/apis/credentials?pli=1&project=elepd-510518
- **GitHub Deposu:**
  https://github.com/SemaGerger/oy

---

## 🔑 Ortam Değişkenleri (Referans)
- **Sunucu (Render ➔ Environment):**
  - `GOOGLE_CLIENT_ID` = `619335502397-tvvctifr3df36e5f4u557e3r63gpmbcr.apps.googleusercontent.com`
  - `AUTH_SECRET` = *(Render üzerinde otomatik üretilmiş gizli anahtar)*
- **İstemci (`client/.env` — GitHub'a gönderilmez):**
  - `VITE_SERVER_URL` = `https://sitecont-game-server.onrender.com`
  - `VITE_GOOGLE_CLIENT_ID` = `619335502397-tvvctifr3df36e5f4u557e3r63gpmbcr.apps.googleusercontent.com`

---

## 🚀 Güncelleme Nasıl Yapılır?

### 1. Sunucu (`server/`) Değiştiyse (Render Otomatik Günceller)
```powershell
git add .
git commit -m "guncelleme"
git push
```

### 2. Ön Yüz (`client/`) Değiştiyse (Cloudflare'e Yükle)
1. Terminalde derle:
   ```powershell
   npm run build --workspace=client
   ```
2. Cloudflare Workers panelinde sağ üstteki **New deployment** butonuna tıkla.
3. Bilgisayardan `c:\Users\SEMA.GERGER\Documents\GitHub\oy\client\dist` klasörünü seçip **Deploy** de.

### 3. Yerelde Test Etmek İçin
```powershell
npm run dev
```
- İstemci: http://localhost:3000
- Sunucu: http://localhost:2567/health
