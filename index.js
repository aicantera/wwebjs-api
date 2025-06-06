const express = require('express');
const { Client, LocalAuth, Buttons, MessageMedia, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const app = express();
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

client.on('qr', qr => {
  console.log('🟡 Scan this QR code:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp client is ready!');
});

client.on('auth_failure', msg => {
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Client was logged out:', reason);
});

client.initialize();

// ✅ Estado
app.get('/status', async (req, res) => {
  try {
    const info = await client.getState();
    res.json({ status: info });
  } catch {
    res.status(500).json({ error: 'Client not ready or disconnected.' });
  }
});

// ✅ Texto simple
app.post('/send-message', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing "to" or "message"' });

  try {
    await client.sendMessage(to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Botones
app.post('/send-buttons', async (req, res) => {
  const { to, text, buttons } = req.body;
  if (!to || !text || !buttons || !Array.isArray(buttons)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const btns = new Buttons(text, buttons);
    await client.sendMessage(to, btns);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Imagen
app.post('/send-image', async (req, res) => {
  const { to, imageUrl, caption } = req.body;
  if (!to || !imageUrl) return res.status(400).json({ error: 'Missing "to" or "imageUrl"' });

  try {
    const media = await MessageMedia.fromUrl(imageUrl);
    await client.sendMessage(to, media, { caption });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Audio
app.post('/send-audio', async (req, res) => {
  const { to, audioUrl } = req.body;
  if (!to || !audioUrl) return res.status(400).json({ error: 'Missing "to" or "audioUrl"' });

  try {
    const media = await MessageMedia.fromUrl(audioUrl);
    await client.sendMessage(to, media, { sendAudioAsVoice: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Lista
app.post('/send-list', async (req, res) => {
  const { to, title, body, buttonText, sections } = req.body;
  if (!to || !title || !body || !buttonText || !sections || !Array.isArray(sections)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  try {
    const list = new List(body, buttonText, sections, title, 'Selecciona una opción');
    await client.sendMessage(to, list);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Reenvío de mensaje
app.post('/forward', async (req, res) => {
  const { from, messageId, to } = req.body;
  if (!from || !messageId || !to) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const chat = await client.getChatById(from);
    const message = await chat.fetchMessages({ limit: 50 });
    const targetMessage = message.find(m => m.id.id === messageId);
    if (!targetMessage) throw new Error('Message not found');
    await targetMessage.forward(to);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 API running on http://localhost:3000');
});
