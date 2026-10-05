# 🍻 Costa Blanca Bier-Tasting Fiesta & Sommelier Cup

Die ultimative Web-App für eure Urlaubs-Bierverkostung in Xàbia / Costa Blanca!
Inklusive Live-Multiplayer, Buzzer, Soundboard, El Hidratador (Wasser-Erinnerung), Foto-Scan mit KI-Erkennung und Sommelier-Urkunden mit Urlaubs-Polaroid.

---

## 🚀 100% Kostenlos Starten (3 Optionen)

### Option 1: 1-Klick Cloud Hosting (Render.com - 0 €)
1. Erstelle einen kostenlosen Account auf [render.com](https://render.com).
2. Klicke auf **New +** ➔ **Web Service** und wähle dein Repository `jonasbecker/beertasting`.
3. Render erkennt die `render.yaml` automatisch (Build: `npm run build`, Start: `npm run start`).
4. (Optional) Trage unter Environment Variables deinen kostenlosen `GEMINI_API_KEY` ein.
5. Klicke auf **Deploy** – fertig! Du erhältst eine feste HTTPS-Domain mit voller WebSocket-Unterstützung für alle Handys.

---

### Option 2: Lokal auf dem Laptop starten (WLAN-Modus für die Finca / Ferienwohnung)
Wenn alle Handys und dein Laptop im selben WLAN sind:
```bash
git clone https://github.com/jonasbecker/beertasting.git
cd beertasting
npm install
npm run build
npm run start
```
Die Konsole zeigt dir direkt die Adresse an:
* Laptop: `http://localhost:3000`
* Handys im WLAN: `http://192.168.x.x:3000` (wird direkt im Terminal ausgegeben!)

---

### Option 3: Weltweit kostenlos freigeben mit 1 Befehl (localtunnel)
Wenn du die App auf deinem Laptop startest, aber Kumpels über mobiles Internet spielen wollen:
```bash
npm run start
```
und in einem zweiten Terminal:
```bash
npx localtunnel --port 3000
```
Du bekommst sofort eine kostenlose HTTPS-Adresse (z.B. `https://cool-beers.loca.lt`), die du deinen Kumpels schicken kannst!

---

## 📸 KI Foto-Erkennung & Offline-Schutz
* **Kostenloser Key:** Hole dir auf [aistudio.google.com/apikey](https://aistudio.google.com/apikey) einen kostenlosen Gemini-Key und trage ihn in eine `.env`-Datei als `GEMINI_API_KEY=...` ein.
* **Smart Fallback:** Auch ohne Key oder bei schwachem Netz erkennt die App über 100 spanische Biere (Alhambra, Voll-Damm, Inedit, Turia, Steinburg Mercadona) automatisch.
