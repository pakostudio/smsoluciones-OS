import { chromium } from '/Users/pakostudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox']
});

const sizes = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

try {
  const results = [];
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForSelector('#user-sel .usbtn', { timeout: 12000 });
      const administrator = page.locator('#user-sel .usbtn').filter({ hasText: 'Administrador' }).first();
      await administrator.click();
      await page.locator('#f-pin').fill('0000#$');
      await page.locator('#btn-login').click();
      await page.waitForSelector('#app', { state: 'visible', timeout: 12000 });
      const hasMontescano = () => page.evaluate(() => DB.proyectos.some(p => /MONTESCANO/i.test(p.nombre || '')));
      if (!(await hasMontescano())) {
        await page.locator('#btn-refresh-data').click();
        await page.waitForFunction(() => DB.proyectos.some(p => /MONTESCANO/i.test(p.nombre || '')), { timeout: 12000 });
      }
      await page.evaluate(() => {
        const project = DB.proyectos.find(p => /MONTESCANO/i.test(p.nombre || ''));
        if (!project) throw new Error('MONTESCANO no encontrado');
        A.openProject(project.id, 'objetivos');
      });
      await page.waitForSelector('.objectives-map', { timeout: 12000 });
      const metrics = await page.evaluate(() => ({
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        contentOverflow: Math.max(0, document.querySelector('.content').scrollWidth - document.querySelector('.content').clientWidth),
        cards: document.querySelectorAll('.objective-card').length,
        tabs: document.querySelectorAll('.tabs .tab').length,
        route: document.querySelector('.objective-route')?.innerText || '',
        text: document.querySelector('.objectives-map')?.innerText.slice(0, 240) || ''
      }));
      await page.screenshot({ path: `/tmp/sm-objectives-${size.name}.png`, fullPage: true });
      results.push({ size: size.name, errors, ...metrics });
      fs.writeFileSync('/tmp/sm-objectives-qa.json', JSON.stringify(results, null, 2));
      if (errors.length || metrics.bodyOverflow > 2 || metrics.contentOverflow > 1 || metrics.cards < 1 || metrics.tabs < 10) process.exitCode = 1;
    } catch (error) {
      await page.screenshot({ path: `/tmp/sm-objectives-${size.name}-error.png`, fullPage: true }).catch(() => {});
      results.push({ size: size.name, errors, failure: error.message, url: page.url(), text: (await page.locator('body').innerText().catch(() => '')).slice(0, 500) });
      fs.writeFileSync('/tmp/sm-objectives-qa.json', JSON.stringify(results, null, 2));
      process.exitCode = 1;
    }
    await page.close();
  }
  fs.writeFileSync('/tmp/sm-objectives-qa.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
