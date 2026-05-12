const puppeteer = require('puppeteer-core');
const path = require('path');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));

const jsErrors = [];
const consoleLogs = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  [SHOT] ${name}.png`);
}

async function runTests() {
  console.log('=== E2E v5.1.68 Final Verification ===\n');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  } catch (e) { console.log('[ERROR] No Chrome.'); process.exit(1); }

  let page = (await browser.pages())[0] || await browser.newPage();
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') jsErrors.push(text);
    if (text.includes('移动') || text.includes('成功') || text.includes('日期') ||
        text.includes('context') || text.includes('menu') || text.includes('move')) {
      consoleLogs.push(`[${msg.type()}] ${text.substring(0, 120)}`);
    }
  });
  page.on('pageerror', err => jsErrors.push(err.message));

  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);

  // ===== TEST 1: Version =====
  console.log('--- TEST 1: Version ---');
  const ver = await page.evaluate(() => {
    const el = document.querySelector('[class*="version"]');
    return el ? el.textContent.trim() : '';
  });
  const t1 = ver.includes('v5.1.68') && ver.includes('2026-05-11');
  console.log(`  "${ver}" => ${t1 ? 'PASS' : 'FAIL'}`);
  await screenshot(page, 'final-01-version');

  // ===== SETUP =====
  console.log('\n--- SETUP ---');
  const setup = await page.evaluate(async () => {
    const db = window.db;
    const app = window.officeDashboard;
    if (!db || !app) return { error: 'missing db/app' };

    db.resetItemsCache && db.resetItemsCache();
    const item = await db.addItem({
      type: 'todo', title: 'E2E-移动到测试', date: '2026-05-11',
      completed: false, priority: 'medium',
    });

    app.items = await db.getAllItems();
    app.renderColumn && app.renderColumn('todo', app.items.filter(i => i.type === 'todo'));

    await new Promise(r => setTimeout(r, 500));

    const cards = document.querySelectorAll('#boardView [data-item-id]');
    return { id: item.id, cards: cards.length };
  });
  console.log(`  Item ${setup.id}, cards: ${setup.cards}`);
  await delay(500);

  // Find card position
  const card = await page.evaluate(() => {
    const c = document.querySelector('#boardView [data-item-id]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });

  if (!card) {
    console.log('  [FATAL] No card found. Aborting.');
    return;
  }

  // ===== TEST 2: Right-click -> submenu =====
  console.log('\n--- TEST 2: Right-click -> 移动到 submenu ---');
  await page.mouse.click(50, 50);
  await delay(300);
  await page.mouse.click(card.x, card.y, { button: 'right' });
  await delay(1000);
  await screenshot(page, 'final-02-context-menu');

  // Check menu content
  const menuContent = await page.evaluate(() => {
    const menus = document.querySelectorAll('[class*="context-menu"], [class*="contextMenu"], [class*="ctx-menu"]');
    for (const m of menus) {
      const r = m.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return (m.textContent || '').trim();
    }
    return '';
  });
  const hasMoveTo = menuContent.includes('移动到');
  console.log(`  Menu has "移动到": ${hasMoveTo}`);
  console.log(`  [${hasMoveTo ? 'PASS' : 'FAIL'}] 移动到 menu item`);

  // Trigger submenu: use puppeteer mouse move to hover
  // Find the exact pixel position of "移动到" menu item
  const moveToPos = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const direct = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (direct.includes('移动到') && direct.length < 20) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: direct };
        }
      }
    }
    return null;
  });

  console.log(`  [INFO] "移动到" position: ${JSON.stringify(moveToPos)}`);

  if (moveToPos) {
    // Use actual mouse movement to trigger CSS :hover or JS mouseenter
    await page.mouse.move(moveToPos.x, moveToPos.y);
    await delay(500);
    await page.mouse.move(moveToPos.x + 2, moveToPos.y + 1);
    await delay(800);
    await screenshot(page, 'final-03-submenu-hover');

    // Check submenu appeared
    const submenuContent = await page.evaluate(() => {
      const text = document.body.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      // Find date lines
      const dateLines = lines.filter(l =>
        /周[一二三四五六日]/.test(l) || l.includes('选择其他') || l.includes('其他日期') ||
        l.includes('本周') || l.includes('下周') || /\d+月\d+日/.test(l)
      );
      return dateLines.slice(0, 20);
    });

    console.log(`  [INFO] Submenu date lines: ${submenuContent.length}`);
    submenuContent.forEach(l => console.log(`    "${l}"`));

    const hasSubmenu = submenuContent.length > 0;
    console.log(`  [${hasSubmenu ? 'PASS' : 'FAIL'}] Submenu with date options`);

    // ===== TEST 3: "选择其他日期" position =====
    console.log('\n--- TEST 3: Date picker position ---');
    const hasOtherDate = submenuContent.some(l => l.includes('选择其他') || l.includes('其他日期'));
    console.log(`  Has "选择其他日期": ${hasOtherDate}`);

    if (hasOtherDate) {
      // Find and click "选择其他日期"
      const otherPos = await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const direct = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
          if (direct.includes('选择其他日期') || direct.includes('其他日期…')) {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
          }
        }
        return null;
      });

      if (otherPos) {
        await page.mouse.click(otherPos.x, otherPos.y);
        await delay(1500);
        await screenshot(page, 'final-04-date-picker');

        // Check overlay position
        const pickerPos = await page.evaluate(() => {
          const vw = window.innerWidth / 2;
          const vh = window.innerHeight / 2;
          const results = [];
          document.querySelectorAll('div').forEach(el => {
            const s = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (r.width > 200 && r.height > 200 &&
                (s.position === 'fixed' || s.position === 'absolute') &&
                parseInt(s.zIndex || '0') > 100) {
              results.push({
                cls: (el.className || '').toString().substring(0, 40),
                cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2),
                pageCx: Math.round(vw), pageCy: Math.round(vh),
                centered: Math.abs(r.x + r.width / 2 - vw) < 100 && Math.abs(r.y + r.height / 2 - vh) < 100,
              });
            }
          });
          return results;
        });

        if (pickerPos.length > 0) {
          pickerPos.forEach(p => {
            console.log(`  Picker: (${p.cx},${p.cy}) vs center (${p.pageCx},${p.pageCy}) => ${p.centered ? 'CENTERED (FAIL)' : 'NOT centered (PASS)'}`);
          });
        } else {
          console.log('  [WARN] No overlay found. Checking inline date input...');
          const inputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input[type="date"]')).map(inp => {
              const r = inp.getBoundingClientRect();
              return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
            });
          });
          console.log(`  Date inputs: ${JSON.stringify(inputs)}`);
        }
      }
    } else {
      console.log('  [WARN] "选择其他日期" not found in submenu.');
    }

    // ===== TEST 4: Select date -> success =====
    console.log('\n--- TEST 4: Select date -> success ---');
    // Dismiss, re-open
    await page.mouse.click(50, 50);
    await delay(500);
    await page.mouse.click(card.x, card.y, { button: 'right' });
    await delay(1000);

    // Hover on 移动到
    if (moveToPos) {
      await page.mouse.move(moveToPos.x, moveToPos.y);
      await delay(800);
    }

    // Click a date
    const dateClickResult = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const text = (el.textContent || '').trim();
        if (el.children.length === 0 && /^周[一二三四五六日]/.test(text) && text.length < 25) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { text, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
          }
        }
      }
      return null;
    });

    if (dateClickResult) {
      console.log(`  Clicking: "${dateClickResult.text}" at (${dateClickResult.x}, ${dateClickResult.y})`);
      await page.mouse.click(dateClickResult.x, dateClickResult.y);

      // Watch for toast/message in the next 3 seconds
      const toastFound = await page.evaluate(async () => {
        const check = () => {
          const text = document.body.innerText;
          return text.includes('成功') || text.includes('已移动') || text.includes('日期已') || text.includes('已移');
        };
        // Poll for 3 seconds
        for (let i = 0; i < 6; i++) {
          if (check()) return true;
          await new Promise(r => setTimeout(r, 500));
        }
        return false;
      });

      await delay(500);
      await screenshot(page, 'final-05-after-move');
      console.log(`  [${toastFound ? 'PASS' : 'WARN'}] Success message: ${toastFound}`);
    } else {
      console.log('  [WARN] No date option found to click.');
    }
  }

  // ===== TEST 5: JS errors =====
  console.log('\n--- TEST 5: JS errors ---');
  const realErrs = jsErrors.filter(e => !e.includes('favicon'));
  console.log(`  [${realErrs.length === 0 ? 'PASS' : 'FAIL'}] Errors: ${realErrs.length}`);
  realErrs.slice(0, 5).forEach((e, i) => console.log(`    ${i + 1}: ${e.substring(0, 100)}`));

  if (consoleLogs.length > 0) {
    console.log('\n  Relevant console logs:');
    consoleLogs.slice(0, 10).forEach(l => console.log(`    ${l}`));
  }

  await screenshot(page, 'final-06-end');

  // Cleanup
  await page.evaluate(async () => {
    const db = window.db;
    if (db) {
      db.resetItemsCache && db.resetItemsCache();
      const items = await db.getAllItems();
      for (const i of items) { if (i.title && i.title.includes('E2E')) await db.deleteItem(i.id); }
    }
  });

  console.log('\n=== COMPLETE ===');
}

runTests().catch(err => { console.error('[FATAL]', err.message); process.exit(1); });
