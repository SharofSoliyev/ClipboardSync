# ClipSync

**Windows + iOS/Android o'rtasida clipboard sinxronlash.**

Bitta Wi-Fi tarmoqda bo'lganingizda telefoningizda copy qilgan narsangiz avtomatik Windows clipboard'iga tushadi. Huddi Apple'ning Universal Clipboard'i — faqat Windows uchun.

![ClipSync Dashboard](https://img.shields.io/badge/platform-Windows-blue) ![Node.js](https://img.shields.io/badge/runtime-Node.js-green) ![License](https://img.shields.io/badge/license-ISC-yellow)

## Xususiyatlari

- **Matn sinxronlash** — Telefondan copy qilgan matn darhol Windows'da Ctrl+V bilan ishlatiladi
- **Rasm sinxronlash** — PNG, JPEG, GIF, WebP, BMP rasmlar qo'llab-quvvatlanadi
- **Ikki tomonlama** — PC → Telefon va Telefon → PC
- **Real-time** — WebSocket orqali bir zumda sinxronlanadi
- **iOS Shortcut** — Brauzer ochmasdan bitta tugma bilan yuborish
- **Android HTTP Shortcuts** — Android uchun ham qo'llab-quvvatlaydi
- **QR Code** — Telefonni bir zumda ulash
- **Token xavfsizligi** — 1 oy amal qiladigan UUID token
- **RTF/HTML tozalash** — iOS'ning murakkab formatlarini avtomatik oddiy matnga aylantiradi
- **Kirill/Unicode** — Barcha tillar to'liq qo'llab-quvvatlanadi

## O'rnatish

### Talablar

- [Node.js](https://nodejs.org/) (v16 yoki undan yuqori)
- Windows 10/11
- Telefon va kompyuter **bitta Wi-Fi** tarmoqda bo'lishi kerak

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

Server ishga tushganda brauzer avtomatik ochiladi va QR code ko'rsatadi.

## Ishlatish

### Telefonni ulash

1. Serverni ishga tushiring (`npm start` yoki `start.bat`)
2. Brauzerda ochilgan dashboard'dagi **QR code**'ni telefoningiz bilan skanerlang
3. Telefon brauzerida ClipSync mobil sahifasi ochiladi

### iOS Shortcut orqali (tavsiya etiladi)

Brauzer ochmasdan bitta tugma bilan clipboard yuborish:

1. iPhone'da **Shortcuts** (Yorliqlar) ilovasini oching
2. **"+"** bosib yangi shortcut yarating
3. **"Add Action"** → **"Get Clipboard"** qo'shing
4. Yana **"Add Action"** → **"Get Contents of URL"** qo'shing
5. URL maydoniga dashboard'dagi **Send URL** manzilini yozing
6. **"Get Contents of URL"** sozlamalarida:
   - **Method:** POST
   - **Request Body:** File
   - **File:** Clipboard (oldingi action natijasi)
7. Shortcut'ga nom bering va **"Add to Home Screen"** qiling
8. Endi istalgan joyda copy qilib, home screen'dagi ikonkani bosasiz!

> **Back Tap:** Settings → Accessibility → Touch → Back Tap → Double Tap → Shortcut'ingizni tanlang. Endi telefonning orqasiga 2 marta tiqillatib clipboard yuborasiz.

### Android HTTP Shortcuts orqali

1. [HTTP Shortcuts](https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts) ilovasini o'rnating
2. Yangi shortcut yarating
3. URL: dashboard'dagi **Send URL** manzilini kiriting
4. Method: POST
5. Body: `{%clipboard}`
6. Home screen'ga qo'shing

### Mobil web sahifa orqali

QR code skanerlangandan keyin ochilgan sahifada:
- **"Bosing → Paste qiling"** tugmasini bosib clipboard yuborish
- Matn maydoniga yozib yuborish
- PC clipboard'ini ko'rish va telefonga nusxalash

## API Endpointlari

| Endpoint | Method | Tavsif |
|---|---|---|
| `/api/send?token=TOKEN` | GET/POST | Clipboard ma'lumot yuborish (matn, rasm, RTF, HTML) |
| `/api/get?token=TOKEN` | GET | PC clipboard'ini olish (plain text) |
| `/api/clipboard?token=TOKEN` | GET | PC clipboard'ini JSON formatda olish |
| `/api/clipboard?token=TOKEN` | POST | PC clipboard'iga matn yozish |
| `/api/qr` | GET | QR code va server ma'lumotlari |
| `/api/shortcut` | GET | iOS Shortcut uchun URL'lar |
| `/api/info` | GET | Server holati va ulangan qurilmalar soni |
| `/api/image?token=TOKEN` | GET | Oxirgi yuborilgan rasm |
| `/ws?token=TOKEN` | WebSocket | Real-time clipboard sinxronlash |

## Loyiha tuzilishi

```
ClipboardSync/
├── server.js          # Asosiy server (Express + WebSocket)
├── package.json       # Bog'liqliklar
├── start.bat          # Windows uchun tezkor ishga tushirish
├── config.json        # Token konfiguratsiyasi (avtomatik yaratiladi)
├── public/
│   ├── index.html     # Dashboard (QR code, server ma'lumotlari)
│   └── mobile.html    # Mobil UI (sync, sozlash, tarix)
└── images/            # Vaqtinchalik rasmlar papkasi
```

## Texnik tafsilotlar

- **Server:** Express.js + WebSocket (ws)
- **Clipboard:** clipboardy (Node.js clipboard API)
- **QR Code:** qrcode kutubxonasi
- **Rasmlar:** PowerShell orqali Windows clipboard'iga o'rnatiladi
- **RTF Parser:** iOS'dan keluvchi Rich Text Format'ni oddiy matnga aylantiruvchi maxsus parser
- **HTML Parser:** Link copy qilganda iOS yuboradigan HTML sahifadan URL ajratuvchi parser
- **Token:** UUID v4, config.json faylda saqlanadi, 1 oy amal qiladi
- **Port:** 3847 (standart)

## Xavfsizlik

- Faqat lokal tarmoqda ishlaydi (internetga chiqmaydi)
- Har bir ulanish token bilan himoyalangan
- Token 1 oydan keyin avtomatik yangilanadi
- Rasmlar 24 soatdan keyin avtomatik o'chiriladi

## Litsenziya

ISC

---

Muallif: [SharofSoliyev](https://github.com/SharofSoliyev)
