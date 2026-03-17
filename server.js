const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const clipboard = require('clipboardy').default || require('clipboardy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const IMAGES_DIR = path.join(__dirname, 'images');
const PORT = 3847;

// Images papkasini yaratish
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

// --- Config (token 1 oy amal qiladi) ---
function loadOrCreateConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const expiresAt = new Date(data.expiresAt);
    if (expiresAt > new Date() && data.token) {
      console.log('Mavjud token ishlatilmoqda (amal qilish:', expiresAt.toLocaleDateString(), ')');
      return data;
    }
  } catch {}
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  const config = { token, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('Yangi token yaratildi. Amal qilish:', expiresAt.toLocaleDateString());
  return config;
}

const config = loadOrCreateConfig();

// --- Local IP topish ---
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const LOCAL_IP = getLocalIP();
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;

// --- Clipboard tracking ---
let lastClipboard = '';
let lastImageFile = ''; // oxirgi rasm fayli
try { lastClipboard = clipboard.readSync(); } catch {}

// --- RTF dan oddiy matn ajratish (kirill/unicode qo'llab-quvvatlaydi) ---
function rtfToText(rtf) {
  if (typeof rtf !== 'string' || !rtf.startsWith('{\\rtf')) return rtf;

  const skipWords = ['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'listtable', 'listoverride'];
  let result = '';
  let depth = 0;
  let skipGroup = 0;
  let i = 0;
  let ucSkip = 1;

  while (i < rtf.length) {
    const ch = rtf[i];

    if (ch === '{') {
      depth++;
      const ahead = rtf.substring(i + 1, i + 30);
      for (const sw of skipWords) {
        if (ahead.startsWith('\\' + sw)) { skipGroup = depth; break; }
      }
      i++; continue;
    }
    if (ch === '}') {
      if (depth === skipGroup) skipGroup = 0;
      depth--; i++; continue;
    }
    if (skipGroup > 0) { i++; continue; }

    if (ch === '\\') {
      i++;
      if (i >= rtf.length) break;

      if (rtf[i] === "'") {
        const hex = rtf.substring(i + 1, i + 3);
        const code = parseInt(hex, 16);
        if (!isNaN(code)) result += String.fromCharCode(code);
        i += 3; continue;
      }
      if (rtf[i] === '\\' || rtf[i] === '{' || rtf[i] === '}') {
        result += rtf[i]; i++; continue;
      }

      let word = '';
      while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) { word += rtf[i]; i++; }
      let param = '';
      if (i < rtf.length && (rtf[i] === '-' || /\d/.test(rtf[i]))) {
        if (rtf[i] === '-') { param += '-'; i++; }
        while (i < rtf.length && /\d/.test(rtf[i])) { param += rtf[i]; i++; }
      }
      if (i < rtf.length && rtf[i] === ' ') i++;

      if (word === 'par' || word === 'line') result += '\n';
      else if (word === 'tab') result += '\t';
      else if (word === 'uc') ucSkip = parseInt(param) || 0;
      else if (word === 'u' && param) {
        let code = parseInt(param);
        if (code < 0) code += 65536;
        result += String.fromCharCode(code);
        for (let s = 0; s < ucSkip && i < rtf.length; s++) {
          if (rtf[i] === '\\') {
            i++;
            if (i < rtf.length && rtf[i] === "'") { i += 3; }
            else {
              while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) i++;
              while (i < rtf.length && /[\d-]/.test(rtf[i])) i++;
              if (i < rtf.length && rtf[i] === ' ') i++;
            }
          } else if (rtf[i] !== '{' && rtf[i] !== '}') { i++; }
          else break;
        }
      }
      continue;
    }
    if (ch === '\r' || ch === '\n') { i++; continue; }
    result += ch;
    i++;
  }
  return result.trim();
}

