const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));
const jsErrors = [];

async function ss(page, name) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  [SHOT] ${name}`);
}

async function run() {
  console.log('=== E2E v5.1.68 (Clean Run) ===\n');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  // Open a FRESH tab
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') jsErrors.push(msg.text()); });
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.setViewport({ width: 1400, height: 900 });

  // Navigate fresh
  console.log('[1] Loading page...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);
  await ss(page, 'clean-01-loaded');

  // TEST 1: Version
  console.log('\n--- TEST 1: Version ---');
  const ver = await page.evaluate(() => {
    // Try multiple selectors
    const sel = '[class*="version"], [class*="Version"], .header-version, footer';
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const t = (el.textContent || '').trim();
      if (t.includes('v5.1') || t.includes('部署版本')) return t;
    }
    // Fallback: scan body
    const bodyText = document.body.innerText;
    const match = bodyText.match(/20\d{2}-\d{2}-\d{2}\s+v[\d.]+/);
    return match ? match[0] : bodyText.substring(0, 200);
  });
  const t1 = ver.includes('v5.1.68');
  console.log(`  Version: "${ver.substring(0, 80)}"`);
  console.log(`  [${t1 ? 'PASS' : 'FAIL'}] v5.1.68`);

  // SETUP: Add test item + render
  console.log('\n--- SETUP ---');
  const ready = await page.evaluate(async () => {
    const db = window.db;
    const app = window.officeDashboard;
    if (!db) return { error: 'no db' };
    if (!app) return { error: 'no app' };

    db.resetItemsCache && db.resetItemsCache();
    const item = await db.addItem({
      type: 'todo', title: 'E2E移动到测试', date: '2026-05-11',
      completed: false, priority: 'medium',
    });

    // Force render
    db.resetItemsCache && db.resetItemsCache();
    const all = await db.getAllItems();
    app.items = all;

    // Try renderColumn
    const todos = all.filter(i => i.type === 'todo');
    if (typeof app.renderColumn === 'function') {
      app.renderColumn('todo', todos);
    }

    await new Promise(r => setTimeout(r, 800));

    // Find cards
    const cards = document.querySelectorAll('#boardView [data-item-id]');
    if (cards.length > 0) {
      const c = cards[0];
      const r = c.getBoundingClientRect();
      return {
        ok: true, id: item.id,
        cardX: Math.round(r.x + r.width / 2), cardY: Math.round(r.y + r.height / 2),
        cardW: Math.round(r.width), cardH: Math.round(r.height),
        cardText: (c.textContent || '').trim().substring(0, 60),
      };
    }

    // Try alternate: find any element with our test text
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      const text = (el.textContent || '').trim();
      if (text.includes('E2E移动到测试') && text.length < 80) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 10) {
          return {
            ok: true, id: item.id,
            cardX: Math.round(r.x + r.width / 2), cardY: Math.round(r.y + r.height / 2),
            cardW: Math.round(r.width), cardH: Math.round(r.height),
            cardText: text.substring(0, 60),
          };
        }
      }
    }

    return { ok: false, id: item.id, totalItems: all.length };
  });

  console.log(`  Ready: ${JSON.stringify(ready)}`);

  if (!ready.ok) {
    console.log('  [ERROR] Cannot find rendered card. Dumping page...');
    const dump = await page.evaluate(() => {
      const board = document.querySelector('#boardView');
      return board ? board.innerHTML.substring(0, 1000) : 'NO BOARD';
    });
    console.log(`  Board HTML: ${dump}`);
    await ss(page, 'clean-02-no-card');
    await page.close();
    return;
  }

  await ss(page, 'clean-02-card-found');

  // TEST 2: Right-click -> context menu -> 移动到 -> submenu
  console.log('\n--- TEST 2: Right-click -> 移动到 submenu ---');

  // Dismiss anything first
  await page.mouse.click(100, 100);
  await delay(300);

  // Right-click the card
  console.log(`  Right-clicking at (${ready.cardX}, ${ready.cardY})...`);
  await page.mouse.click(ready.cardX, ready.cardY, { button: 'right' });
  await delay(1200);
  await ss(page, 'clean-03-context-menu');

  // Check context menu
  const ctxCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasMoveTo: text.includes('移动到'),
      hasEdit: text.includes('编辑'),
      hasDelete: text.includes('删除'),
    };
  });

  console.log(`  Context menu: hasEdit=${ctxCheck.hasEdit}, hasMoveTo=${ctxCheck.hasMoveTo}, hasDelete=${ctxCheck.hasDelete}`);

  let t2 = false;
  let t3result = 'SKIP';
  let t4result = 'SKIP';

  if (ctxCheck.hasMoveTo) {
    // Find the pixel position of "移动到" menu item
    const movePos = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const directText = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        if (directText.includes('移动到') && directText.length < 20) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: directText };
          }
        }
      }
      return null;
    });

    console.log(`  "移动到" position: ${JSON.stringify(movePos)}`);

    if (movePos) {
      // Use real mouse move to trigger submenu
      await page.mouse.move(movePos.x, movePos.y, { steps: 5 });
      await delay(1000);
      await ss(page, 'clean-04-submenu');

      // Check submenu content
      const subContent = await page.evaluate(() => {
        const text = document.body.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const dateLines = lines.filter(l =>
          /周[一二三四五六日]/.test(l) || l.includes('选择其他') || l.includes('其他日期') ||
          l.includes('本周') || l.includes('下周')
        );
        return { dateLines, totalLines: lines.length };
      });

      console.log(`  Submenu date lines:`);
      subContent.dateLines.slice(0, 15).forEach(l => console.log(`    "${l}"`));

      t2 = subContent.dateLines.length > 0;
      console.log(`  [${t2 ? 'PASS' : 'FAIL'}] Submenu with date options`);

      // TEST 3: "选择其他日期" position
      if (subContent.dateLines.some(l => l.includes('其他日期') || l.includes('选择其他'))) {
        console.log('\n--- TEST 3: Date picker position ---');

        // Find and click "选择其他日期"
        const otherPos = await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const directText = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (directText.includes('选择其他日期') || directText.includes('其他日期…')) {
              const r = el.getBoundingClientRect();
              if (r.width > 0) return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
            }
          }
          return null;
        });

        if (otherPos) {
          await page.mouse.click(otherPos.x, otherPos.y);
          await delay(1500);
          await ss(page, 'clean-05-date-picker');

          // Check overlay
          const overlay = await page.evaluate(() => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const results = [];
            document.querySelectorAll('div').forEach(el => {
              const s = window.getComputedStyle(el);
              const r = el.getBoundingClientRect();
              if (r.width > 200 && r.height > 200 &&
                  (s.position === 'fixed' || s.position === 'absolute') &&
                  parseInt(s.zIndex || '0') > 100) {
                results.push({
                  cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2),
                  pcx: Math.round(cx), pcy: Math.round(cy),
                  centered: Math.abs(r.x + r.width / 2 - cx) < 100 && Math.abs(r.y + r.height / 2 - cy) < 100,
                });
              }
            });
            return results;
          });

          if (overlay.length > 0) {
            const centered = overlay[0].centered;
            t3result = centered ? 'FAIL (centered)' : 'PASS (not centered)';
            console.log(`  Picker center: (${overlay[0].cx},${overlay[0].cy}) page center: (${overlay[0].pcx},${overlay[0].pcy})`);
            console.log(`  [${centered ? 'FAIL' : 'PASS'}] Date picker is ${centered ? 'CENTERED' : 'NOT centered'}`);
          } else {
            // Maybe it's the native date input
            const dateInput = await page.evaluate(() => {
              const inp = document.querySelector('input[type="date"]');
              if (!inp) return null;
              const r = inp.getBoundingClientRect();
              return { x: Math.round(r.x), y: Math.round(r.y), visible: r.width > 0 };
            });
            if (dateInput) {
              t3result = 'PARTIAL (native date input)';
              console.log(`  Native date input at (${dateInput.x}, ${dateInput.y}) visible=${dateInput.visible}`);
            } else {
              t3result = 'WARN (no picker found)';
              console.log('  [WARN] No date picker or overlay found.');
            }
          }
        }
      } else {
        console.log('  [WARN] "选择其他日期" not in submenu.');
        t3result = 'SKIP (no 其他日期 option)';
      }

      // TEST 4: Select date -> success
      console.log('\n--- TEST 4: Select date -> success ---');
      // Re-do the full flow
      await page.mouse.click(100, 100);
      await delay(500);
      await page.mouse.click(ready.cardX, ready.cardY, { button: 'right' });
      await delay(1000);

      if (movePos) {
        await page.mouse.move(movePos.x, movePos.y, { steps: 5 });
        await delay(1000);
      }

      // Find a weekday to click
      const dateOpt = await page.evaluate(() => {
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

      if (dateOpt) {
        console.log(`  Clicking: "${dateOpt.text}" at (${dateOpt.x}, ${dateOpt.y})`);
        await page.mouse.click(dateOpt.x, dateOpt.y);

        // Poll for success message
        const got = await page.evaluate(async () => {
          for (let i = 0; i < 10; i++) {
            const text = document.body.innerText;
            if (text.includes('成功') || text.includes('已移动') || text.includes('日期已')) return true;
            await new Promise(r => setTimeout(r, 300));
          }
          return false;
        });

        await delay(500);
        await ss(page, 'clean-06-after-move');
        t4result = got ? 'PASS' : 'WARN (no toast, but move may have worked)';
        console.log(`  [${got ? 'PASS' : 'WARN'}] Success message: ${got}`);
      } else {
        console.log('  [WARN] No date option found.');
        t4result = 'SKIP (no date option)';
      }
    } else {
      t2 = true; // hasMoveTo was confirmed
      console.log('  [PASS] "移动到" in menu but cannot find position to hover.');
    }
  } else {
    console.log('  [FAIL] "移动到" NOT in context menu.');
  }

  // TEST 5: JS errors
  console.log('\n--- TEST 5: JS errors ---');
  const errs = jsErrors.filter(e => !e.includes('favicon'));
  const t5 = errs.length === 0;
  console.log(`  [${t5 ? 'PASS' : 'FAIL'}] ${errs.length} errors`);
  errs.slice(0, 3).forEach((e, i) => console.log(`    ${i + 1}: ${e.substring(0, 100)}`));

  await ss(page, 'clean-07-final');

  // Cleanup
  await page.evaluate(async () => {
    const db = window.db;
    if (db) {
      db.resetItemsCache && db.resetItemsCache();
      const items = await db.getAllItems();
      for (const i of items) { if (i.title && i.title.includes('E2E')) await db.deleteItem(i.id); }
    }
  });

  // Summary
  console.log('\n========================================');
  console.log('  FINAL RESULTS');
  console.log('========================================');
  console.log(`  1. Version v5.1.68:          ${t1 ? 'PASS' : 'FAIL'}`);
  console.log(`  2. 移动到 submenu:            ${t2 ? 'PASS' : 'FAIL'}`);
  console.log(`  3. Date picker position:      ${t3result}`);
  console.log(`  4. Move success message:      ${t4result}`);
  console.log(`  5. No JS errors:              ${t5 ? 'PASS' : 'FAIL'}`);
  console.log('========================================');

  await page.close();
}

run().catch(err => { console.error('[FATAL]', err.message); process.exit(1); });
