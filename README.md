# ClipSync

**Sync clipboard between your phone and Windows PC over Wi-Fi.**

Copy something on your phone — instantly paste it on Windows with Ctrl+V. Like Apple's Universal Clipboard, but for Windows + iOS/Android.

![Platform](https://img.shields.io/badge/platform-Windows-blue) ![Node.js](https://img.shields.io/badge/runtime-Node.js-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

[O'zbek tilida](#o'zbek-tilida) | [English](#features)

## Features

- **Text sync** — Text copied on phone instantly available on Windows (Ctrl+V)
- **Image sync** — PNG, JPEG, GIF, WebP, BMP support
- **Bidirectional** — PC → Phone and Phone → PC
- **Real-time** — Instant sync via WebSocket
- **iOS Shortcut** — One-tap send, no browser needed
- **Android HTTP Shortcuts** — Android support included
- **QR Code** — Connect phone in seconds
- **Token security** — UUID token valid for 1 month
- **RTF/HTML cleanup** — iOS formats auto-converted to plain text
- **Multi-language** — English and Uzbek UI
- **Cyrillic/Unicode** — Full support for all languages

## Installation

### Requirements

- [Node.js](https://nodejs.org/) (v16 or higher)
- Windows 10/11
- Phone and computer must be on the **same Wi-Fi** network

### 1. Clone the project

```bash
git clone https://github.com/SharofSoliyev/ClipboardSync.git
cd ClipboardSync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

Or double-click `start.bat`.

The browser opens automatically with QR code and dashboard.

## Usage

### Connect your phone

1. Start the server (`npm start` or `start.bat`)
2. Scan the **QR code** on the dashboard with your phone
3. Start syncing on the mobile page!

### iOS Shortcut (recommended)

Send clipboard to PC with one tap, no browser needed:

1. Open **Shortcuts** app on iPhone
2. Tap **"+"** to create new shortcut
3. **"Add Action"** → **"Get Clipboard"**
4. **"Add Action"** → **"Get Contents of URL"**
5. Set URL to the **Send URL** shown on dashboard
6. Configure **"Get Contents of URL"**:
   - **Method:** POST
   - **Request Body:** File
   - **File:** Clipboard
7. Name it and **"Add to Home Screen"**
8. Done! Copy anything → tap the icon → synced to PC!

> **Back Tap:** Settings → Accessibility → Touch → Back Tap → Double Tap → your Shortcut. Double-tap the back of your phone to send clipboard!

### Android

1. Install [HTTP Shortcuts](https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts) from Play Store
2. Create new shortcut with the **Send URL** from dashboard
3. Method: POST, Body: `{%clipboard}`
4. Add to home screen

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/send?token=TOKEN` | GET/POST | Send clipboard data (text, image, RTF, HTML) |
| `/api/get?token=TOKEN` | GET | Get PC clipboard (plain text) |
| `/api/clipboard?token=TOKEN` | GET/POST | Manage clipboard (JSON) |
| `/api/image?token=TOKEN` | GET | Last received image |
| `/api/qr` | GET | QR code and server info |
| `/api/shortcut` | GET | URLs for iOS Shortcut setup |
| `/api/info` | GET | Server status and connected devices |
| `/ws?token=TOKEN` | WebSocket | Real-time clipboard sync |

## Project Structure

```
ClipboardSync/
├── server.js          # Main server (Express + WebSocket)
├── package.json       # Dependencies
├── start.bat          # Quick start for Windows
├── config.json        # Token config (auto-generated)
├── LICENSE            # MIT License
├── CONTRIBUTING.md    # Contribution guide
├── public/
│   ├── index.html     # Dashboard (QR code, server info, setup guide)
│   └── mobile.html    # Mobile UI (sync, setup, history)
└── images/            # Temporary images folder
```

## Security

- Works only on local network (no internet exposure)
- Every connection is token-protected
- Token auto-renews after 1 month
- Images auto-deleted after 24 hours

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

## O'zbek tilida

# ClipSync

**Telefon va Windows kompyuter o'rtasida clipboard sinxronlash.**

Telefoningizda copy qilgan narsangiz bir zumda Windows clipboard'iga tushadi. Huddi Apple'ning Universal Clipboard'i — faqat Windows uchun.

## Xususiyatlari

- **Matn sinxronlash** — Telefondan copy qilgan matn Ctrl+V bilan ishlatiladi
- **Rasm sinxronlash** — PNG, JPEG, GIF, WebP, BMP qo'llab-quvvatlanadi
- **Ikki tomonlama** — PC → Telefon va Telefon → PC
- **Real-time** — WebSocket orqali bir zumda
- **iOS Shortcut** — Bitta tugma bilan yuborish
- **Android** — HTTP Shortcuts orqali
- **QR Code** — Telefonni tez ulash
- **Xavfsizlik** — UUID token, 1 oy amal qiladi
- **Ko'p tilli** — Ingliz va O'zbek tili
- **Kirill/Unicode** — Barcha tillar qo'llab-quvvatlanadi

## O'rnatish

### Talablar

- [Node.js](https://nodejs.org/) (v16+)
- Windows 10/11
- Telefon va kompyuter **bitta Wi-Fi** tarmoqda

### 1. Loyihani yuklab olish

```bash
git clone https://github.com/SharofSoliyev/ClipboardSync.git
cd ClipboardSync
```

### 2. Bog'liqliklarni o'rnatish

```bash
npm install
```

### 3. Ishga tushirish

```bash
npm start
```

Yoki `start.bat` faylni ikki marta bosing.

## Ishlatish

1. Serverni ishga tushiring
2. Dashboard'dagi **QR code**'ni telefoningiz bilan skanerlang
3. Clipboard sinxronlashni boshlang!

### iOS Shortcut (tavsiya etiladi)

1. **Shortcuts** ilovasini oching
2. **"+"** → **"Add Action"** → **"Get Clipboard"**
3. **"Add Action"** → **"Get Contents of URL"** → Dashboard'dagi Send URL
4. Method: **POST**, Request Body: **File**, File: **Clipboard**
5. **"Add to Home Screen"**
6. Tayyor! Copy qilib → ikonkani bosing → PCga tushadi!

> **Back Tap:** Settings → Accessibility → Touch → Back Tap → Double Tap → Shortcut. Telefonning orqasiga 2 marta tiqillatib clipboard yuborasiz!

### Android

1. [HTTP Shortcuts](https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts) o'rnating
2. Send URL bilan yangi shortcut yarating
3. Method: POST, Body: `{%clipboard}`
4. Home screen'ga qo'shing

## Litsenziya

[MIT](LICENSE)

---

Muallif: [SharofSoliyev](https://github.com/SharofSoliyev)
