/**
 * Axe-core scanner for AWS Lambda
 * Uses @axe-core/puppeteer for simplified scanning
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { AxePuppeteer } = require('@axe-core/puppeteer');

/**
 * Runs axe-core accessibility checks on a URL
 * Returns raw axe results - let the main app handle score calculation
 */
async function scanUrl(url) {
  console.log(`Starting scan for: ${url}`);
  
  let browser = null;
  
  try {
    // Launch browser with Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('Browser launched');

    const page = await browser.newPage();
    
    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('Page loaded, running axe scan...');

    // Run axe-core using AxePuppeteer
    const results = await new AxePuppeteer(page).analyze();

    console.log('Scan completed');

    return {
      success: true,
      url,
      violations: results.violations || [],
      passes: results.passes || [],
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

module.exports = {
  scanUrl,
};
