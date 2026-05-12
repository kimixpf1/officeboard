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
  return filePath;
}

async function runTests() {
  console.log('=== E2E Verification: v5.1.68 (Round 3 - Precise) ===\n');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  } catch (err) {
    console.log('[ERROR] Cannot connect to Chrome on port 9222.');
    process.exit(1);
  }
  console.log('[INFO] Connected.\n');

  let page = (await browser.pages())[0];
  if (!page) page = await browser.newPage();

  // Clear console errors
  jsErrors.length = 0;
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    jsErrors.push(`PageError: ${err.message}`);
  });

  await page.setViewport({ width: 1400, height: 900 });

  // Navigate and hard refresh
  console.log('--- TEST 1: Version number check ---');
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await page.evaluate(() => location.reload(true));
  await page.waitForNetworkIdle({ timeout: 15000 });
  await delay(3000);

  const versionText = await page.evaluate(() => {
    const el = document.querySelector('.header-version, .version, [class*="version"]');
    return el ? el.textContent : document.body.innerText.match(/20\d{2}-\d{2}-\d{2}\s+v[\d.]+/)?.[0] || 'NOT FOUND';
  });
  const hasVersion = versionText.includes('v5.1.68');
  console.log(`  [INFO] Version text: "${versionText}"`);
  console.log(`  [${hasVersion ? 'PASS' : 'FAIL'}] Version check: ${hasVersion ? 'v5.1.68 confirmed' : 'v5.1.68 NOT found'}`);
  await screenshot(page, 'v3-01-loaded');

  // ============================================================
  // SETUP: Add test item via db directly + force view refresh
  // ============================================================
  console.log('\n--- SETUP: Adding test todo item ---');

  const addResult = await page.evaluate(async () => {
    const db = window.db || (window.officeDashboard && window.officeDashboard.db);
    if (!db) return { success: false, error: 'db not found' };

    const item = await db.addItem({
      type: 'todo',
      title: 'E2E测试待办-验证移动到',
      date: new Date().toISOString().split('T')[0],
      completed: false,
      priority: 'medium',
    });

    // Force refresh the view
    const app = window.officeDashboard;
    if (app && app.dateView) {
      await app.dateView.loadItems(new Date().toISOString().split('T')[0]);
    } else if (app && app.loadItems) {
      await app.loadItems();
    }

    return { success: true, id: item.id, title: item.title };
  });

  console.log(`  [INFO] Add result: ${JSON.stringify(addResult)}`);

  // Reset cache and force reload
  await page.evaluate(() => {
    const db = window.db;
    if (db && db.resetItemsCache) db.resetItemsCache();
  });
  await delay(1000);

  // Reload page to ensure fresh state
  await page.evaluate(() => location.reload(true));
  await page.waitForNetworkIdle({ timeout: 15000 });
  await delay(3000);

  await screenshot(page, 'v3-02-after-reload');

  // Now check for todo items in the board view
  const boardState = await page.evaluate(() => {
    const boardView = document.querySelector('#boardView');
    if (!boardView) return { found: false, error: 'boardView not found' };

    const columns = boardView.querySelectorAll('.board-column');
    const colInfo = [];
    for (const col of columns) {
      const header = col.querySelector('.column-header');
      const headerText = header ? header.textContent.trim() : 'unknown';
      const cards = col.querySelectorAll('.item-card, .todo-card, [class*="item-card"], [class*="todo-card"], [data-item-id], [data-id]');
      colInfo.push({
        header: headerText.substring(0, 40),
        cardCount: cards.length,
        cardTexts: Array.from(cards).map(c => (c.textContent || '').trim().substring(0, 50)),
      });
    }
    return { found: true, columns: colInfo };
  });

  console.log(`  [INFO] Board state: ${JSON.stringify(boardState, null, 2)}`);

  // If still no cards, try to find ANY clickable element within boardView
  const boardItems = await page.evaluate(() => {
    const board = document.querySelector('#boardView');
    if (!board) return [];

    const allInBoard = board.querySelectorAll('div');
    const results = [];
    for (const el of allInBoard) {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      if (rect.width > 100 && rect.height > 20 && rect.height < 100 &&
          text.length > 2 && text.length < 100 && el.children.length <= 3) {
        // Must be inside the board area (not header)
        if (rect.y > 200) {
          results.push({
            text: text.substring(0, 60),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            cls: (el.className || '').toString().substring(0, 50),
          });
        }
      }
    }
    return results.slice(0, 15);
  });

  console.log(`  [INFO] Board items below header (y>200):`);
  boardItems.forEach((it, i) => {
    console.log(`    ${i}: "${it.text.substring(0, 40)}" at (${it.x},${it.y}) cls=${it.cls}`);
  });

  // ============================================================
  // TEST 2: Right-click -> "移动到" submenu
  // ============================================================
  console.log('\n--- TEST 2: Right-click -> "移动到" submenu ---');

  let test2Result = 'SKIP';
  let targetItem = null;

  // Filter for items that look like actual task cards (not headers, not empty columns)
  const taskCandidates = boardItems.filter(it =>
    !it.text.includes('待办') && !it.text.includes('会议') && !it.text.includes('办文') &&
    !it.text.includes('0') && it.text.length > 3
  );

  console.log(`  [INFO] Task candidates: ${taskCandidates.length}`);

  if (taskCandidates.length === 0) {
    // Try to use the "新增" button in the todo column to add via UI
    console.log('  [INFO] No task items found. Trying to add via UI...');

    const addBtnInfo = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, .add-btn, [class*="add"]');
      for (const btn of btns) {
        const text = (btn.textContent || '').trim();
        const rect = btn.getBoundingClientRect();
        if ((text.includes('新增') || text.includes('+') || text.includes('添加')) && rect.y > 150 && rect.x < 900) {
          return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), text: text.substring(0, 20) };
        }
      }
      return null;
    });

    if (addBtnInfo) {
      console.log(`  [INFO] Found add button: "${addBtnInfo.text}" at (${addBtnInfo.x}, ${addBtnInfo.y})`);
      await page.mouse.click(addBtnInfo.x, addBtnInfo.y);
      await delay(1500);
      await screenshot(page, 'v3-03-modal-opened');

      // Check if modal opened and fill it
      const modalState = await page.evaluate(() => {
        const modal = document.querySelector('#itemModal, .modal, [class*="modal"]');
        if (!modal) return { open: false };

        const titleInput = modal.querySelector('input[type="text"], #itemTitle, [placeholder*="标题"]');
        if (titleInput) {
          // Set value using native setter to trigger Vue/React/etc reactivity
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(titleInput, 'E2E测试待办-验证移动到');
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Find save button
        const saveBtn = modal.querySelector('button[type="submit"], .save-btn, [class*="save"]');
        const allBtns = modal.querySelectorAll('button');
        let saveInfo = null;
        for (const btn of allBtns) {
          const text = (btn.textContent || '').trim();
          if (text.includes('保存') || text.includes('确定') || text.includes('提交')) {
            const rect = btn.getBoundingClientRect();
            saveInfo = { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), text };
            break;
          }
        }

        return { open: true, hasSave: !!saveInfo, saveInfo };
      });

      console.log(`  [INFO] Modal state: ${JSON.stringify(modalState)}`);

      if (modalState.open && modalState.hasSave) {
        await page.mouse.click(modalState.saveInfo.x, modalState.saveInfo.y);
        await delay(2000);
        console.log(`  [INFO] Clicked save "${modalState.saveInfo.text}"`);
        await screenshot(page, 'v3-04-after-save');
      }
    }
  }

  // Try again to find items
  const itemsAfterAdd = await page.evaluate(() => {
    const board = document.querySelector('#boardView');
    if (!board) return [];

    const results = [];
    // Look for any element with data attributes indicating it's an item
    const selectors = [
      '[data-item-id]', '[data-id]', '.item-card', '.todo-card',
      '.board-item', '[class*="card-item"]', '[class*="item-"]',
    ];
    const found = new Set();
    for (const sel of selectors) {
      const els = board.querySelectorAll(sel);
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 10 && !found.has(el)) {
          found.add(el);
          results.push({
            text: (el.textContent || '').trim().substring(0, 80),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            sel,
            cls: (el.className || '').toString().substring(0, 60),
          });
        }
      }
    }
    return results;
  });

  console.log(`  [INFO] Items after add attempt: ${itemsAfterAdd.length}`);
  itemsAfterAdd.forEach((it, i) => {
    console.log(`    ${i}: "${it.text.substring(0, 40)}" at (${it.x},${it.y}) ${it.w}x${it.h} [${it.sel}]`);
  });

  // If we still have items, try right-click
  if (itemsAfterAdd.length > 0) {
    targetItem = itemsAfterAdd[0];
  } else if (taskCandidates.length > 0) {
    targetItem = taskCandidates[0];
  }

  if (targetItem) {
    console.log(`\n  [INFO] Right-clicking: "${targetItem.text.substring(0, 30)}" at (${targetItem.x}, ${targetItem.y})`);
    await page.mouse.click(50, 50); // dismiss any menu
    await delay(300);
    await page.mouse.click(targetItem.x, targetItem.y, { button: 'right' });
    await delay(1200);
    await screenshot(page, 'v3-05-right-click');

    const ctxMenu = await page.evaluate(() => {
      const allText = document.body.innerText;
      const hasMoveTo = allText.includes('移动到');
      const hasMoveToDate = allText.includes('移动') && (allText.includes('日期') || allText.includes('周一'));

      // Find visible menu
      const menus = document.querySelectorAll('[class*="context-menu"], [class*="contextMenu"], [role="menu"], [class*="ctx-menu"]');
      const visibleMenus = [];
      for (const m of menus) {
        const rect = m.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleMenus.push({
            text: (m.textContent || '').trim().substring(0, 500),
            x: Math.round(rect.x), y: Math.round(rect.y),
            w: Math.round(rect.width), h: Math.round(rect.height),
          });
        }
      }
      return { hasMoveTo, hasMoveToDate, visibleMenus };
    });

    console.log(`  [INFO] Has "移动到": ${ctxMenu.hasMoveTo}`);
    ctxMenu.visibleMenus.forEach((m, i) => {
      console.log(`  [INFO] Menu ${i}: "${m.text.substring(0, 150)}"`);
    });

    if (ctxMenu.hasMoveTo) {
      console.log('  [PASS] "移动到" found in context menu!');

      // Hover on "移动到" to trigger submenu
      const hoverResult = await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
          if (directText === '移动到…' || directText === '移动到...' || directText === '移动到') {
            const rect = el.getBoundingClientRect();
            const x = rect.x + rect.width / 2;
            const y = rect.y + rect.height / 2;
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
            el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
            return { hovered: true, text: directText, x: Math.round(x), y: Math.round(y) };
          }
        }
        return { hovered: false };
      });

      if (hoverResult.hovered) {
        console.log(`  [INFO] Hovered on "${hoverResult.text}" at (${hoverResult.x},${hoverResult.y})`);
        await delay(1000);
        await screenshot(page, 'v3-06-submenu');

        // Check submenu content
        const submenu = await page.evaluate(() => {
          const text = document.body.innerText;
          const lines = text.split('\n').filter(l => l.trim());
          // Find lines that look like date options
          const dateLines = lines.filter(l =>
            l.match(/周[一二三四五六日]/) || l.match(/\d+月\d+日/) ||
            l.includes('本周') || l.includes('下周') || l.includes('其他日期') ||
            l.includes('选择其他日期')
          );
          return { dateLines: dateLines.slice(0, 20) };
        });

        console.log(`  [INFO] Date lines found: ${submenu.dateLines.length}`);
        submenu.dateLines.forEach(l => console.log(`    "${l}"`));

        if (submenu.dateLines.length > 0) {
          console.log('  [PASS] Submenu with date options (本周/下周 dates) confirmed.');
          test2Result = 'PASS';
        } else {
          console.log('  [WARN] No date lines found in submenu text.');
          test2Result = 'PARTIAL';
        }

        // ============================================================
        // TEST 3: Date picker position check
        // ============================================================
        console.log('\n--- TEST 3: Date picker position check ---');

        const hasOtherDate = submenu.dateLines.some(l => l.includes('其他日期') || l.includes('选择其他'));

        if (hasOtherDate) {
          // Click "选择其他日期…"
          const clickResult = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const text = (el.textContent || '').trim();
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
              if (directText.includes('选择其他日期') || directText.includes('其他日期…')) {
                el.click();
                return { clicked: true, text: directText };
              }
            }
            return { clicked: false };
          });

          await delay(1200);

          if (clickResult.clicked) {
            console.log(`  [INFO] Clicked "${clickResult.text}"`);
            await screenshot(page, 'v3-07-date-picker');

            // Check position of any new overlay
            const overlayCheck = await page.evaluate(() => {
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const centerX = vw / 2;
              const centerY = vh / 2;

              const results = [];
              const all = document.querySelectorAll('div, section, aside');
              for (const el of all) {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                if (rect.width > 200 && rect.height > 200 &&
                    (style.position === 'fixed' || style.position === 'absolute') &&
                    parseInt(style.zIndex || '0') > 100) {
                  const elCX = rect.x + rect.width / 2;
                  const elCY = rect.y + rect.height / 2;
                  results.push({
                    cls: (el.className || '').toString().substring(0, 60),
                    x: Math.round(rect.x), y: Math.round(rect.y),
                    w: Math.round(rect.width), h: Math.round(rect.height),
                    centerX: Math.round(elCX), centerY: Math.round(elCY),
                    pageCenterX: Math.round(centerX), pageCenterY: Math.round(centerY),
                    isCentered: Math.abs(elCX - centerX) < 100 && Math.abs(elCY - centerY) < 100,
                  });
                }
              }
              return results;
            });

            if (overlayCheck.length > 0) {
              for (const o of overlayCheck) {
                console.log(`  [INFO] Overlay: ${o.cls} at (${o.x},${o.y}) ${o.w}x${o.h}`);
                console.log(`         Center: (${o.centerX},${o.centerY}) vs Page: (${o.pageCenterX},${o.pageCenterY})`);
                if (o.isCentered) {
                  console.log('  [FAIL] Date picker appears centered on screen.');
                } else {
                  console.log('  [PASS] Date picker is NOT centered (positioned near context menu).');
                }
              }
            } else {
              console.log('  [WARN] No high-z overlay found after clicking "选择其他日期".');
              // Maybe the date picker is the existing submenu itself?
              // Check if the menu changed content
              const menuContent = await page.evaluate(() => {
                const menus = document.querySelectorAll('[class*="context"], [class*="menu"]');
                for (const m of menus) {
                  const rect = m.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    return (m.textContent || '').trim().substring(0, 500);
                  }
                }
                return '';
              });
              console.log(`  [INFO] Current menu content: "${menuContent.substring(0, 200)}"`);
            }
          } else {
            console.log('  [WARN] Could not find/click "选择其他日期".');
          }
        } else {
          console.log('  [WARN] "选择其他日期" not in submenu. Test 3 cannot verify position.');
        }

        // ============================================================
        // TEST 4: Select a date -> success message
        // ============================================================
        console.log('\n--- TEST 4: Select date -> success message ---');

        // Dismiss and re-do the flow
        await page.mouse.click(50, 50);
        await delay(500);
        await page.mouse.click(targetItem.x, targetItem.y, { button: 'right' });
        await delay(1000);

        // Hover on "移动到" again
        await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const directText = Array.from(el.childNodes)
              .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (directText === '移动到…' || directText === '移动到...' || directText === '移动到') {
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              break;
            }
          }
        });
        await delay(800);

        // Click a weekday option
        const dateClickResult = await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const text = (el.textContent || '').trim();
            if (el.children.length === 0 && text.match(/^周[一二三四五六日]/) && text.length < 25) {
              el.click();
              return { clicked: true, text };
            }
          }
          return { clicked: false };
        });

        await delay(2000);

        if (dateClickResult.clicked) {
          console.log(`  [INFO] Clicked date: "${dateClickResult.text}"`);
          await screenshot(page, 'v3-08-date-selected');

          const successCheck = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasSuccess = text.includes('成功') || text.includes('已移动') || text.includes('已移') ||
                              text.includes('日期已') || text.includes('完成');
            return { hasSuccess };
          });

          if (successCheck.hasSuccess) {
            console.log('  [PASS] Success message detected after moving item.');
          } else {
            console.log('  [WARN] No explicit success toast. Item may have moved silently.');
          }
        } else {
          console.log('  [WARN] Could not find a date option to click.');
        }
      } else {
        console.log('  [WARN] Could not hover on "移动到" element.');
      }
    } else {
      console.log('  [FAIL] "移动到" not found in context menu.');
      test2Result = 'FAIL';
    }
  } else {
    console.log('  [FAIL] No items found on page to right-click.');
    test2Result = 'FAIL';
  }

  // ============================================================
  // TEST 5: JS errors check
  // ============================================================
  console.log('\n--- TEST 5: JS errors check ---');
  // Filter out known benign errors
  const realErrors = jsErrors.filter(e =>
    !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR')
  );
  if (realErrors.length === 0) {
    console.log('  [PASS] No JavaScript errors detected.');
  } else {
    console.log(`  [FAIL] ${realErrors.length} JS error(s):`);
    realErrors.forEach((err, i) => console.log(`    ${i + 1}: ${err.substring(0, 150)}`));
  }

  await screenshot(page, 'v3-09-final');

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('\n--- CLEANUP ---');
  await page.evaluate(async () => {
    const db = window.db;
    if (db) {
      const items = await db.getItemsByType('todo');
      const testItem = items.find(i => i.title && i.title.includes('E2E测试'));
      if (testItem) await db.deleteItem(testItem.id);
    }
  });

  // Summary
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Test 1 (Version): ${hasVersion ? 'PASS' : 'FAIL'}`);
  console.log(`  Test 2 (移动到 submenu): ${test2Result}`);
  console.log(`  Test 3 (Date picker position): See logs above`);
  console.log(`  Test 4 (Select date -> success): See logs above`);
  console.log(`  Test 5 (JS errors): ${realErrors.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log('========================================');
}

runTests().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
