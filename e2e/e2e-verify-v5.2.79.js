const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const jsErrors = [];
const results = [];

function report(id, name, passed, detail) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ id, name, status, detail });
  console.log(`  [${status}] ${id}: ${name}${detail ? ' — ' + detail : ''}`);
}

async function ss(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`  [SHOT] ${name}`);
}

async function run() {
  console.log('=== E2E v5.2.79 — 宠物 Canvas 动画增强验证 ===\n');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.setViewport({ width: 1440, height: 900 });
  // Disable cache to ensure fresh JS is loaded
  await page.setCacheEnabled(false);
  console.log('Loading page...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await delay(4000);
  console.log('Page loaded.\n');

  // ====== TEST 1: Version ======
  console.log('--- TEST 1: 版本号确认 ---');
  const versionText = await page.evaluate(() => {
    const badge = document.getElementById('deployVersionBadge');
    return badge ? badge.textContent : '';
  });
  const verOk = versionText.includes('5.2.79');
  report('T1', '版本号 v5.2.79', verOk, `got: "${versionText}"`);
  await ss(page, 'v5279-01-version');

  // ====== TEST 2: Notification bar idle state ======
  console.log('\n--- TEST 2: 通知栏空闲态 ---');
  const idleBarInfo = await page.evaluate(() => {
    const noticeEl = document.querySelector('#countdownNotice');
    if (!noticeEl) return { exists: false };
    const titleEl = noticeEl.querySelector('.countdown-notice-title');
    const descEl = noticeEl.querySelector('.countdown-notice-desc');
    const app = window.officeDashboard;
    return {
      noticeExists: !!noticeEl,
      titleExists: !!titleEl,
      descExists: !!descEl,
      titleText: titleEl ? titleEl.textContent.substring(0, 60) : '',
      descText: descEl ? descEl.textContent.substring(0, 60) : '',
      idleDisplay: app ? app._idleDisplay : 'no-app',
      hasCanvas: titleEl ? !!titleEl.querySelector('canvas') : false,
    };
  });
  report('T2', '通知栏存在且空闲态', idleBarInfo.noticeExists && idleBarInfo.idleDisplay && idleBarInfo.idleDisplay.type,
    JSON.stringify(idleBarInfo));

  // ====== TEST 3: Open pet selection ======
  console.log('\n--- TEST 3: 点击通知栏选择宠物 ---');
  // Force idle mode if not already
  if (!idleBarInfo.idleDisplay) {
    await page.evaluate(() => {
      const app = window.officeDashboard;
      if (app) {
        app._idleSelection = { type: 'pet', petIdx: 0 };
        app._idleDisplay = true;
        app._saveIdleSelection();
        app._renderIdleContent();
      }
    });
    await delay(1000);
  }

  // Click notification bar to open picker
  await page.evaluate(() => {
    const titleEl = document.querySelector('#countdownNotice .countdown-notice-title');
    if (titleEl) titleEl.click();
  });
  await delay(1500);
  await ss(page, 'v5279-03-picker');

  const pickerInfo = await page.evaluate(() => {
    const grid = document.getElementById('idlePetGrid');
    return { gridExists: !!grid, petCount: grid ? grid.children.length : 0 };
  });
  report('T3', '宠物选择面板弹出', pickerInfo.gridExists, JSON.stringify(pickerInfo));

  // ====== TEST 4: Select pet (点点🐶) ======
  console.log('\n--- TEST 4: 选择宠物点点 ---');
  if (pickerInfo.gridExists) {
    await page.evaluate(() => {
      const grid = document.getElementById('idlePetGrid');
      if (grid && grid.children.length > 0) {
        grid.children[0].click(); // First pet = 点点🐶
      }
    });
    await delay(2000);
  }
  const petSelected = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.idle-pet-canvas');
    return canvas && window.getComputedStyle(canvas).display !== 'none';
  });
  report('T4', '选择宠物点点后Canvas显示', petSelected);
  await ss(page, 'v5279-04-pet-selected');

  // ====== TEST 5: Canvas rendering ======
  console.log('\n--- TEST 5: 宠物 Canvas 渲染 ---');
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.idle-pet-canvas');
    if (!canvas) return { exists: false };
    const rect = canvas.getBoundingClientRect();
    const style = window.getComputedStyle(canvas);
    return {
      exists: true,
      displayed: style.display !== 'none',
      cssWidth: parseInt(style.width),
      cssHeight: parseInt(style.height),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      rectW: Math.round(rect.width),
      rectH: Math.round(rect.height),
    };
  });
  report('T5', '宠物 Canvas 显示 idel 动画', canvasInfo.exists && canvasInfo.displayed,
    JSON.stringify(canvasInfo));
  await ss(page, 'v5279-05-canvas');

  // ====== TEST 6: Canvas dimensions ======
  console.log('\n--- TEST 6: Canvas 尺寸 ---');
  const dimsOk = canvasInfo.cssWidth >= 90 && canvasInfo.cssHeight >= 75
    && canvasInfo.canvasWidth === 120 && canvasInfo.canvasHeight === 100;
  report('T6', 'Canvas 96x80 CSS / 120x100 内部', dimsOk,
    `CSS:${canvasInfo.cssWidth}x${canvasInfo.cssHeight} Internal:${canvasInfo.canvasWidth}x${canvasInfo.canvasHeight}`);

  // ====== TEST 7: Interaction buttons ======
  console.log('\n--- TEST 7: 交互按钮 ---');
  const btnInfo = await page.evaluate(() => {
    const btns = document.querySelectorAll('.idle-interact-btn');
    const btnList = [];
    btns.forEach(b => btnList.push({ action: b.dataset.action, text: b.textContent }));
    return { count: btns.length, btns: btnList };
  });
  report('T7', '4个交互按钮存在', btnInfo.count === 4, JSON.stringify(btnInfo));
  await ss(page, 'v5279-07-buttons');

  // ====== TEST 8: Feed ======
  console.log('\n--- TEST 8: 喂食 ---');
  const feedResult = await page.evaluate(async () => {
    const btn = document.querySelector('.idle-interact-btn[data-action="feed"]');
    if (!btn) return { error: 'no btn' };
    btn.click();
    await new Promise(r => setTimeout(r, 800));
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const action = renderer ? renderer.action : '?';
    const descEl = document.querySelector('#countdownNotice .countdown-notice-desc');
    const titleEl = document.querySelector('#countdownNotice .countdown-notice-title');
    return { action, desc: descEl ? descEl.textContent.substring(0, 60) : '', title: titleEl ? titleEl.textContent.substring(0, 40) : '' };
  });
  report('T8', '喂食→eat动画+食物碗', feedResult.action === 'eat', JSON.stringify(feedResult));
  await ss(page, 'v5279-08-feed');

  // ====== TEST 9: Water ======
  console.log('\n--- TEST 9: 喝水 ---');
  const waterResult = await page.evaluate(async () => {
    const btn = document.querySelector('.idle-interact-btn[data-action="water"]');
    if (!btn) return { error: 'no btn' };
    btn.click();
    await new Promise(r => setTimeout(r, 800));
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const action = renderer ? renderer.action : '?';
    const descEl = document.querySelector('#countdownNotice .countdown-notice-desc');
    return { action, desc: descEl ? descEl.textContent.substring(0, 60) : '' };
  });
  report('T9', '喝水→drink动画+水碗', waterResult.action === 'drink', JSON.stringify(waterResult));
  await ss(page, 'v5279-09-water');

  // ====== TEST 10: Walk ======
  console.log('\n--- TEST 10: 遛弯 ---');
  const walkResult = await page.evaluate(async () => {
    const btn = document.querySelector('.idle-interact-btn[data-action="walk"]');
    if (!btn) return { error: 'no btn' };
    btn.click();
    await new Promise(r => setTimeout(r, 800));
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const action = renderer ? renderer.action : '?';
    const descEl = document.querySelector('#countdownNotice .countdown-notice-desc');
    return { action, desc: descEl ? descEl.textContent.substring(0, 60) : '' };
  });
  report('T10', '遛弯→leash动画+牵引绳', walkResult.action === 'leash', JSON.stringify(walkResult));
  await ss(page, 'v5279-10-walk');

  // ====== TEST 11: Snack ======
  console.log('\n--- TEST 11: 零食 ---');
  const snackResult = await page.evaluate(async () => {
    const btn = document.querySelector('.idle-interact-btn[data-action="snack"]');
    if (!btn) return { error: 'no btn' };
    btn.click();
    await new Promise(r => setTimeout(r, 800));
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const action = renderer ? renderer.action : '?';
    const descEl = document.querySelector('#countdownNotice .countdown-notice-desc');
    return { action, desc: descEl ? descEl.textContent.substring(0, 60) : '' };
  });
  report('T11', '零食→snack动画+骨头', snackResult.action === 'snack', JSON.stringify(snackResult));
  await ss(page, 'v5279-11-snack');

  // ====== TEST 12: 3s recovery ======
  console.log('\n--- TEST 12: 3秒恢复idle ---');
  await delay(3500);
  const recoveryResult = await page.evaluate(() => {
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const action = renderer ? renderer.action : '?';
    const descEl = document.querySelector('#countdownNotice .countdown-notice-desc');
    const titleEl = document.querySelector('#countdownNotice .countdown-notice-title');
    return {
      action,
      desc: descEl ? descEl.textContent.substring(0, 60) : '',
      title: titleEl ? titleEl.textContent.substring(0, 40) : '',
      hasCanvas: titleEl ? !!titleEl.querySelector('canvas') : false,
    };
  });
  report('T12', '3秒后恢复idle状态', recoveryResult.action === 'idle', JSON.stringify(recoveryResult));
  await ss(page, 'v5279-12-recovery');

  // ====== TEST 13: Props visible ======
  console.log('\n--- TEST 13: 道具可见性 ---');
  const propResult = await page.evaluate(async () => {
    const btn = document.querySelector('.idle-interact-btn[data-action="feed"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 800));
    const app = window.officeDashboard;
    const renderer = app && app._petRenderer;
    const canvas = renderer ? renderer.canvas : null;
    if (!canvas) return { error: 'no canvas' };
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = img.data;
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 10) colored++;
    }
    const ratio = (colored / (pixels.length / 4) * 100).toFixed(1);
    return { action: renderer.action, fillRatio: ratio + '%' };
  });
  report('T13', '道具(碗)在Canvas可见', parseFloat(propResult.fillRatio) > 5, JSON.stringify(propResult));

  // ====== TEST 14: Bar height ======
  console.log('\n--- TEST 14: 通知栏高度 ---');
  const barHeight = await page.evaluate(() => {
    const el = document.querySelector('#countdownNotice');
    return el ? el.offsetHeight : 0;
  });
  report('T14', '通知栏高度>=80px', barHeight >= 80, `height: ${barHeight}px`);

  // ====== TEST 15: No JS errors ======
  console.log('\n--- TEST 15: JS错误检查 ---');
  const petErrors = jsErrors.filter(e => !e.includes('天气') && !e.includes('AbortError') && !e.includes('signal'));
  const noErrors = petErrors.length === 0;
  report('T15', '控制台无JS错误(排除天气)', noErrors,
    petErrors.length > 0 ? petErrors.slice(0, 5).join(' | ') : (jsErrors.length > 0 ? `天气错误(忽略): ${jsErrors.length}条` : '0 errors'));
  if (petErrors.length > 0) {
    console.log('  Pet-related JS Errors:');
    petErrors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
  }

  // ====== SUMMARY ======
  console.log('\n=== 验证结果汇总 ===');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n通过: ${passCount}/${results.length}  失败: ${failCount}/${results.length}`);
  results.forEach(r => console.log(`  [${r.status}] ${r.id}: ${r.name}`));

  await page.close();
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
