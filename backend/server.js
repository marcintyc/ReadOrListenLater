import express from 'express';
import cors from 'cors';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
await fsp.mkdir(AUDIO_DIR, { recursive: true });
app.use('/audio', express.static(AUDIO_DIR));

function runCoquiTTS(text, outPath) {
  return new Promise((resolve, reject) => {
    // Ensure text length reasonable; Coqui CLI handles long text but we trim excessive length
    const safe = text.replace(/\s+/g, ' ').trim().slice(0, 20000);

    const args = [
      '--text', safe,
      '--out_path', outPath,
      // You may change model to a Polish-capable model; this is a common multilingual one
      '--model_name', 'tts_models/multilingual/multi-dataset/your_tts'
    ];

    const proc = spawn('tts', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Coqui TTS failed (${code}): ${stderr}`));
    });
  });
}

async function extractArticle(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const html = await page.content();
    const baseUri = await page.url();

    const dom = new JSDOM(html, { url: baseUri });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const title = article?.title?.trim() || (new URL(baseUri)).hostname;
    const textContent = article?.textContent?.trim() || '';

    return { title, text: textContent };
  } finally {
    await browser.close();
  }
}

app.post('/save', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    const { title, text } = await extractArticle(url);
    if (!text) {
      return res.status(422).json({ error: 'Nie udało się wyodrębnić treści' });
    }

    const id = uuidv4();
    const safeTitle = slugify(title, { lower: true, strict: true });
    const filename = `${safeTitle || 'audio'}-${id}.mp3`;
    const outPath = path.join(AUDIO_DIR, filename);

    await runCoquiTTS(text, outPath);

    const audioUrl = `/audio/${filename}`;
    return res.json({ title, text, audioUrl: `http://localhost:3000${audioUrl}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});