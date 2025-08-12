import express from 'express';
import cors from 'cors';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import puppeteer from 'puppeteer';
import fetch from 'cross-fetch';
import fsp from 'fs/promises';
import fs from 'fs';
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

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
const ELEVEN_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

async function synthesizeWithElevenLabs(text, outPath) {
  if (!ELEVEN_API_KEY) {
    throw new Error('Missing ELEVENLABS_API_KEY');
  }
  const safe = text.replace(/\s+/g, ' ').trim().slice(0, 4000);
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVEN_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: safe,
      model_id: ELEVEN_MODEL_ID,
      voice_settings: { stability: 0.4, similarity_boost: 0.8 }
    })
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${msg}`);
  }
  const fileStream = fs.createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

function parseWithReadability(html, baseUrl) {
  const dom = new JSDOM(html, { url: baseUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const title = article?.title?.trim() || (new URL(baseUrl)).hostname;
  const textContent = article?.textContent?.trim() || '';
  return { title, text: textContent };
}

async function extractWithFetch(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9'
    },
    redirect: 'follow',
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('text/html')) {
    throw new Error(`Fetch fallback failed: ${res.status}`);
  }
  const html = await res.text();
  const finalUrl = res.url || url;
  return parseWithReadability(html, finalUrl);
}

async function extractArticle(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: puppeteer.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

    // Block heavy resources to speed up and avoid timeouts
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
        return req.abort();
      }
      return req.continue();
    });

    page.setDefaultNavigationTimeout(120000);
    // First try fast DOMContentLoaded
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // Then give a brief idle to settle async content
    try {
      await page.waitForNetworkIdle({ timeout: 3000 });
    } catch {}

    const html = await page.content();
    const baseUri = page.url();
    return parseWithReadability(html, baseUri);
  } catch (err) {
    // Fallback to simple fetch + readability
    console.warn('Puppeteer failed, falling back to fetch:', err?.message);
    return await extractWithFetch(url);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

app.post('/save', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    const { title, text } = await extractArticle(url);
    if (!text) {
      return res.status(422).json({ error: 'Content extraction failed' });
    }

    const id = uuidv4();
    const safeTitle = slugify(title, { lower: true, strict: true });
    const filename = `${safeTitle || 'audio'}-${id}.mp3`;
    const outPath = path.join(AUDIO_DIR, filename);

    await synthesizeWithElevenLabs(text, outPath);

    const audioPath = `/audio/${filename}`;
    const absolute = `${req.protocol}://${req.get('host')}${audioPath}`;
    return res.json({ title, text, audioUrl: absolute });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});