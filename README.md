# 💐 Liebesstrauß

Eine mobile Web-App für zwei: Jede Nachricht ist eine Blume, die ihr euch gegenseitig in den Strauß steckt.
Ungeöffnete Nachrichten sind schimmernde Knospen. Beim Antippen blüht die Knospe auf, ein Briefumschlag öffnet sich und die Nachricht erscheint als kleiner Brief.

**Ohne Supabase:** Die App bringt ihren eigenen kleinen Server mit (Node.js + SQLite).
Du brauchst also kein Konto bei einem Drittanbieter, und alle Daten bleiben auf deinem Server.

---

## Funktionen

- **Zwei Sträuße:** „Mein Strauß" (was ich bekommen habe) und „Für [Name]" (was ich verschenkt habe)
- **6 Blumensorten** (Rose, Tulpe, Gänseblümchen, Lilie, Pfingstrose, Vergissmeinnicht) × **8 Farben**, alles als handgebaute SVG-Illustration. Beim Schreiben ist die Blume zufällig gewählt und lässt sich ändern.
- **Knospe → Blüte:** Ungeöffnete Blumen pulsieren und funkeln. Beim Öffnen blüht die Knospe auf, dann öffnet sich ein Umschlag und der Brief erscheint mit Datum und Uhrzeit.
- **Absender-Ansicht:** Geöffnete Blumen haben ein ✓ und zeigen „Geöffnet am …". Wenn dein Schatz eine Blume öffnet, siehst du das sofort (sie blüht bei dir live auf).
- **Bearbeiten & Löschen** eigener Blumen, solange sie noch nicht geöffnet wurden
- **Echtzeit:** Neue Blumen erscheinen auf beiden Handys sofort, ohne Neuladen
- **Verlauf** als Liste, nach Tagen gruppiert, als Alternative zur Strauß-Ansicht
- **Zähler:** „12 Blumen · 3 ungeöffnet"
- **PWA:** installierbar auf dem Homescreen, Push-Benachrichtigungen, App-Badge mit der Anzahl ungeöffneter Blumen
- **Dark Mode** (System, Hell oder Dunkel)
- Der Strauß wächst mit: Das Layout ordnet die Blüten überlappungsarm an und zoomt heraus. Ab 40 Blumen zeigt der Strauß alle ungeöffneten und die neuesten geöffneten Blumen, alle anderen stehen im Verlauf.

---

## Technik

| Wunsch aus der Anforderung | Umsetzung hier (ohne Supabase) |
|---|---|
| React + Tailwind | React 19, Tailwind CSS 4, Vite |
| Supabase Auth | Raum-Code + Name + **PIN** (scrypt-gehasht), Sitzung per httpOnly-Cookie |
| Supabase Datenbank | **SQLite** (eingebaut in Node.js, eine einzige Datei `data/liebesstrauss.db`) |
| Supabase Realtime | **Server-Sent Events** (`/api/events`) |
| Row Level Security | Jede API-Route prüft Sitzung → Mitglied → `room_id`. Ein Raum hat maximal 2 Mitglieder. |
| Push | **Web Push** (VAPID-Schlüssel werden beim ersten Start automatisch erzeugt) |

Tabellen: `rooms`, `members`, `flowers` (id, room_id, from_user, to_user, text, flower_type, color, emoji, created_at, updated_at, opened_at), dazu `sessions`, `push_subscriptions`, `meta`.

---

## 1. Lokal starten (Windows, macOS, Linux)

**Voraussetzung:** [Node.js](https://nodejs.org) **22.13 oder neuer** (empfohlen: 24 LTS).

```bash
npm install
npm run dev
```

Dann öffnest du **http://localhost:3000**.

Zum Ausprobieren zu zweit nimmst du ein zweites Browserfenster im Inkognito-Modus (oder einen anderen Browser):

1. Fenster 1: „Neuen Strauß-Raum erstellen" → Name + PIN → Einladungscode kopieren
2. Fenster 2: „Mit Einladungscode beitreten" → Code, Name, PIN

Produktionsmodus lokal:

```bash
npm run build
npm start
```

## 2. Auf dem Handy testen

**Im selben WLAN:** `http://<IP-deines-PCs>:3000` im Handy-Browser öffnen. Die App funktioniert so schon. Installation und Push-Benachrichtigungen brauchen aber **HTTPS**.

**Mit HTTPS (empfohlen zum Testen):** über einen kostenlosen Cloudflare-Tunnel:

```bash
winget install Cloudflare.cloudflared
```

```bash
cloudflared tunnel --url http://localhost:3000
```

Du bekommst eine Adresse wie `https://irgendwas.trycloudflare.com`. Die funktioniert von überall, solange dein PC läuft. Die Adresse ändert sich bei jedem Start, darum eignet sich das nur zum Testen.

## 3. Dauerhaft online stellen

Du brauchst: einen Rechner, der dauerhaft läuft, **HTTPS** und einen **dauerhaften Speicherort** für den Ordner `data/`.

### Variante A: Eigener kleiner Server (VPS) mit Docker (empfohlen)

1. Einen kleinen Linux-Server mieten (z. B. bei Hetzner, Netcup oder Strato). Die kleinste Größe reicht.
2. Eine (Sub-)Domain wie `liebe.deine-domain.de` per DNS-A-Record auf die IP des Servers zeigen lassen.
3. Docker installieren (`curl -fsSL https://get.docker.com | sh`).
4. Dieses Projekt auf den Server kopieren (z. B. per `git clone` oder `scp`).
5. In `Caddyfile` die Domain eintragen, in `docker-compose.yml` bei `VAPID_SUBJECT` deine E-Mail-Adresse.
6. Starten:
   ```bash
   docker compose up -d --build
   ```

Caddy holt automatisch ein HTTPS-Zertifikat. Fertig: `https://liebe.deine-domain.de`

Update auf eine neue Version: Projektdateien ersetzen, dann noch einmal `docker compose up -d --build`. Die Daten in `./data` bleiben erhalten.

### Variante B: Hosting-Plattform (Railway, Render, Fly.io …)

- Die Plattform baut das mitgelieferte `Dockerfile`. Alternativ Build-Befehl `npm ci && npm run build` und Start-Befehl `npm start`.
- **Wichtig:** Ein **persistentes Volume** unter `/data` einhängen und `DATA_DIR=/data` setzen. Ohne Volume sind die Daten bei jedem Deploy weg.
- Nur **eine** Instanz betreiben (SQLite und die Echtzeit-Verbindungen leben in einem Prozess).
- HTTPS stellt die Plattform bereit.

### Variante C: Zuhause (Raspberry Pi, alter Laptop)

Mit `npm run build && npm start` (oder Docker) starten und über einen **benannten Cloudflare-Tunnel** mit eigener Domain erreichbar machen. Dafür musst du am Router keine Ports öffnen.

## Konfiguration (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `3000` | Port des Servers |
| `DATA_DIR` | `./data` | Ordner für die Datenbank |
| `VAPID_SUBJECT` | `mailto:liebesstrauss@example.com` | Kontaktadresse für Push-Dienste. Bitte auf deine E-Mail setzen. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | automatisch | Optional eigene Push-Schlüssel (`npx web-push generate-vapid-keys`) |
| `TRUST_PROXY` | `1` | Anzahl vorgeschalteter Proxys (Caddy, Plattform). Ohne Proxy direkt im Internet: `0` |

---

## Installieren & Benachrichtigungen

**Android (Chrome):** In der App unter ⚙️ Einstellungen → „Zum Homescreen hinzufügen" (oder im Browser-Menü „App installieren"). Danach unter ⚙️ „Benachrichtigungen aktivieren".

