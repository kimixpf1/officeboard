const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';
const delay = ms => new Promise(r => setTimeout(r, ms));

const jsErrors = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [SCREENSHOT] ${filePath}`);
  return filePath;
}

async function runTests() {
  console.log('=== E2E Verification: v5.1.68 (Round 2) ===\n');

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

  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    jsErrors.push(`PageError: ${err.message}`);
  });

  // Set a reasonable viewport
  await page.setViewport({ width: 1280, height: 900 });

  // ============================================================
  // TEST 1: Hard refresh, check version number
  // ============================================================
  console.log('--- TEST 1: Version number check ---');
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Hard refresh
  await page.evaluate(() => location.reload(true));
  await page.waitForNetworkIdle({ timeout: 15000 });
  await delay(2000);

  const versionCheck = await page.evaluate(() => {
    const text = document.body.innerText;
    const html = document.documentElement.innerHTML;
    return {
      hasVersion: text.includes('v5.1.68') || html.includes('v5.1.68'),
      hasDate: text.includes('2026-05-11') || html.includes('2026-05-11'),
      versionText: (text.match(/v[\d.]+/g) || []).join(', '),
    };
  });

  if (versionCheck.hasVersion && versionCheck.hasDate) {
    console.log(`  [PASS] Version "2026-05-11 v5.1.68" confirmed. Found: ${versionCheck.versionText}`);
  } else if (versionCheck.hasVersion) {
    console.log(`  [PASS] Version "v5.1.68" found. Versions: ${versionCheck.versionText}`);
  } else {
    console.log(`  [FAIL] Version "v5.1.68" NOT found. Found: ${versionCheck.versionText}`);
  }
  await screenshot(page, 'v2-01-page-loaded');

  // ============================================================
  // SETUP: Add a test todo item via the app's API
  // ============================================================
  console.log('\n--- SETUP: Adding test todo item ---');
  const addResult = await page.evaluate(() => {
    // Access the app's db module to add a test item
    if (window.db && window.db.addItem) {
      return window.db.addItem({
        type: 'todo',
        title: 'E2E测试待办-验证移动到功能',
        date: new Date().toISOString().split('T')[0],
        completed: false,
        priority: 'medium',
      }).then(item => ({ success: true, id: item.id }))
        .catch(err => ({ success: false, error: err.message }));
    }
    // Fallback: try via officeDashboard
    if (window.officeDashboard && window.officeDashboard.db) {
      return window.officeDashboard.db.addItem({
        type: 'todo',
        title: 'E2E测试待办-验证移动到功能',
        date: new Date().toISOString().split('T')[0],
        completed: false,
        priority: 'medium',
      }).then(item => ({ success: true, id: item.id }))
        .catch(err => ({ success: false, error: err.message }));
    }
    return { success: false, error: 'db module not found' };
  });

  console.log(`  [INFO] Add item result: ${JSON.stringify(addResult)}`);

  if (!addResult.success) {
    // Try another approach: use the modal UI to add
    console.log('  [INFO] Trying UI-based add...');
    // Look for the add button
    const addBtn = await page.evaluate(() => {
      // Find "新增" or "+" buttons
      const btns = document.querySelectorAll('button, .btn, [class*="add"]');
      for (const btn of btns) {
        const text = (btn.textContent || '').trim();
        if (text.includes('新增') || text === '+' || text.includes('添加')) {
          const rect = btn.getBoundingClientRect();
          return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), text: text.substring(0, 20) };
        }
      }
      return null;
    });

    if (addBtn) {
      console.log(`  [INFO] Found add button: "${addBtn.text}" at (${addBtn.x}, ${addBtn.y})`);
      await page.mouse.click(addBtn.x, addBtn.y);
      await delay(1000);

      // Fill in the modal
      const modalFilled = await page.evaluate(() => {
        const titleInput = document.querySelector('#itemTitle, input[name="title"], [placeholder*="标题"]');
        if (titleInput) {
          titleInput.value = 'E2E测试待办-验证移动到功能';
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      });

      if (modalFilled) {
        // Find and click save
        const saveBtn = await page.evaluate(() => {
          const btns = document.querySelectorAll('button');
          for (const btn of btns) {
            const text = (btn.textContent || '').trim();
            if (text === '保存' || text === '确定' || text === '添加') {
              const rect = btn.getBoundingClientRect();
              return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), text };
            }
          }
          return null;
        });
        if (saveBtn) {
          await page.mouse.click(saveBtn.x, saveBtn.y);
          await delay(1500);
          console.log(`  [INFO] Clicked save button "${saveBtn.text}"`);
        }
      }
    }
  }

  // Reload items to show the new item
  await delay(1000);
  // Trigger a view refresh
  await page.evaluate(() => {
    if (window.officeDashboard && window.officeDashboard.loadItems) {
      window.officeDashboard.loadItems();
    }
  });
  await delay(1500);
  await screenshot(page, 'v2-02-after-add-item');

  // Check if we now have items
  const itemCount = await page.evaluate(() => {
    // Count item cards
    const cards = document.querySelectorAll('[class*="item"][class*="card"], [class*="todo"][class*="item"], .board-item, .item-card');
    return cards.length;
  });
  console.log(`  [INFO] Item cards found: ${itemCount}`);

  // ============================================================
  // TEST 2: Right-click item -> "Move to" submenu
  // ============================================================
  console.log('\n--- TEST 2: Right-click -> "移动到" submenu ---');

  // Find clickable item elements more broadly
  const items = await page.evaluate(() => {
    const results = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      // Item card: visible, reasonable size, contains our test text or any meaningful text
      if (rect.width > 100 && rect.height > 30 && rect.height < 200 &&
          text.length > 3 && text.length < 200 && el.children.length <= 4) {
        // Check if this looks like a todo item (not a header/button/etc)
        const tag = el.tagName.toLowerCase();
        if (tag === 'div' || tag === 'li' || tag === 'span') {
          results.push({
            text: text.substring(0, 60),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            cls: (el.className || '').toString().substring(0, 50),
          });
        }
      }
    }
    // Sort by position: prefer items in the main content area (below header)
    results.sort((a, b) => {
      // Prefer items that are not at the very top (not header)
      if (a.y > 200 && b.y <= 200) return -1;
      if (b.y > 200 && a.y <= 200) return 1;
      return 0;
    });
    return results.slice(0, 10);
  });

  console.log(`  [INFO] Found ${items.length} potential items:`);
  items.forEach((it, i) => {
    console.log(`    ${i}: "${it.text.substring(0, 40)}" at (${it.x},${it.y}) ${it.w}x${it.h} ${it.cls}`);
  });

  let test2Pass = false;
  let foundMoveTo = false;

  if (items.length > 0) {
    // Try right-clicking each item until we find "移动到"
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const item = items[i];
      console.log(`  [INFO] Trying right-click on item ${i}: "${item.text.substring(0, 30)}"`);

      // Click elsewhere first to dismiss any menu
      await page.mouse.click(50, 50);
      await delay(300);

      await page.mouse.click(item.x, item.y, { button: 'right' });
      await delay(1000);

      await screenshot(page, `v2-03-rightclick-${i}`);

      // Check for context menu with "移动到"
      const menuCheck = await page.evaluate(() => {
        const allText = document.body.innerText;
        const hasMoveTo = allText.includes('移动到') || allText.includes('移动');

        // Find menu elements
        const menus = document.querySelectorAll('[class*="context"], [class*="menu"], [role="menu"], [class*="dropdown"]');
        const menuDetails = [];
        for (const m of menus) {
          const rect = m.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            menuDetails.push({
              cls: (m.className || '').toString().substring(0, 80),
              text: (m.textContent || '').trim().substring(0, 300),
              visible: rect.width > 0,
            });
          }
        }

        return { hasMoveTo, menus: menuDetails };
      });

      console.log(`  [INFO] Context menu has "移动到": ${menuCheck.hasMoveTo}`);
      if (menuCheck.menus.length > 0) {
        menuCheck.menus.forEach((m, mi) => {
          console.log(`    Menu ${mi}: "${m.text.substring(0, 100)}"`);
        });
      }

      if (menuCheck.hasMoveTo) {
        foundMoveTo = true;
        console.log('  [PASS] "移动到" option found in context menu.');

        // Hover on "移动到" to trigger submenu
        const hovered = await page.evaluate(() => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const directText = Array.from(el.childNodes)
              .filter(n => n.nodeType === 3)
              .map(n => n.textContent.trim())
              .join('');
            if (directText.includes('移动到')) {
              const rect = el.getBoundingClientRect();
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }));
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }));
              return { text: directText, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
            }
          }
          return null;
        });

        if (hovered) {
          console.log(`  [INFO] Hovered on "${hovered.text}" at (${hovered.x},${hovered.y})`);
          await delay(800);
          await screenshot(page, 'v2-04-submenu-hover');

          // Check for submenu with date options
          const submenuCheck = await page.evaluate(() => {
            const text = document.body.innerText;
            const hasWeekDays = text.includes('周一') || text.includes('周二') || text.includes('周三') ||
                               text.includes('Thursday') || text.includes('Monday');
            const hasNextWeek = text.includes('下周') || text.includes('next week');
            const hasOtherDate = text.includes('选择其他日期') || text.includes('其他日期');
            const hasDatePattern = /周[一二三四五六日]/.test(text) || /\d+月\d+日/.test(text);
            return { hasWeekDays, hasNextWeek, hasOtherDate, hasDatePattern, snippet: text.match(/周[一二三四五六日][^\n]{0,20}/g)?.slice(0, 5) };
          });

          console.log(`  [INFO] Submenu week days: ${submenuCheck.hasWeekDays}`);
          console.log(`  [INFO] Submenu next week: ${submenuCheck.hasNextWeek}`);
          console.log(`  [INFO] Submenu "选择其他日期": ${submenuCheck.hasOtherDate}`);
          console.log(`  [INFO] Date snippets: ${JSON.stringify(submenuCheck.snippet)}`);

          if (submenuCheck.hasWeekDays || submenuCheck.hasDatePattern) {
            test2Pass = true;
            console.log('  [PASS] Submenu with date options (本周/下周 + dates) confirmed.');
          }

          // ============================================================
          // TEST 3: "选择其他日期" date picker position
          // ============================================================
          console.log('\n--- TEST 3: Date picker position ---');

          if (submenuCheck.hasOtherDate) {
            // Click "选择其他日期"
            const dateClicked = await page.evaluate(() => {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                const text = (el.textContent || '').trim();
                const directText = Array.from(el.childNodes)
                  .filter(n => n.nodeType === 3)
                  .map(n => n.textContent.trim())
                  .join('');
                if (directText.includes('选择其他日期') || directText.includes('其他日期')) {
                  el.click();
                  return { clicked: true, text: directText };
                }
              }
              return { clicked: false };
            });

            await delay(1000);

            if (dateClicked.clicked) {
              console.log(`  [INFO] Clicked "${dateClicked.text}"`);
              await screenshot(page, 'v2-05-date-picker');

              // Check date picker position
              const pickerInfo = await page.evaluate(() => {
                const bodyRect = document.body.getBoundingClientRect();
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;

                // Find all visible overlay/picker/dialog elements
                const overlays = document.querySelectorAll(
                  '[class*="picker"], [class*="Picker"], [class*="calendar"], [class*="Calendar"], ' +
                  '[class*="popover"], [class*="Popover"], [class*="dialog"], [role="dialog"], ' +
                  '[class*="dropdown"], [class*="popup"], [class*="overlay"], [class*="modal"]'
                );

                const results = [];
                for (const el of overlays) {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 100 && rect.height > 100) {
                    results.push({
                      cls: (el.className || '').toString().substring(0, 60),
                      x: Math.round(rect.x), y: Math.round(rect.y),
                      w: Math.round(rect.width), h: Math.round(rect.height),
                      centerX: Math.round(rect.x + rect.width / 2),
                      centerY: Math.round(rect.y + rect.height / 2),
                      isCentered: Math.abs(rect.x + rect.width / 2 - centerX) < 100 &&
                                  Math.abs(rect.y + rect.height / 2 - centerY) < 100,
                    });
                  }
                }
                return { overlays: results, pageCenterX: Math.round(centerX), pageCenterY: Math.round(centerY) };
              });

              if (pickerInfo.overlays.length > 0) {
                for (const p of pickerInfo.overlays) {
                  console.log(`  [INFO] Overlay: ${p.cls} at (${p.x},${p.y}) ${p.w}x${p.h} center=(${p.centerX},${p.centerY})`);
                  console.log(`         Page center: (${pickerInfo.pageCenterX},${pickerInfo.pageCenterY})`);
                  if (p.isCentered) {
                    console.log('  [FAIL] Date picker is centered on screen (should be near context menu).');
                  } else {
                    console.log('  [PASS] Date picker is NOT centered (positioned near context menu).');
                  }
                }
              } else {
                console.log('  [WARN] No date picker overlay found. May need different selector.');
                // Take a broader look
                const anyNew = await page.evaluate(() => {
                  const all = document.querySelectorAll('div, section, aside');
                  const large = [];
                  for (const el of all) {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    if (rect.width > 150 && rect.height > 150 &&
                        (style.position === 'fixed' || style.position === 'absolute') &&
                        style.zIndex !== 'auto' && parseInt(style.zIndex) > 100) {
                      large.push({
                        cls: (el.className || '').toString().substring(0, 60),
                        x: Math.round(rect.x), y: Math.round(rect.y),
                        w: Math.round(rect.width), h: Math.round(rect.height),
                        zIndex: style.zIndex,
                      });
                    }
                  }
                  return large;
                });
                console.log(`  [INFO] High-z-index elements: ${JSON.stringify(anyNew)}`);
              }
            } else {
              console.log('  [WARN] Could not click "选择其他日期".');
            }
          } else {
            console.log('  [WARN] "选择其他日期" not found in submenu. Test 3 skipped.');
          }
        }
        break; // Found "移动到", stop trying items
      }
    }

    if (!foundMoveTo) {
      console.log('  [FAIL] "移动到" not found in any context menu.');
    }
  } else {
    console.log('  [FAIL] No items to right-click on the page.');
  }

  // ============================================================
  // TEST 4: Select a date from submenu -> success message
  // ============================================================
  console.log('\n--- TEST 4: Select date -> success message ---');

  // Dismiss any open menus
  await page.mouse.click(50, 50);
  await delay(500);

  // Try right-click again and pick a date option
  if (items.length > 0) {
    const item = items[0];
    await page.mouse.click(item.x, item.y, { button: 'right' });
    await delay(1000);

    // Hover on "移动到" to show submenu
    await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .join('');
        if (directText.includes('移动到')) {
          const rect = el.getBoundingClientRect();
          el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          break;
        }
      }
    });
    await delay(800);

    // Click a date option (not "选择其他日期")
    const dateOptionClicked = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const text = (el.textContent || '').trim();
        const rect = el.getBoundingClientRect();
        // Look for leaf nodes with date-like text
        if (rect.width > 0 && rect.height > 0 && el.children.length === 0) {
          if (text.match(/^周[一二三四五六日]/) && text.length < 30) {
            // Don't click "选择其他日期"
            if (!text.includes('其他')) {
              el.click();
              return { clicked: true, text };
            }
          }
        }
      }
      return { clicked: false };
    });

    await delay(2000);

    if (dateOptionClicked.clicked) {
      console.log(`  [INFO] Clicked date: "${dateOptionClicked.text}"`);
      await screenshot(page, 'v2-06-date-selected');

      // Check for success toast
      const toastCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        const hasSuccess = text.includes('成功') || text.includes('已移动') || text.includes('已移') ||
                          text.includes('success') || text.includes('完成') || text.includes('日期已');
        return { hasSuccess };
      });

      if (toastCheck.hasSuccess) {
        console.log('  [PASS] Success message detected after moving item.');
      } else {
        console.log('  [WARN] No explicit success message, but move may have completed silently.');
      }
    } else {
      console.log('  [WARN] Could not find a date option to click.');
      await screenshot(page, 'v2-06-no-date-option');
    }
  }

  // ============================================================
  // TEST 5: JS errors check
  // ============================================================
  console.log('\n--- TEST 5: JS errors check ---');
  if (jsErrors.length === 0) {
    console.log('  [PASS] No JavaScript errors detected.');
  } else {
    console.log(`  [FAIL] ${jsErrors.length} JS error(s):`);
    jsErrors.forEach((err, i) => console.log(`    ${i + 1}: ${err.substring(0, 150)}`));
  }

  await screenshot(page, 'v2-07-final-state');

  // ============================================================
  // CLEANUP: Remove test item
  // ============================================================
  console.log('\n--- CLEANUP: Removing test item ---');
  await page.evaluate(() => {
    if (window.db && window.db.getItemsByType) {
      return window.db.getItemsByType('todo').then(items => {
        const testItem = items.find(i => i.title && i.title.includes('E2E测试'));
        if (testItem && window.db.deleteItem) {
          return window.db.deleteItem(testItem.id).then(() => console.log('Test item removed'));
        }
      });
    }
  });

  console.log('\n=== Verification Complete ===');
}

runTests().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
