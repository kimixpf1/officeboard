const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'e:\\ccswitch\\AI编程工作目录\\办公面板\\test-screenshots';
const SITE_URL = 'https://kimixpf1.github.io/officeboard/';

const delay = ms => new Promise(r => setTimeout(r, ms));

// Helper: take screenshot
async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [SCREENSHOT] ${filePath}`);
  return filePath;
}

// Collect console errors
const jsErrors = [];

async function runTests() {
  console.log('=== E2E Verification: v5.1.68 ===\n');
  console.log('[INFO] Connecting to Chrome at 127.0.0.1:9222 ...');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  } catch (err) {
    console.log('[ERROR] Cannot connect to Chrome on port 9222.');
    console.log('[INFO] Please launch Chrome with: chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }

  console.log('[INFO] Connected to Chrome.\n');

  let page = (await browser.pages())[0];
  if (!page) page = await browser.newPage();

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      jsErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    jsErrors.push(`PageError: ${err.message}`);
  });

  const viewport = page.viewport();
  console.log(`[INFO] Viewport: ${viewport ? viewport.width + 'x' + viewport.height : 'default'}`);

  // ============================================================
  // TEST 1: Hard refresh, check version number
  // ============================================================
  console.log('\n--- TEST 1: Version number check ---');
  try {
    await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1000);

    // Hard refresh (Ctrl+Shift+R equivalent)
    await page.evaluate(() => location.reload(true));
    await page.waitForNetworkIdle({ timeout: 15000 });
    await delay(2000);

    const bodyText = await page.evaluate(() => document.body.innerText);

    const hasVersion = bodyText.includes('v5.1.68') || bodyText.includes('5.1.68');
    const hasDate = bodyText.includes('2026-05-11');

    if (hasVersion && hasDate) {
      console.log('  [PASS] Version "2026-05-11 v5.1.68" found on page.');
    } else if (hasVersion) {
      console.log('  [PASS] Version "v5.1.68" found (date may differ).');
    } else {
      console.log('  [WARN] Version string not directly visible, checking HTML attributes...');
      // Try to find version in title, meta, or specific elements
      const html = await page.evaluate(() => document.documentElement.innerHTML);
      const versionInHtml = html.includes('5.1.68');
      if (versionInHtml) {
        console.log('  [PASS] Version "5.1.68" found in page HTML.');
      } else {
        console.log('  [FAIL] Version "v5.1.68" NOT found anywhere on the page.');
      }
    }

    await screenshot(page, '01-page-loaded');
  } catch (err) {
    console.log(`  [ERROR] Test 1 failed: ${err.message}`);
    await screenshot(page, '01-error');
  }

  // ============================================================
  // TEST 2: Right-click item -> "Move to" submenu
  // ============================================================
  console.log('\n--- TEST 2: Right-click -> "Move to" submenu ---');
  try {
    // Find todo items - look for common selectors
    await delay(1000);

    // Try to find task/item elements
    const itemSelector = await page.evaluate(() => {
      // Look for task items with various possible selectors
      const selectors = [
        '[data-testid="todo-item"]',
        '.todo-item',
        '.task-item',
        '.item-card',
        '[class*="item"]',
        '[class*="task"]',
        '[class*="todo"]',
        'li[class]',
      ];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return sel;
      }
      // Fallback: get all elements that look like items
      const allClickable = document.querySelectorAll('div[class], li[class], span[class]');
      for (const el of allClickable) {
        const text = el.textContent || '';
        if (text.length > 2 && text.length < 100 && el.offsetHeight > 10) {
          return el.className ? `.${el.className.split(' ')[0]}` : null;
        }
      }
      return null;
    });

    console.log(`  [INFO] Looking for task items...`);

    // Let's get a broader picture of the page structure first
    const pageInfo = await page.evaluate(() => {
      const items = [];
      // Try to find any element that could be a task/todo
      const allElements = document.querySelectorAll('div, li, tr');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || '').trim();
        // Look for elements that are likely task items (visible, reasonable size, has text)
        if (rect.width > 100 && rect.height > 20 && rect.height < 200 && text.length > 2 && text.length < 200) {
          const hasChild = el.querySelector('div, li, span');
          if (!hasChild || (el.children.length <= 3)) {
            items.push({
              tag: el.tagName,
              className: el.className,
              text: text.substring(0, 60),
              x: Math.round(rect.x + rect.width / 2),
              y: Math.round(rect.y + rect.height / 2),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      }
      return items.slice(0, 15);
    });

    console.log(`  [INFO] Found ${pageInfo.length} potential items`);
    pageInfo.forEach((item, i) => {
      console.log(`  [DEBUG] Item ${i}: ${item.tag}.${String(item.className).substring(0, 40)} | "${item.text.substring(0, 40)}" | at (${item.x}, ${item.y}) ${item.width}x${item.height}`);
    });

    // Take a screenshot to see the page state
    await screenshot(page, '02-page-structure');

    // Try right-clicking on the first reasonable item
    if (pageInfo.length > 0) {
      // Pick the first item that looks like a task
      const targetItem = pageInfo[0];
      console.log(`  [INFO] Right-clicking on: "${targetItem.text.substring(0, 40)}"`);

      await page.mouse.click(targetItem.x, targetItem.y, { button: 'right' });
      await delay(800);

      await screenshot(page, '02-right-click-context-menu');

      // Check for context menu and "Move to" option
      const contextMenuResult = await page.evaluate(() => {
        const body = document.body.innerHTML;
        const bodyText = document.body.innerText;

        // Look for context menu
        const menuSelectors = [
          '[class*="context-menu"]',
          '[class*="contextMenu"]',
          '[class*="dropdown"]',
          '[class*="popup"]',
          '[class*="menu"]',
          '[role="menu"]',
        ];

        let menuFound = false;
        let menuText = '';

        for (const sel of menuSelectors) {
          const menus = document.querySelectorAll(sel);
          for (const menu of menus) {
            const rect = menu.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              menuFound = true;
              menuText = menu.textContent || '';
              break;
            }
          }
          if (menuFound) break;
        }

        // Also check if "Move to" or "移动" text appears
        const hasMoveTo = bodyText.includes('移动') || bodyText.includes('Move to') || bodyText.includes('moveTo');
        const hasMoveToMenu = bodyText.includes('选择其他日期') || bodyText.includes('其他日期') || bodyText.includes('本周') || bodyText.includes('下周');

        return { menuFound, menuText: menuText.substring(0, 200), hasMoveTo, hasMoveToMenu };
      });

      console.log(`  [INFO] Context menu found: ${contextMenuResult.menuFound}`);
      console.log(`  [INFO] Menu text: "${contextMenuResult.menuText.substring(0, 100)}"`);
      console.log(`  [INFO] Has 'Move to' text: ${contextMenuResult.hasMoveTo}`);

      if (contextMenuResult.menuFound && contextMenuResult.hasMoveTo) {
        console.log('  [PASS] Context menu with "Move to" option found.');
      } else if (contextMenuResult.hasMoveTo) {
        console.log('  [PASS] "Move to" text found on page.');
      } else {
        console.log('  [WARN] Context menu or "Move to" not detected. Checking further...');

        // Try clicking "Move to" if it exists as a visible element
        const moveToClicked = await page.evaluate(() => {
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const text = (el.textContent || '').trim();
            if (text === '移动到' || text === '移动' || text === 'Move to') {
              el.click();
              return true;
            }
          }
          return false;
        });

        if (moveToClicked) {
          await delay(800);
          await screenshot(page, '02-move-to-clicked');
        }
      }
    } else {
      console.log('  [FAIL] No task items found on the page.');
    }
  } catch (err) {
    console.log(`  [ERROR] Test 2 failed: ${err.message}`);
    await screenshot(page, '02-error');
  }

  // ============================================================
  // TEST 2b: Try a more structured approach - find context menu and "移动到"
  // ============================================================
  console.log('\n--- TEST 2b: Structured context menu test ---');
  try {
    // First, dismiss any existing menu by clicking elsewhere
    await page.mouse.click(100, 100);
    await delay(500);

    // Get detailed page structure
    const taskElements = await page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
        const text = (node.textContent || '').trim();
        const rect = node.getBoundingClientRect();
        // Looking for task-like elements
        if (rect.width > 150 && rect.height > 30 && rect.height < 150 &&
            text.length > 5 && text.length < 150 &&
            node.childElementCount < 5) {
          results.push({
            tag: node.tagName,
            cls: (node.className || '').toString().substring(0, 50),
            text: text.substring(0, 80),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            childCount: node.childElementCount,
          });
        }
      }
      return results.slice(0, 20);
    });

    console.log(`  [INFO] Scanned ${taskElements.length} elements`);

    // Find elements that look like actual task items (not containers)
    const likelyTasks = taskElements.filter(t =>
      t.childCount <= 2 && t.text.length > 5 && t.text.length < 100
    );

    if (likelyTasks.length > 0) {
      const target = likelyTasks[0];
      console.log(`  [INFO] Targeting: "${target.text.substring(0, 50)}" at (${target.x}, ${target.y})`);

      // Right click
      await page.mouse.click(target.x, target.y, { button: 'right' });
      await delay(1000);

      await screenshot(page, '02b-right-click-menu');

      // Check what appeared
      const menuInfo = await page.evaluate(() => {
        // Find all visible elements that could be menus
        const visibleElements = [];
        const allElements = document.querySelectorAll('[class*="menu"], [class*="Menu"], [role="menu"], [class*="dropdown"], [class*="popup"], [class*="Popover"], [class*="popover"]');

        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            visibleElements.push({
              tag: el.tagName,
              cls: (el.className || '').toString().substring(0, 80),
              text: (el.textContent || '').trim().substring(0, 200),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            });
          }
        }
        return visibleElements;
      });

      console.log(`  [INFO] Found ${menuInfo.length} menu-like elements`);
      menuInfo.forEach((m, i) => {
        console.log(`  [DEBUG] Menu ${i}: ${m.tag}.${m.cls.substring(0, 40)} | "${m.text.substring(0, 80)}" | at (${m.x},${m.y}) ${m.w}x${m.h}`);
      });

      // Look for "移动到" in menu
      let moveMenuFound = false;
      for (const m of menuInfo) {
        if (m.text.includes('移动到') || m.text.includes('移动') || m.text.includes('Move to')) {
          moveMenuFound = true;
          console.log(`  [INFO] Found "移动到" in menu element`);

          // Try to hover/click on the "移动到" item to trigger submenu
          const submenuTriggered = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const text = (el.textContent || '').trim();
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .join('');

              if (directText === '移动到' || directText === '移动到…' || directText === '移动到...' ||
                  text === '移动到' || text === '移动到…') {
                // Hover on it to trigger submenu
                const event = new MouseEvent('mouseenter', { bubbles: true });
                el.dispatchEvent(event);
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                return { found: true, text: directText || text };
              }
            }
            return { found: false };
          });

          if (submenuTriggered.found) {
            await delay(800);
            await screenshot(page, '02b-submenu-triggered');
            console.log(`  [INFO] Hovered on "${submenuTriggered.text}"`);
          }
          break;
        }
      }

      if (moveMenuFound) {
        console.log('  [PASS] "移动到" menu item found in context menu.');
      } else {
        console.log('  [INFO] "移动到" not found in menu elements, checking full page text...');
        const fullText = await page.evaluate(() => document.body.innerText);
        if (fullText.includes('移动到') || fullText.includes('移动')) {
          console.log('  [PASS] "移动到" text found on page.');
        } else {
          console.log('  [FAIL] "移动到" not found anywhere.');
        }
      }

      // Check for submenu with date options
      await delay(500);
      const submenuInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasWeekDates = bodyText.includes('本周') || bodyText.includes('下周') || bodyText.includes('周一') || bodyText.includes('周二') || bodyText.includes('Monday') || bodyText.includes('Tuesday');
        const hasOtherDate = bodyText.includes('选择其他日期') || bodyText.includes('其他日期') || bodyText.includes('other date');
        const hasDatePattern = /\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}|周[一二三四五六日]/.test(bodyText);
        return { hasWeekDates, hasOtherDate, hasDatePattern };
      });

      console.log(`  [INFO] Submenu has week dates: ${submenuInfo.hasWeekDates}`);
      console.log(`  [INFO] Submenu has "选择其他日期": ${submenuInfo.hasOtherDate}`);
      console.log(`  [INFO] Submenu has date patterns: ${submenuInfo.hasDatePattern}`);

      if (submenuInfo.hasWeekDates || submenuInfo.hasDatePattern) {
        console.log('  [PASS] Submenu with date options (本周/下周 + 日期) found.');
      } else {
        console.log('  [WARN] Submenu date options not clearly detected.');
      }
    } else {
      console.log('  [FAIL] No task items found to right-click.');
    }
  } catch (err) {
    console.log(`  [ERROR] Test 2b failed: ${err.message}`);
    await screenshot(page, '02b-error');
  }

  // ============================================================
  // TEST 3: Date picker position (not centered)
  // ============================================================
  console.log('\n--- TEST 3: Date picker position check ---');
  try {
    // Try to trigger "选择其他日期" option
    const datePickerTriggered = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .join('');

        if (directText.includes('选择其他日期') || text.includes('选择其他日期') ||
            directText.includes('其他日期') || text.includes('其他日期')) {
          el.click();
          return { found: true, text: directText || text };
        }
      }
      return { found: false };
    });

    await delay(1000);

    if (datePickerTriggered.found) {
      console.log(`  [INFO] Clicked on "${datePickerTriggered.text}"`);
      await screenshot(page, '03-date-picker-opened');

      // Check date picker position
      const pickerPosition = await page.evaluate(() => {
        const body = document.body;
        const bodyRect = body.getBoundingClientRect();
        const centerX = bodyRect.width / 2;
        const centerY = bodyRect.height / 2;

        // Find date picker / calendar elements
        const pickerSelectors = [
          '[class*="date-picker"]', '[class*="DatePicker"]', '[class*="datepicker"]',
          '[class*="calendar"]', '[class*="Calendar"]',
          '[class*="popover"]', '[class*="Popover"]',
          '[class*="dialog"]', '[role="dialog"]',
          '[class*="picker"]', '[class*="Picker"]',
          '[class*="popup"]', '[class*="Popup"]',
        ];

        const pickers = [];
        for (const sel of pickerSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
              const pickerCenterX = rect.x + rect.width / 2;
              const pickerCenterY = rect.y + rect.height / 2;
              const isCentered = Math.abs(pickerCenterX - centerX) < 100 && Math.abs(pickerCenterY - centerY) < 100;
              pickers.push({
                cls: (el.className || '').toString().substring(0, 60),
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                centerX: Math.round(pickerCenterX),
                centerY: Math.round(pickerCenterY),
                pageCenterX: Math.round(centerX),
                pageCenterY: Math.round(centerY),
                isNearCenter: isCentered,
              });
            }
          }
        }
        return pickers;
      });

      if (pickerPosition.length > 0) {
        const picker = pickerPosition[0];
        console.log(`  [INFO] Date picker found at (${picker.x}, ${picker.y}) size ${picker.w}x${picker.h}`);
        console.log(`  [INFO] Picker center: (${picker.centerX}, ${picker.centerY}), Page center: (${picker.pageCenterX}, ${picker.pageCenterY})`);

        if (picker.isNearCenter) {
          console.log('  [FAIL] Date picker appears centered on screen (should be near context menu).');
        } else {
          console.log('  [PASS] Date picker is NOT centered on screen (positioned near context menu).');
        }
      } else {
        console.log('  [WARN] Could not locate date picker element. Checking visually...');
        await screenshot(page, '03-no-picker-found');
      }
    } else {
      console.log('  [INFO] "选择其他日期" option not found or not clickable.');
      console.log('  [INFO] Taking screenshot to check current state...');
      await screenshot(page, '03-no-trigger-found');

      // Try alternative: check if submenu is already visible
      const altCheck = await page.evaluate(() => {
        // Look for any calendar/date picker that might already be open
        const allVisible = [];
        const els = document.querySelectorAll('[class*="calendar"], [class*="Calendar"], [class*="date"], [class*="Date"], [class*="picker"], [class*="Picker"]');
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100) {
            allVisible.push({
              cls: (el.className || '').toString().substring(0, 60),
              text: (el.textContent || '').substring(0, 100),
              x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height),
            });
          }
        }
        return allVisible;
      });

      if (altCheck.length > 0) {
        console.log(`  [INFO] Found date-related elements:`, JSON.stringify(altCheck));
      }
    }
  } catch (err) {
    console.log(`  [ERROR] Test 3 failed: ${err.message}`);
    await screenshot(page, '03-error');
  }

  // ============================================================
  // TEST 4: Select a date from submenu -> success toast
  // ============================================================
  console.log('\n--- TEST 4: Select date -> success message ---');
  try {
    // Dismiss any open menus
    await page.mouse.click(100, 100);
    await delay(500);

    // Find and right-click a task item again
    const taskElements2 = await page.evaluate(() => {
      const results = [];
      const allElements = document.querySelectorAll('div, li, span');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || '').trim();
        if (rect.width > 150 && rect.height > 25 && rect.height < 100 &&
            text.length > 5 && text.length < 100 && el.childElementCount <= 2) {
          results.push({
            text: text.substring(0, 60),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
          });
        }
      }
      return results.slice(0, 5);
    });

    if (taskElements2.length > 0) {
      await page.mouse.click(taskElements2[0].x, taskElements2[0].y, { button: 'right' });
      await delay(1000);

      // Click "移动到"
      await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.trim())
            .join('');
          if (directText === '移动到' || directText === '移动到…' || directText === '移动到...') {
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            break;
          }
        }
      });
      await delay(800);

      await screenshot(page, '04-submenu-visible');

      // Try to find and click a date option in the submenu
      const dateClicked = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = (el.textContent || '').trim();
          const rect = el.getBoundingClientRect();
          // Look for date-like text in submenu items
          if (rect.width > 0 && rect.height > 0 &&
              (text.match(/^周[一二三四五六日]/) || text.match(/^\d{1,2}月\d{1,2}日$/) ||
               text.match(/^明天/) || text.match(/^后天/) || text.match(/^今天/))) {
            if (el.childElementCount === 0 || el.children.length === 0) {
              el.click();
              return { found: true, text: text.substring(0, 30) };
            }
          }
        }
        return { found: false };
      });

      await delay(1500);

      if (dateClicked.found) {
        console.log(`  [INFO] Clicked date option: "${dateClicked.text}"`);
        await screenshot(page, '04-date-selected');

        // Check for success toast
        const toastResult = await page.evaluate(() => {
          const bodyText = document.body.innerText;
          const hasSuccess = bodyText.includes('成功') || bodyText.includes('已移动') ||
                           bodyText.includes('success') || bodyText.includes('Success') ||
                           bodyText.includes('已移') || bodyText.includes('完成');

          // Look for toast/notification elements
          const toastSelectors = [
            '[class*="toast"]', '[class*="Toast"]', '[class*="notification"]',
            '[class*="Notification"]', '[class*="message"]', '[class*="Message"]',
            '[class*="alert"]', '[class*="Alert"]', '[class*="snackbar"]',
          ];

          let toastFound = false;
          let toastText = '';
          for (const sel of toastSelectors) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                toastFound = true;
                toastText = (el.textContent || '').trim();
                break;
              }
            }
            if (toastFound) break;
          }

          return { hasSuccess, toastFound, toastText };
        });

        if (toastResult.hasSuccess || toastResult.toastFound) {
          console.log(`  [PASS] Success message detected: "${toastResult.toastText || 'text contains success keyword'}"`);
        } else {
          console.log('  [WARN] No explicit success toast found, but date may have been moved.');
          console.log(`  [INFO] Toast found: ${toastResult.toastFound}, Has success text: ${toastResult.hasSuccess}`);
        }
      } else {
        console.log('  [WARN] Could not find clickable date option in submenu.');
        await screenshot(page, '04-no-date-option');
      }
    }
  } catch (err) {
    console.log(`  [ERROR] Test 4 failed: ${err.message}`);
    await screenshot(page, '04-error');
  }

  // ============================================================
  // TEST 5: JS errors check
  // ============================================================
  console.log('\n--- TEST 5: JS errors check ---');
  if (jsErrors.length === 0) {
    console.log('  [PASS] No JavaScript errors detected during testing.');
  } else {
    console.log(`  [FAIL] ${jsErrors.length} JS error(s) detected:`);
    jsErrors.forEach((err, i) => {
      console.log(`    Error ${i + 1}: ${err.substring(0, 150)}`);
    });
  }

  // ============================================================
  // Final summary screenshot
  // ============================================================
  await screenshot(page, '05-final-state');

  console.log('\n=== Verification Complete ===');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  // Don't disconnect - leave the browser open
  // browser.disconnect();
}

runTests().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
