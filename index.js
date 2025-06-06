const express = require('express');
const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
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
  console.log('Scan this QR code with your phone:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp Web client is ready!');
});

client.initialize();

app.post('/send-buttons', async (req, res) => {
  const { to, text, buttons } = req.body;

  if (!to || !text || !buttons || !Array.isArray(buttons)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const btns = new Buttons(text, buttons);
    await client.sendMessage(to, btns);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send buttons' });
  }
});

app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
