const express = require('express');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');

const app = express();
app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const content = await page.evaluate(() => {
      const article = document.querySelector('article') || document.querySelector('[data-urn]');
      return article ? article.innerText : document.body.innerText.slice(0, 2000);
    });

    const likes = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="like"], [data-test-like-count]');
      return el ? el.innerText.replace(/\D/g,'') || '0' : '0';
    }).catch(()=> '0');

    const comments = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="comment"], [data-test-comment-count]');
      return el ? el.innerText.replace(/\D/g,'') || '0' : '0';
    }).catch(()=> '0');

    const author = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/in/"], a[href*="/company/"]');
      return a ? a.innerText : '';
    }).catch(()=> '');

    await browser.close();

    return res.json({
      content: content || '',
      author: author || '',
      likes: Number(likes) || 0,
      comments: Number(comments) || 0,
      shares: 0,
      date: ''
    });

  } catch (err) {
    await browser.close();
    console.error('Scrape error', err);
    return res.status(500).json({ error: 'Scrape failed', details: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Scraper running on port', PORT));