// --- HTML dan link ajratish (iOS link copy qilganda HTML yuboradi) ---
function extractFromHtml(html) {
  // og:url (attribute tartibidan qat'iy nazar)
  const ogUrl = html.match(/<meta\s+[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)
             || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
  if (ogUrl) return ogUrl[1];

  // canonical link
  const canon = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
             || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  if (canon) return canon[1];

  // HTML ichida URL qidirish (http/https)
  const urlMatch = html.match(/https?:\/\/[^\s"'<>]+/i);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  // Agar URL topilsa va u sahifaning o'zi bo'lsa - URL qaytarish
  if (urlMatch) return urlMatch[0];

  // Title fallback
  if (title) return title[1].trim();

  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
}

// --- Rasm aniqlovchi ---
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  // WebP: RIFF...WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.length > 11 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp';
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'bmp';
  return null;
}

// --- Rasmni Windows clipboard'iga qo'yish (PowerShell - asinxron) ---
function setImageToClipboard(imagePath, callback) {
  const absPath = path.resolve(imagePath).replace(/\//g, '\\');
  const psScript = path.join(os.tmpdir(), 'clipsync_img.ps1');
  const psContent = `Add-Type -AssemblyName System.Windows.Forms\nAdd-Type -AssemblyName System.Drawing\n$img = [System.Drawing.Image]::FromFile('${absPath}')\n[System.Windows.Forms.Clipboard]::SetImage($img)\n$img.Dispose()`;
  fs.writeFileSync(psScript, psContent.replace(/\\n/g, '\r\n'));
  if (callback) {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, { timeout: 15000 }, callback);
  } else {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, { timeout: 15000 });
  }
}

// --- Express server ---
const app = express();
const server = http.createServer(app);

// Server timeout va keep-alive sozlamalari (iOS timeout oldini olish)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.timeout = 120000;

// CORS - iOS/Android dan so'rovlarga ruxsat
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Token');
  res.header('Connection', 'keep-alive');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: 'text/*', limit: '50mb' }));
// Rasmlar uchun raw parser - katta limitli
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Health check - tez javob (timeout test uchun)
app.get('/api/ping', (req, res) => res.send('pong'));

app.use('/images', express.static(IMAGES_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Token tekshirish middleware
function authCheck(req, res, next) {
  const token = req.query.token || req.headers['x-token'];
  if (token !== config.token) {
    return res.status(401).json({ error: 'Noto\'g\'ri yoki muddati o\'tgan token' });
  }
  next();
}

// QR code endpoint
app.get('/api/qr', async (req, res) => {
  const mobileUrl = `${BASE_URL}/mobile.html?token=${config.token}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, { width: 400, margin: 2 });
    res.json({ qr: qrDataUrl, url: mobileUrl, ip: LOCAL_IP, port: PORT, expiresAt: config.expiresAt });
  } catch (err) {
    res.status(500).json({ error: 'QR yaratishda xatolik' });
  }
});

// Clipboard olish
app.get('/api/clipboard', authCheck, (req, res) => {
  try {
    const text = clipboard.readSync();
    res.json({ text, timestamp: Date.now() });
  } catch (err) {
    res.json({ text: '', timestamp: Date.now() });
  }
});

// Clipboard yozish (telefondan PCga)
app.post('/api/clipboard', authCheck, (req, res) => {
  const { text } = req.body;
  if (!text && text !== '') return res.status(400).json({ error: 'Text kerak' });
  try {
    clipboard.writeSync(text);
    broadcastClipboard(text, 'phone');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Clipboard yozishda xatolik' });
  }
});

// Server info
app.get('/api/info', (req, res) => {
  res.json({
    ip: LOCAL_IP, port: PORT,
    connectedDevices: wss.clients.size,
    expiresAt: config.expiresAt,
    lastImage: lastImageFile ? `${BASE_URL}/images/${path.basename(lastImageFile)}` : null
  });
});

// === ASOSIY SEND ENDPOINT (matn + rasm) ===
function handleSend(req, res) {
  let body = req.body;
  const ct = req.headers['content-type'] || '';
  const bodyLen = body ? (Buffer.isBuffer(body) ? body.length : (typeof body === 'string' ? body.length : 0)) : 0;
  console.log(`[SEND] ${req.method} | ${ct} | ${bodyLen} bytes`);

  // GET so'rov - query param dan matn
  if (req.method === 'GET' && req.query.text) {
    // Darhol javob ber, keyin clipboard yoz
    res.send('OK');
    try {
      clipboard.writeSync(req.query.text);
      lastClipboard = req.query.text;
      broadcastClipboard(req.query.text, 'phone');
      console.log('[SEND] Text:', req.query.text.substring(0, 50));
    } catch (err) {
      console.error('[SEND] Clipboard xato:', err.message);
    }
    return;
  }

  // Body ni Buffer ga aylantirish
  let buf = null;
  if (Buffer.isBuffer(body)) {
    buf = body;
  } else if (typeof body === 'string') {
    buf = Buffer.from(body, 'utf8');
  }

  // Rasm tekshirish
  if (buf && buf.length > 0) {
    const imgType = detectImageType(buf);
    if (imgType) {
      const filename = `clip_${Date.now()}.${imgType}`;
      const filepath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filepath, buf);
      lastImageFile = filepath;
      const imageUrl = `${BASE_URL}/images/${filename}`;

      // DARHOL javob ber — PowerShell fonda ishlaydi (iOS timeout bo'lmaydi)
      res.send('OK');
      broadcastImage(imageUrl, 'phone');

      setImageToClipboard(filepath, (err) => {
        if (err) console.error('[SEND] Rasm clipboard xato:', err.message);
        else console.log(`[SEND] Rasm: ${filename} (${(buf.length / 1024).toFixed(1)}KB)`);
      });
      return;
    }
  }

  // Matn
  let text = '';
  if (typeof body === 'string') {
    text = body;
  } else if (buf && buf.length > 0) {
    text = buf.toString('utf8');
  } else if (body && typeof body === 'object') {
    text = body.text || JSON.stringify(body);
  }
  text = text || req.query.text || '';

  // RTF formatni oddiy matnga aylantirish
  if (text.startsWith('{\\rtf')) {
    text = rtfToText(text);
    console.log('[SEND] RTF → text:', text.substring(0, 80));
  }

  // HTML formatni tozalash
  const trimmed = text.trimStart().toLowerCase();
  if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<meta') || trimmed.startsWith('<head')) {
    text = extractFromHtml(text);
    console.log('[SEND] HTML → extracted:', text.substring(0, 80));
  }

  if (!text) {
    return res.status(400).send('Text yoki rasm kerak');
  }

  // DARHOL javob ber, keyin clipboard yoz
  res.send('OK');
  try {
    clipboard.writeSync(text);
    lastClipboard = text;
    broadcastClipboard(text, 'phone');
    console.log('[SEND] Text:', text.substring(0, 50));
  } catch (err) {
    console.error('[SEND] Clipboard xato:', err.message);
  }
}

app.get('/api/send', authCheck, handleSend);
app.post('/api/send', authCheck, handleSend);

// PC clipboard olish (text)
app.get('/api/get', authCheck, (req, res) => {
  try {
    const text = clipboard.readSync();
    res.type('text/plain').send(text);
  } catch {
    res.type('text/plain').send('');
  }
});

// Oxirgi rasmni olish
app.get('/api/image', authCheck, (req, res) => {
  if (lastImageFile && fs.existsSync(lastImageFile)) {
    res.sendFile(lastImageFile);
  } else {
    res.status(404).send('Rasm yo\'q');
  }
});

// Shortcut link generatsiya
app.get('/api/shortcut', (req, res) => {
  const sendUrl = `${BASE_URL}/api/send?token=${config.token}`;
  const getUrl = `${BASE_URL}/api/get?token=${config.token}`;
  res.json({ sendUrl, getUrl, token: config.token, ip: LOCAL_IP, port: PORT });
});

// --- WebSocket ---
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  if (token !== config.token) { ws.close(4001, 'Unauthorized'); return; }

  clients.add(ws);
  console.log(`Qurilma ulandi. Jami: ${clients.size}`);

  try {
    const text = clipboard.readSync();
    ws.send(JSON.stringify({ type: 'clipboard', text, source: 'pc' }));
  } catch {}

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'clipboard' && msg.text !== undefined) {
        clipboard.writeSync(msg.text);
        lastClipboard = msg.text;
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'clipboard', text: msg.text, source: 'phone' }));
          }
        }
        console.log('Telefondan clipboard yangilandi');
      }
    } catch {}
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Qurilma uzildi. Jami: ${clients.size}`);
  });
});

