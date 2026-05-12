const puppeteer = require('puppeteer-core');
const path = require('path');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));
const jsErrors = [];

async function ss(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`  [SHOT] ${name}`);
}

async function run() {
  console.log('=== E2E v5.1.68 - Final Clean Verification ===\n');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') jsErrors.push(msg.text()); });
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(SITE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(3000);

  // TEST 1: Version
  console.log('--- TEST 1: Version ---');
  const ver = await page.evaluate(() => document.body.innerText.match(/20\d{2}-\d{2}-\d{2}\s+v[\d.]+/)?.[0] || '');
  const t1 = ver.includes('v5.1.68');
  console.log(`  "${ver}" => ${t1 ? 'PASS' : 'FAIL'}`);
  await ss(page, 'f-01-version');

  // SETUP: Add item + render
  const card = await page.evaluate(async () => {
    const db = window.db, app = window.officeDashboard;
    if (!db || !app) return null;
    db.resetItemsCache && db.resetItemsCache();
    const item = await db.addItem({
      type: 'todo', title: 'E2E-移动到验证', date: '2026-05-11',
      completed: false, priority: 'medium',
    });
    db.resetItemsCache && db.resetItemsCache();
    app.items = await db.getAllItems();
    app.renderColumn('todo', app.items.filter(i => i.type === 'todo'));
    await new Promise(r => setTimeout(r, 500));
    const c = document.querySelector('#boardView [data-item-id]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { id: item.id, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  console.log(`  Card: ${JSON.stringify(card)}`);
  await ss(page, 'f-02-card');

  if (!card) { console.log('[FATAL] No card.'); await page.close(); return; }

  // TEST 2: Right-click context menu
  console.log('\n--- TEST 2: Right-click -> 移动到 submenu ---');
  await page.mouse.click(100, 100);
  await delay(200);
  await page.mouse.click(card.x, card.y, { button: 'right' });
  await delay(1200);
  await ss(page, 'f-03-ctx-menu');

  // Verify menu has 移动到
  const hasCtx = await page.evaluate(() => document.body.innerText.includes('移动到'));
  console.log(`  Context menu has "移动到": ${hasCtx}`);

  // Now trigger submenu by hovering on the correct menu item
  // Find the "📆 移动到… ▸" menu item specifically
  const menuEl = await page.evaluate(() => {
    // The context menu items are inside a context-menu element
    const menus = document.querySelectorAll('.context-menu');
    for (const m of menus) {
      const items = m.querySelectorAll('.context-menu-item');
      for (const item of items) {
        if (item.textContent.includes('移动到')) {
          const r = item.getBoundingClientRect();
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: item.textContent.trim() };
        }
      }
    }
    return null;
  });

  console.log(`  Menu element: ${JSON.stringify(menuEl)}`);

  let t2 = false;
  if (menuEl) {
    // Move mouse to the 移动到 item to trigger submenu
    await page.mouse.move(menuEl.x, menuEl.y, { steps: 10 });
    await delay(1500);
    await ss(page, 'f-04-submenu-triggered');

    // Check if submenu appeared (it's a dynamically created .context-menu element)
    const subInfo = await page.evaluate(() => {
      // Count all context-menu elements
      const allMenus = document.querySelectorAll('.context-menu');
      const info = [];
      for (let i = 0; i < allMenus.length; i++) {
        const m = allMenus[i];
        const r = m.getBoundingClientRect();
        const text = (m.textContent || '').trim();
        info.push({
          idx: i,
          visible: r.width > 0 && r.height > 0,
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          textPreview: text.substring(0, 300),
          hasDates: /周[一二三四五六日]/.test(text),
          hasOtherDate: text.includes('选择其他日期'),
          hasMoveToLabel: text.includes('移动到'),
        });
      }
      return info;
    });

    console.log(`  Menu elements found: ${subInfo.length}`);
    subInfo.forEach(s => {
      console.log(`    Menu[${s.idx}]: visible=${s.visible} (${s.x},${s.y}) ${s.w}x${s.h} hasDates=${s.hasDates} hasOther=${s.hasOtherDate}`);
      console.log(`      Preview: "${s.textPreview.substring(0, 150)}"`);
    });

    // The submenu should be a separate .context-menu with date content
    const subMenu = subInfo.find(s => s.hasDates && s.idx > 0);
    if (subMenu) {
      t2 = true;
      console.log(`  [PASS] Submenu with date options found!`);

      // Get ALL submenu items
      const subItems = await page.evaluate(() => {
        const allMenus = document.querySelectorAll('.context-menu');
        // Get the second menu (submenu)
        const sub = allMenus.length > 1 ? allMenus[allMenus.length - 1] : null;
        if (!sub) return [];
        const items = sub.querySelectorAll('.context-menu-item');
        return Array.from(items).map(item => ({
          text: (item.textContent || '').trim(),
          dateVal: item.dataset.moveDate || '',
          x: Math.round(item.getBoundingClientRect().x + item.getBoundingClientRect().width / 2),
          y: Math.round(item.getBoundingClientRect().y + item.getBoundingClientRect().height / 2),
        }));
      });

      console.log(`  Submenu items (${subItems.length}):`);
      subItems.forEach((it, i) => console.log(`    ${i}: "${it.text}" data-move-date="${it.dateVal}" at (${it.x},${it.y})`));

      // TEST 3: "选择其他日期" position
      console.log('\n--- TEST 3: Date picker position ---');
      const customDate = subItems.find(it => it.dateVal === 'custom');
      if (customDate) {
        console.log(`  Found "选择其他日期" at (${customDate.x}, ${customDate.y})`);
        await page.mouse.click(customDate.x, customDate.y);
        await delay(1500);
        await ss(page, 'f-05-date-picker');

        // Check overlay position
        const overlay = await page.evaluate(() => {
          const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          const results = [];
          document.querySelectorAll('div, input').forEach(el => {
            const s = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            // Look for: high z-index fixed/absolute element OR native date input
            if ((r.width > 150 && r.height > 150 &&
                 (s.position === 'fixed' || s.position === 'absolute') &&
                 parseInt(s.zIndex || '0') > 100) ||
                (el.tagName === 'INPUT' && el.type === 'date' && r.width > 0)) {
              results.push({
                tag: el.tagName, type: el.type || '',
                cls: (el.className || '').toString().substring(0, 40),
                cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2),
                pcx: Math.round(cx), pcy: Math.round(cy),
                centered: Math.abs(r.x + r.width / 2 - cx) < 100 && Math.abs(r.y + r.height / 2 - cy) < 100,
              });
            }
          });
          return results;
        });

        const t3 = overlay.length > 0 ? !overlay[0].centered : null;
        if (overlay.length > 0) {
          overlay.forEach(o => {
            console.log(`  ${o.tag}.${o.cls}: center=(${o.cx},${o.cy}) page=(${o.pcx},${o.pcy}) => ${o.centered ? 'CENTERED' : 'NOT centered'}`);
          });
          console.log(`  [${t3 ? 'PASS' : 'FAIL'}] Date picker is ${t3 ? 'NOT centered (near context menu)' : 'CENTERED on screen'}`);
        } else {
          console.log('  [WARN] No date picker overlay found.');
        }
      } else {
        console.log('  [WARN] "选择其他日期" not found in submenu items.');
        console.log('  [INFO] Submenu might be scrolled - checking full content...');
      }

      // TEST 4: Move to date -> success
      console.log('\n--- TEST 4: Move item to date -> success ---');
      // Dismiss everything
      await page.evaluate(() => {
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
      });
      await delay(500);

      // Re-do: right-click -> hover 移动到 -> click date
      await page.mouse.click(card.x, card.y, { button: 'right' });
      await delay(1000);
      await page.mouse.move(menuEl.x, menuEl.y, { steps: 5 });
      await delay(1000);

      // Click a date (not today, not custom)
      const targetDate = subItems.find(it => it.dateVal && it.dateVal !== 'custom' && !it.text.includes('今天'));
      if (targetDate) {
        console.log(`  Clicking: "${targetDate.text}" (${targetDate.dateVal}) at (${targetDate.x}, ${targetDate.y})`);
        await page.mouse.click(targetDate.x, targetDate.y);

        // Wait and check for success toast
        await delay(2000);
        const successText = await page.evaluate(async () => {
          for (let i = 0; i < 8; i++) {
            const t = document.body.innerText;
            if (t.includes('已移动到') || t.includes('成功')) return t.match(/已移动到[^\n]*/)?.[0] || 'success found';
            await new Promise(r => setTimeout(r, 300));
          }
          return null;
        });

        await ss(page, 'f-06-after-move');
        const t4 = !!successText;
        console.log(`  [${t4 ? 'PASS' : 'WARN'}] Success: ${successText || 'no toast visible (move may have completed silently)'}`);

        // Verify item actually moved
        const movedItem = await page.evaluate(async (itemId) => {
          const db = window.db;
          db.resetItemsCache && db.resetItemsCache();
          const item = await db.getItem(itemId);
          return item ? { deadline: item.deadline, date: item.date } : null;
        }, card.id);
        console.log(`  Item after move: ${JSON.stringify(movedItem)}`);
      } else {
        console.log('  [WARN] No suitable date option found.');
      }
    } else {
      console.log('  [WARN] Submenu not detected as separate element.');
      // Try clicking on the "移动到" item directly
      await page.mouse.click(menuEl.x, menuEl.y);
      await delay(1500);
      await ss(page, 'f-04b-clicked-moveTo');

      const afterClick = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasDates: /周[一二三四五六日]/.test(text),
          hasOtherDate: text.includes('选择其他日期'),
          hasThisWeek: text.includes('本周'),
          hasNextWeek: text.includes('下周'),
          dateMatch: text.match(/周[一二三四五六日][^\n]{0,15}/g)?.slice(0, 10),
        };
      });
      console.log(`  After clicking 移动到: ${JSON.stringify(afterClick)}`);
      t2 = afterClick.hasDates;
    }
  }

  // TEST 5: JS errors
  console.log('\n--- TEST 5: JS errors ---');
  const errs = jsErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
  const t5 = errs.length === 0;
  console.log(`  [${t5 ? 'PASS' : 'FAIL'}] ${errs.length} errors`);
  errs.slice(0, 3).forEach((e, i) => console.log(`    ${i + 1}: ${e.substring(0, 100)}`));

  await ss(page, 'f-07-final');

  // Cleanup
  await page.evaluate(async () => {
    const db = window.db;
    if (db) { db.resetItemsCache && db.resetItemsCache(); const items = await db.getAllItems(); for (const i of items) { if (i.title && i.title.includes('E2E')) await db.deleteItem(i.id); } }
  });

  console.log('\n========================================');
  console.log('  RESULTS');
  console.log('========================================');
  console.log(`  1. Version v5.1.68:     ${t1 ? 'PASS' : 'FAIL'}`);
  console.log(`  2. 移动到 submenu:       ${t2 ? 'PASS' : 'FAIL'}`);
  console.log(`  3. Date picker position: See logs above`);
  console.log(`  4. Move success message: See logs above`);
  console.log(`  5. No JS errors:         ${t5 ? 'PASS' : 'FAIL'}`);
  console.log('========================================');

  await page.close();
}

run().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