**iPhone (ab iOS 16.4):**
1. In **Safari** öffnen → Teilen-Symbol → **„Zum Home-Bildschirm"**
2. Die App vom Home-Bildschirm starten und **einmal mit Raum-Code und PIN anmelden**. iOS trennt die Daten von installierten Web-Apps und Safari.
3. ⚙️ Einstellungen → „Benachrichtigungen aktivieren"

Die Benachrichtigung verrät nur, *dass* eine Blume angekommen ist („Tom hat dir eine Rose in den Strauß gesteckt"), nicht, was drinsteht.

---

## Sicherheit & Datenschutz

- **Nur ihr zwei:** Jede Anfrage wird serverseitig auf das Mitglied und seinen Raum geprüft. Ist der Raum voll, kann niemand mehr beitreten.
- **Keine Vorab-Spionage:** Der Text einer ungeöffneten Blume wird gar nicht erst an das Gerät des Empfängers geschickt, sondern erst beim Öffnen.
- **PIN:** scrypt-Hash mit Salt. Nach 5 Fehlversuchen wird der Zugang für 15 Minuten gesperrt. Jede weitere Sperre dauert doppelt so lang, höchstens 24 Stunden. Zusätzlich gibt es eine Begrenzung pro IP-Adresse.
  Tipp: Eine 6–8-stellige PIN ist deutlich sicherer als 4 Ziffern.
- **Sitzungen:** zufälliges Token, in der Datenbank nur als Hash gespeichert, als httpOnly- und SameSite-Cookie gesetzt.
- **Keine externen Dienste:** Die Schriften liegen auf deinem Server (keine Anfragen an Google Fonts, gut für die DSGVO). Dazu kommen eine strikte Content-Security-Policy und ein CSRF-Schutz.

**PIN vergessen?** Solange du noch auf einem Gerät angemeldet bist: ⚙️ → „PIN ändern". Sonst auf dem Server:

```bash
npm run reset-pin -- <RAUMCODE> <NAME> <NEUE_PIN>
```

```bash
docker compose exec app node scripts/reset-pin.mjs <RAUMCODE> <NAME> <NEUE_PIN>
```

Der erste Befehl ist für die normale Installation, der zweite für Docker.

## Backup

Alles steckt in **einer Datei**: `data/liebesstrauss.db`. Zum Sichern die App kurz stoppen und die Datei kopieren (bei Docker: `./data/liebesstrauss.db`).

---

## Projektstruktur

```
server/            Node-Server (Express)
  index.js         API-Routen, Auslieferung des Frontends
  db.js            SQLite-Schema
  auth.js          PIN, Sitzungen, Sperre, Rate-Limit, CSRF-Schutz
  realtime.js      Echtzeit per Server-Sent Events
  push.js          Web Push
shared/catalog.js  Blumensorten & Farben (Server + App)
src/               React-App
  flowers/         SVG-Blumen (art.jsx) und Strauß-Layout (layout.js)
  components/      Strauß, Brief, Schreib-Sheet, Verlauf, Einstellungen, Onboarding …
  lib/             Zustand & Echtzeit, Push, Theme, Formatierung
public/            Service Worker, Manifest, Icons
scripts/           Icon-Generator, PIN-Reset
```

**Entwicklung:**
- `npm run dev`: Server und Vite mit Hot Reload auf Port 3000
- `http://localhost:3000/?galerie`: nur im Dev-Modus; zeigt alle Blumen und Sträuße verschiedener Größe
- `npm run icons`: App-Icons neu erzeugen

Viel Freude beim Blumenschenken! 🌷