function broadcastClipboard(text, source) {
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'clipboard', text, source }));
    }
  }
}

function broadcastImage(imageUrl, source) {
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'image', url: imageUrl, source }));
    }
  }
}

// --- Clipboard monitoring ---
setInterval(() => {
  try {
    const current = clipboard.readSync();
    if (current !== lastClipboard) {
      lastClipboard = current;
      broadcastClipboard(current, 'pc');
      console.log('PC clipboard o\'zgardi, telefonlarga yuborildi');
    }
  } catch {}
}, 500);

// --- Eski rasmlarni tozalash (1 kundan eski) ---
setInterval(() => {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    const now = Date.now();
    for (const file of files) {
      const filepath = path.join(IMAGES_DIR, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filepath);
      }
    }
  } catch {}
}, 60 * 60 * 1000);

// --- Start ---
server.listen(PORT, '0.0.0.0', async () => {
  console.log('');
  console.log('===========================================');
  console.log('   ClipSync - Clipboard Sync Server');
  console.log('   Matn + Rasm qo\'llab-quvvatlanadi');
  console.log('===========================================');
  console.log(`   IP:    ${LOCAL_IP}`);
  console.log(`   Port:  ${PORT}`);
  console.log(`   URL:   ${BASE_URL}`);
  console.log(`   Token muddati: ${new Date(config.expiresAt).toLocaleDateString()}`);
  console.log('===========================================');
  console.log('');
  console.log('Brauzer ochilmoqda...');

  try {
    const open = (await import('open')).default;
    open(`${BASE_URL}`);
  } catch {
    console.log(`Brauzerda oching: ${BASE_URL}`);
  }
});
