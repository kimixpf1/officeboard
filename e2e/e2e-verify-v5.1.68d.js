const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));

const jsErrors = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  [SCREENSHOT] ${filePath}`);
}

async function runTests() {
  console.log('=== E2E Verification: v5.1.68 (Round 4 - No Reload) ===\n');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  } catch (err) {
    console.log('[ERROR] Cannot connect to Chrome.');
    process.exit(1);
  }

  let page = (await browser.pages())[0];
  if (!page) page = await browser.newPage();

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => jsErrors.push(`PageError: ${err.message}`));

  await page.setViewport({ width: 1400, height: 900 });

  // Navigate once - no reload
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);

  // TEST 1: Version
  console.log('--- TEST 1: Version number ---');
  const ver = await page.evaluate(() => {
    const el = document.querySelector('[class*="version"]');
    return el ? el.textContent.trim() : 'NOT FOUND';
  });
  console.log(`  Version: "${ver}"`);
  const t1 = ver.includes('v5.1.68');
  console.log(`  [${t1 ? 'PASS' : 'FAIL'}] Version v5.1.68`);
  await screenshot(page, 'v4-01-loaded');

  // SETUP: Add item and force view refresh WITHOUT page reload
  console.log('\n--- SETUP: Adding test item (no reload) ---');
  const setupResult = await page.evaluate(async () => {
    const db = window.db;
    if (!db) return { error: 'no db' };

    // Reset cache first
    if (db.resetItemsCache) db.resetItemsCache();

    // Add item
    const item = await db.addItem({
      type: 'todo',
      title: 'E2E测试-移动到验证',
      date: new Date().toISOString().split('T')[0],
      completed: false,
      priority: 'medium',
    });

    // Get the app instance
    const app = window.officeDashboard;
    if (!app) return { error: 'no app', itemId: item.id };

    // Reset items cache
    if (db.resetItemsCache) db.resetItemsCache();

    // Trigger view refresh
    if (app.dateView && app.dateView.loadItems) {
      const today = new Date().toISOString().split('T')[0];
      await app.dateView.loadItems(today);
    }

    // Also try direct loadItems
    if (app.loadItems) {
      await app.loadItems();
    }

    // Reset cache again and re-check
    if (db.resetItemsCache) db.resetItemsCache();
    const allItems = await db.getAllItems();
    const todoItems = allItems.filter(i => i.type === 'todo');

    return {
      itemId: item.id,
      totalItems: allItems.length,
      todoCount: todoItems.length,
      todoTitles: todoItems.map(i => i.title).slice(0, 5),
      todayDate: new Date().toISOString().split('T')[0],
      appHasDateView: !!app.dateView,
      appHasLoadItems: !!app.loadItems,
      appSelectedDate: app.selectedDate || app.currentDate || 'unknown',
    };
  });

  console.log(`  [INFO] Setup result: ${JSON.stringify(setupResult)}`);
  await delay(2000);

  // Check if items appear in the board now
  const boardAfter = await page.evaluate(() => {
    const board = document.querySelector('#boardView');
    if (!board) return { error: 'no boardView' };

    // Count all visible elements in board
    const allEls = board.querySelectorAll('*');
    const visible = [];
    for (const el of allEls) {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      if (rect.width > 50 && rect.height > 15 && rect.y > 150 && text.length > 0 && text.length < 100) {
        visible.push({
          tag: el.tagName, cls: (el.className || '').toString().substring(0, 40),
          text: text.substring(0, 50), x: Math.round(rect.x), y: Math.round(rect.y),
          w: Math.round(rect.width), h: Math.round(rect.height),
        });
      }
    }
    return { total: visible.length, items: visible.slice(0, 20) };
  });

  console.log(`  [INFO] Board visible elements: ${boardAfter.total}`);
  boardAfter.items.forEach((it, i) => {
    console.log(`    ${i}: <${it.tag}> "${it.text.substring(0, 35)}" (${it.x},${it.y}) ${it.w}x${it.h} ${it.cls}`);
  });

  await screenshot(page, 'v4-02-after-add');

  // ============================================================
  // KEY STRATEGY: Use evaluate to directly trigger context menu on item
  // ============================================================
  console.log('\n--- TEST 2: Direct context menu test ---');

  // Instead of trying to find DOM elements, use the app's own methods
  const contextResult = await page.evaluate(async () => {
    const db = window.db;
    const app = window.officeDashboard;
    if (!db || !app) return { error: 'no db or app' };

    // Make sure we have items
    if (db.resetItemsCache) db.resetItemsCache();
    const allItems = await db.getAllItems();
    const todoItems = allItems.filter(i => i.type === 'todo');

    if (todoItems.length === 0) return { error: 'no todo items in db', totalItems: allItems.length };

    const testItem = todoItems[0];

    // Force render: call renderColumn for todos
    // First, set app.items to include our item
    app.items = allItems;

    // Try to render todo column
    if (app.renderColumn) {
      try {
        app.renderColumn('todo', todoItems);
      } catch(e) {
        // ignore
      }
    }

    // Check if cards now exist
    await new Promise(r => setTimeout(r, 500));

    const board = document.querySelector('#boardView');
    const cards = board ? board.querySelectorAll('[data-item-id], [data-id]') : [];
    const cardInfo = Array.from(cards).map(c => ({
      id: c.dataset.itemId || c.dataset.id,
      text: (c.textContent || '').trim().substring(0, 60),
      rect: {
        x: Math.round(c.getBoundingClientRect().x),
        y: Math.round(c.getBoundingClientRect().y),
        w: Math.round(c.getBoundingClientRect().width),
        h: Math.round(c.getBoundingClientRect().height),
      },
    }));

    return {
      itemId: testItem.id,
      itemTitle: testItem.title,
      cardsFound: cards.length,
      cards: cardInfo,
    };
  });

  console.log(`  [INFO] Context setup: ${JSON.stringify(contextResult, null, 2)}`);

  if (contextResult.cardsFound > 0) {
    const card = contextResult.cards[0];
    console.log(`  [INFO] Found card: "${card.text.substring(0, 30)}" at (${card.rect.x}, ${card.rect.y})`);

    // Right-click on the card
    await page.mouse.click(card.rect.x + card.rect.w / 2, card.rect.y + card.rect.h / 2, { button: 'right' });
    await delay(1200);
    await screenshot(page, 'v4-03-right-click');

    // Check context menu
    const ctxMenu = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasMoveTo = text.includes('移动到');

      // Find context menu element
      const allEls = document.querySelectorAll('*');
      const menus = [];
      for (const el of allEls) {
        const cls = (el.className || '').toString().toLowerCase();
        if (cls.includes('context') || cls.includes('ctx-menu') || cls.includes('contextmenu')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            menus.push({
              cls: (el.className || '').toString().substring(0, 80),
              text: (el.textContent || '').trim().substring(0, 500),
              x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height),
            });
          }
        }
      }

      return { hasMoveTo, menus };
    });

    console.log(`  [INFO] Has "移动到": ${ctxMenu.hasMoveTo}`);
    ctxMenu.menus.forEach((m, i) => {
      console.log(`  [INFO] Menu ${i}: "${m.text.substring(0, 200)}"`);
    });

    const t2 = ctxMenu.hasMoveTo;
    console.log(`  [${t2 ? 'PASS' : 'FAIL'}] "移动到" in context menu`);

    if (t2 && ctxMenu.menus.length > 0) {
      // Hover on "移动到" to trigger submenu
      const hoverOk = await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
          if (directText.includes('移动到')) {
            const rect = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            return true;
          }
        }
        return false;
      });

      await delay(1000);
      await screenshot(page, 'v4-04-submenu');

      const submenu = await page.evaluate(() => {
        const text = document.body.innerText;
        const hasWeekDates = /周[一二三四五六日]/.test(text);
        const hasOtherDate = text.includes('选择其他日期') || text.includes('其他日期');
        return { hasWeekDates, hasOtherDate };
      });

      console.log(`  [INFO] Submenu week dates: ${submenu.hasWeekDates}, other date: ${submenu.hasOtherDate}`);

      if (submenu.hasWeekDates) {
        console.log('  [PASS] Submenu with date options confirmed.');
      }

      // TEST 3: Date picker position
      console.log('\n--- TEST 3: Date picker position ---');
      if (submenu.hasOtherDate) {
        const clickOk = await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const directText = Array.from(el.childNodes)
              .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (directText.includes('选择其他日期') || directText.includes('其他日期…')) {
              el.click();
              return true;
            }
          }
          return false;
        });

        await delay(1000);
        await screenshot(page, 'v4-05-date-picker');

        if (clickOk) {
          const pos = await page.evaluate(() => {
            const vw = window.innerWidth / 2;
            const vh = window.innerHeight / 2;
            const results = [];
            const all = document.querySelectorAll('div');
            for (const el of all) {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              if (rect.width > 200 && rect.height > 200 &&
                  (style.position === 'fixed' || style.position === 'absolute') &&
                  parseInt(style.zIndex || '0') > 100) {
                const cx = rect.x + rect.width / 2;
                const cy = rect.y + rect.height / 2;
                results.push({
                  cls: (el.className || '').toString().substring(0, 50),
                  x: Math.round(rect.x), y: Math.round(rect.y),
                  cx: Math.round(cx), cy: Math.round(cy),
                  vw: Math.round(vw), vh: Math.round(vh),
                  centered: Math.abs(cx - vw) < 100 && Math.abs(cy - vh) < 100,
                });
              }
            }
            return results;
          });

          if (pos.length > 0) {
            pos.forEach(p => {
              console.log(`  [INFO] Overlay ${p.cls}: (${p.cx},${p.cy}) vs center (${p.vw},${p.vh})`);
              if (p.centered) {
                console.log('  [FAIL] Date picker is centered on screen.');
              } else {
                console.log('  [PASS] Date picker is NOT centered (near context menu).');
              }
            });
          } else {
            console.log('  [WARN] No overlay element found. Checking if inline date input appeared...');
            // Maybe it's an <input type="date"> that appeared inline
            const inputCheck = await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="date"]');
              const visible = [];
              for (const inp of inputs) {
                const rect = inp.getBoundingClientRect();
                if (rect.width > 0) {
                  visible.push({ x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) });
                }
              }
              return visible;
            });
            console.log(`  [INFO] Date inputs found: ${JSON.stringify(inputCheck)}`);
          }
        }
      } else {
        console.log('  [WARN] "选择其他日期" not found. Cannot test date picker position.');
      }

      // TEST 4: Select date -> success
      console.log('\n--- TEST 4: Select date -> success ---');
      await page.mouse.click(50, 50);
      await delay(500);
      await page.mouse.click(card.rect.x + card.rect.w / 2, card.rect.y + card.rect.h / 2, { button: 'right' });
      await delay(1000);

      // Hover on "移动到"
      await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
          if (directText.includes('移动到')) {
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            break;
          }
        }
      });
      await delay(800);

      // Click a weekday
      const dateClick = await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const text = (el.textContent || '').trim();
          if (el.children.length === 0 && text.match(/^周[一二三四五六日]/) && text.length < 25) {
            el.click();
            return text;
          }
        }
        return null;
      });

      await delay(2000);
      if (dateClick) {
        console.log(`  [INFO] Clicked: "${dateClick}"`);
        await screenshot(page, 'v4-06-after-move');

        const success = await page.evaluate(() => {
          const text = document.body.innerText;
          return text.includes('成功') || text.includes('已移动') || text.includes('日期已');
        });

        console.log(`  [${success ? 'PASS' : 'WARN'}] Success message after move: ${success}`);
      } else {
        console.log('  [WARN] No date option found to click.');
      }
    }
  } else {
    console.log('  [FAIL] No item cards rendered in board after add+render.');

    // Debug: dump the board HTML
    const boardHtml = await page.evaluate(() => {
      const board = document.querySelector('#boardView');
      return board ? board.innerHTML.substring(0, 2000) : 'NO BOARD';
    });
    console.log(`  [DEBUG] Board HTML: ${boardHtml.substring(0, 500)}...`);
  }

  // TEST 5: JS errors
  console.log('\n--- TEST 5: JS errors ---');
  const realErrs = jsErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
  console.log(`  [${realErrs.length === 0 ? 'PASS' : 'FAIL'}] JS errors: ${realErrs.length}`);
  realErrs.forEach((e, i) => console.log(`    ${i + 1}: ${e.substring(0, 100)}`));

  await screenshot(page, 'v4-07-final');

  // Cleanup
  await page.evaluate(async () => {
    const db = window.db;
    if (db) {
      if (db.resetItemsCache) db.resetItemsCache();
      const items = await db.getAllItems();
      for (const item of items) {
        if (item.title && item.title.includes('E2E测试')) {
          await db.deleteItem(item.id);
        }
      }
    }
  });

  console.log('\n=== Done ===');
}

runTests().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
