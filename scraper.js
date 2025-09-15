// scraper.js
// Minimal LinkedIn scraper for Render
// Uses Playwright to fetch public posts

const express = require("express");
const bodyParser = require("body-parser");
const { chromium } = require("playwright");

const app = express();
app.use(bodyParser.json());

app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Extract content
    const content = await page.evaluate(() => {
      const el = document.querySelector("article") || document.querySelector("[data-urn]");
      return el ? el.innerText : "";
    });

    // Extract author
    const author = await page.evaluate(() => {
      const el = document.querySelector('a[href*="/in/"], a[href*="/company/"]');
      return el ? el.innerText.trim() : "";
    });

    // Extract likes
    const likes = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="like"], [data-test-like-count]');
      return el ? el.innerText.replace(/\D/g, "") : "0";
    });

    // Extract comments
    const comments = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="comment"], [data-test-comment-count]');
      return el ? el.innerText.replace(/\D/g, "") : "0";
    });

    // Extract shares
    const shares = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="repost"], [data-test-repost-count]');
      return el ? el.innerText.replace(/\D/g, "") : "0";
    });

    // Extract date
    const date = await page.evaluate(() => {
      const el = document.querySelector("time");
      return el ? el.getAttribute("datetime") : "";
    });

    await browser.close();

    return res.json({
      url,
      content,
      author,
      likes: Number(likes),
      comments: Number(comments),
      shares: Number(shares),
      date,
    });
  } catch (err) {
    await browser.close();
    console.error("Scrape error:", err);
    return res.status(500).json({ error: "Scrape failed", details: String(err) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Scraper running on port ${PORT}`));
