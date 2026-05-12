/**
 * E2E Verification for Office Dashboard v5.66
 * Uses puppeteer-core with local Chrome
 */

const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Users\\42151\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://kimixpf1.github.io/officeboard/';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'e2e-screenshots');

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
function record(name, pass, details = '') {
  results.push({ name, pass, details });
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${details ? ' -- ' + details : ''}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('=== Office Dashboard v5.66 E2E Verification ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    pageErrors.push(err.message);
    consoleErrors.push(`PageError: ${err.message}`);
  });

  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), error: req.failure().errorText });
  });

  try {
    // ========================================
    // SETUP: Load page
    // ========================================
    console.log('--- Loading page ---');
    await page.setCacheEnabled(false);
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    record('Page loads (HTTP 200)', response && response.status() === 200, `HTTP ${response ? response.status() : 'N/A'}`);
    await sleep(3000); // Give app time to init

    // Close any modal that might be showing
    await page.evaluate(() => {
      // Close API key modal if visible
      const closeBtn = document.getElementById('closeApiKeyModal');
      if (closeBtn) closeBtn.click();
      // Close any overlay
      document.querySelectorAll('.modal-overlay.active, .overlay.active').forEach(o => o.classList.remove('active'));
    });
    await sleep(500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-load.png') });

    // ========================================
    // TEST 1: Version & Resources
    // ========================================
    console.log('\n--- Test 1: Version & Resources ---');

    const versionInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/v5\.\d+/);
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
      return { version: match ? match[0] : null, scripts };
    });

    record('Version badge shows v5.66', versionInfo.version === 'v5.66', versionInfo.version || 'Not found');
    record('backup.js loaded', versionInfo.scripts.some(s => s.includes('backup')), versionInfo.scripts.find(s => s.includes('backup')) || 'Not found');
    record('context-menu.js loaded', versionInfo.scripts.some(s => s.includes('context-menu')), versionInfo.scripts.find(s => s.includes('context-menu')) || 'Not found');
    record('app.js loaded', versionInfo.scripts.some(s => s.includes('app')), versionInfo.scripts.find(s => s.includes('app')) || 'Not found');

    // Verify script content integrity
    const scriptIntegrity = await page.evaluate(async () => {
      const checkScript = async (url, keyword) => {
        try {
          const r = await fetch(url);
          const text = await r.text();
          return { status: r.status, hasKeyword: text.includes(keyword), size: text.length };
        } catch (e) { return { status: 0, error: e.message }; }
      };
      return {
        backup: await checkScript('js/core/backup.js?v=1', 'BackupCore'),
        contextMenu: await checkScript('js/core/context-menu.js?v=1', 'ContextMenuCore'),
      };
    });

    record('backup.js contains BackupCore', scriptIntegrity.backup.status === 200 && scriptIntegrity.backup.hasKeyword,
      `Status: ${scriptIntegrity.backup.status}, Size: ${scriptIntegrity.backup.size}`);
    record('context-menu.js contains ContextMenuCore', scriptIntegrity.contextMenu.status === 200 && scriptIntegrity.contextMenu.hasKeyword,
      `Status: ${scriptIntegrity.contextMenu.status}, Size: ${scriptIntegrity.contextMenu.size}`);

    // ========================================
    // TEST 2: App initialization & errors
    // ========================================
    console.log('\n--- Test 2: App initialization ---');

    // Check for ContextMenuCore/BackupCore errors
    const ctxErrors = pageErrors.filter(e => e.includes('ContextMenuCore'));
    const bkpErrors = pageErrors.filter(e => e.includes('BackupCore'));
    record('ContextMenuCore is defined (no ReferenceError)', ctxErrors.length === 0,
      ctxErrors.length > 0 ? `ERROR: ${ctxErrors[0]}` : 'OK');
    record('BackupCore is defined (no ReferenceError)', bkpErrors.length === 0,
      bkpErrors.length > 0 ? `ERROR: ${bkpErrors[0]}` : 'OK');

    // Check all page errors
    const criticalErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('DevTools'));
    record('No critical page errors', criticalErrors.length === 0,
      criticalErrors.length === 0 ? 'Clean' : criticalErrors.join(' | '));

    // Check app instance
    const appState = await page.evaluate(() => {
      const app = window.dashboard || window.officeDashboard || window.app;
      if (!app) return { exists: false };
      const methods = [
        'showContextMenu', 'hideContextMenu', 'initContextMenu', 'executeContextAction',
        'exportData', 'importData', 'startDailyBackupSchedule',
        'shareCalendarScreenshot', 'editItem', 'showDeleteConfirm',
        'toggleItemComplete', 'toggleItemPin', 'toggleItemSink',
      ];
      const methodCheck = {};
      for (const m of methods) {
        methodCheck[m] = typeof app[m] === 'function';
      }
      return { exists: true, methods: methodCheck, constructor: app.constructor?.name };
    });

    console.log('  App state:', JSON.stringify(appState, null, 2));

    record('window.dashboard exists', appState.exists, appState.exists ? `Class: ${appState.constructor}` : 'Not found');
    record('Context menu methods on instance',
      appState.exists && appState.methods.showContextMenu && appState.methods.hideContextMenu && appState.methods.executeContextAction,
      appState.exists ? `showContextMenu: ${appState.methods.showContextMenu}, hideContextMenu: ${appState.methods.hideContextMenu}` : 'N/A'
    );
    record('Backup methods on instance',
      appState.exists && appState.methods.exportData && appState.methods.importData && appState.methods.startDailyBackupSchedule,
      appState.exists ? `exportData: ${appState.methods.exportData}, importData: ${appState.methods.importData}` : 'N/A'
    );

    // ========================================
    // TEST 3: Context menu on todo items
    // ========================================
    console.log('\n--- Test 3: Context menu ---');

    // First add a test item if none exist
    const itemCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card');
      return cards.length;
    });
    console.log(`  Initial card count: ${itemCount}`);

    if (itemCount === 0) {
      // Add test items via global db
      const addResult = await page.evaluate(async () => {
        const app = window.dashboard || window.officeDashboard;
        if (!window.db) return { error: 'No global db' };
        try {
          await window.db.addItem({
            type: 'todo', text: 'E2E测试待办事项', completed: false, pinned: false, sunk: false,
            priority: 'medium', source: 'e2e-test',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          });
          await window.db.addItem({
            type: 'meeting', text: 'E2E测试会议',
            date: new Date().toISOString().split('T')[0],
            startTime: '10:00', endTime: '11:00', source: 'e2e-test',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          });
          if (app && app.loadItems) await app.loadItems();
          return { success: true };
        } catch (e) { return { error: e.message }; }
      });
      console.log('  Add test items:', JSON.stringify(addResult));
      await sleep(1000);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-with-items.png') });

    // Now test right-click
    const cardCountAfter = await page.evaluate(() => document.querySelectorAll('.card').length);
    console.log(`  Card count after adding: ${cardCountAfter}`);

    if (cardCountAfter > 0) {
      // Right-click the first card
      const firstCard = await page.$('.card');
      if (firstCard) {
        const box = await firstCard.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
          await sleep(600);

          const menuCheck = await page.evaluate(() => {
            const menu = document.getElementById('contextMenu');
            if (!menu) return { found: false, reason: 'No #contextMenu element' };
            const style = window.getComputedStyle(menu);
            const isVisible = style.display !== 'none' && menu.offsetHeight > 0;
            return {
              found: isVisible,
              display: style.display,
              height: menu.offsetHeight,
              items: Array.from(menu.querySelectorAll('.context-menu-item')).map(i => ({
                action: i.dataset.action,
                text: i.textContent.trim(),
                display: i.style.display || 'block'
              }))
            };
          });

          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-context-menu.png') });

          record('Right-click shows context menu',
            menuCheck.found,
            menuCheck.found
              ? `Items: ${menuCheck.items.map(i => i.text).join(', ')}`
              : `display: ${menuCheck.display}, reason: ${menuCheck.reason}`
          );

          if (menuCheck.found) {
            const actions = menuCheck.items.map(i => i.action);
            record('Menu has edit option', actions.includes('edit'), `Actions: ${actions.join(', ')}`);
            record('Menu has complete option', actions.includes('complete'), '');
            record('Menu has pin option', actions.includes('pin'), '');
            record('Menu has delete option', actions.includes('delete'), '');
            record('Menu has priority option', actions.includes('priority'), '');

            // Test: Click delete -> should show confirmation
            const deleteClicked = await page.evaluate(() => {
              const menu = document.getElementById('contextMenu');
              if (!menu) return false;
              for (const item of menu.querySelectorAll('.context-menu-item')) {
                if (item.dataset.action === 'delete') { item.click(); return true; }
              }
              return false;
            });
            await sleep(500);

            if (deleteClicked) {
              const confirmResult = await page.evaluate(() => {
                const modals = document.querySelectorAll('.modal, [class*="confirm"], [role="dialog"]');
                for (const m of modals) {
                  const style = window.getComputedStyle(m);
                  if (style.display !== 'none' && style.visibility !== 'hidden' && m.offsetHeight > 0) {
                    const text = m.textContent.trim();
                    const hasConfirm = text.includes('确认') || text.includes('删除') || text.includes('Confirm') || text.includes('Delete');
                    return { found: true, isDeleteConfirm: hasConfirm, text: text.substring(0, 150) };
                  }
                }
                return { found: false };
              });

              await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-delete-confirm.png') });
              record('Delete shows confirmation dialog',
                confirmResult.found && confirmResult.isDeleteConfirm,
                confirmResult.found ? `"${confirmResult.text}"` : 'No dialog found'
              );

              // Dismiss: click cancel
              await page.evaluate(() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                  const t = btn.textContent.trim();
                  if (t === '取消' || t === 'Cancel') { btn.click(); return; }
                }
              });
              await sleep(300);
            }

            // Test: Complete toggle
            const firstCard2 = await page.$('.card');
            if (firstCard2) {
              const box2 = await firstCard2.boundingBox();
              await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2, { button: 'right' });
              await sleep(400);

              const completeResult = await page.evaluate(() => {
                const menu = document.getElementById('contextMenu');
                if (!menu) return { clicked: false };
                for (const item of menu.querySelectorAll('.context-menu-item')) {
                  if ((item.dataset.action === 'complete') && item.style.display !== 'none') {
                    item.click();
                    return { clicked: true, text: item.textContent.trim() };
                  }
                }
                return { clicked: false };
              });
              await sleep(300);
              record('Complete toggle via context menu', completeResult.clicked,
                completeResult.clicked ? completeResult.text : 'Complete option not found/visible');

              // Undo
              if (completeResult.clicked) {
                const firstCard2b = await page.$('.card');
                if (firstCard2b) {
                  const box2b = await firstCard2b.boundingBox();
                  await page.mouse.click(box2b.x + box2b.width / 2, box2b.y + box2b.height / 2, { button: 'right' });
                  await sleep(400);
                  await page.evaluate(() => {
                    const menu = document.getElementById('contextMenu');
                    if (!menu) return;
                    for (const item of menu.querySelectorAll('.context-menu-item')) {
                      if (item.dataset.action === 'uncomplete' && item.style.display !== 'none') {
                        item.click(); return;
                      }
                    }
                  });
                  await sleep(300);
                }
              }
            }

            // Test: Pin toggle
            const firstCard3 = await page.$('.card');
            if (firstCard3) {
              const box3 = await firstCard3.boundingBox();
              await page.mouse.click(box3.x + box3.width / 2, box3.y + box3.height / 2, { button: 'right' });
              await sleep(400);

              const pinResult = await page.evaluate(() => {
                const menu = document.getElementById('contextMenu');
                if (!menu) return { clicked: false };
                for (const item of menu.querySelectorAll('.context-menu-item')) {
                  if (item.dataset.action === 'pin' && item.style.display !== 'none') {
                    item.click();
                    return { clicked: true, text: item.textContent.trim() };
                  }
                }
                return { clicked: false };
              });
              await sleep(300);
              record('Pin toggle via context menu', pinResult.clicked, pinResult.clicked ? pinResult.text : 'Pin not found');

              // Undo pin
              if (pinResult.clicked) {
                await sleep(100);
                const firstCard3b = await page.$('.card');
                if (firstCard3b) {
                  const box3b = await firstCard3b.boundingBox();
                  await page.mouse.click(box3b.x + box3b.width / 2, box3b.y + box3b.height / 2, { button: 'right' });
                  await sleep(400);
                  await page.evaluate(() => {
                    const menu = document.getElementById('contextMenu');
                    if (!menu) return;
                    for (const item of menu.querySelectorAll('.context-menu-item')) {
                      if (item.dataset.action === 'unpin' && item.style.display !== 'none') {
                        item.click(); return;
                      }
                    }
                  });
                  await sleep(300);
                }
              }
            }

            // Test: Priority submenu
            const firstCard4 = await page.$('.card');
            if (firstCard4) {
              const box4 = await firstCard4.boundingBox();
              await page.mouse.click(box4.x + box4.width / 2, box4.y + box4.height / 2, { button: 'right' });
              await sleep(400);

              const priorityResult = await page.evaluate(() => {
                return new Promise(resolve => {
                  const menu = document.getElementById('contextMenu');
                  if (!menu) return resolve({ clicked: false });
                  for (const item of menu.querySelectorAll('.context-menu-item')) {
                    if (item.dataset.action === 'priority' && item.style.display !== 'none') {
                      item.click();
                      setTimeout(() => {
                        const submenus = document.querySelectorAll('.context-menu');
                        const subItems = [];
                        submenus.forEach(sm => {
                          if (window.getComputedStyle(sm).display !== 'none' && sm.offsetHeight > 0) {
                            sm.querySelectorAll('[data-priority]').forEach(p => subItems.push(p.textContent.trim()));
                          }
                        });
                        resolve({ clicked: true, subItems });
                      }, 500);
                      return;
                    }
                  }
                  resolve({ clicked: false });
                });
              });

              await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-priority-submenu.png') });
              record('Priority submenu with high/medium/low',
                priorityResult.clicked && priorityResult.subItems.length >= 3,
                priorityResult.clicked ? `Items: ${priorityResult.subItems.join(', ')}` : 'Not triggered'
              );

              // Dismiss
              await page.mouse.click(50, 50);
              await sleep(200);
            }
          }
        }
      }
    } else {
      record('Right-click context menu', false, 'No cards on board even after adding items');
    }

    // ========================================
    // TEST 3b: Meeting context menu (move-date)
    // ========================================
    console.log('\n--- Test 3b: Meeting context menu ---');

    const meetingCard = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card');
      for (const card of cards) {
        if (card.querySelector('.meeting-icon')) {
          return {
            id: card.dataset.itemId || card.dataset.id,
            text: card.textContent.trim().substring(0, 60)
          };
        }
      }
      return null;
    });

    if (meetingCard) {
      const mEl = await page.$(`.card[data-item-id="${meetingCard.id}"]`) || await page.$('.card .meeting-icon');
      const mCardEl = mEl ? await mEl.evaluateHandle(el => el.closest('.card')) : null;
      if (mCardEl) {
        const mBox = await mCardEl.boundingBox();
        if (mBox) {
          await page.mouse.click(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2, { button: 'right' });
          await sleep(500);

          const meetingMenu = await page.evaluate(() => {
            const menu = document.getElementById('contextMenu');
            if (!menu) return { found: false };
            const style = window.getComputedStyle(menu);
            return {
              found: style.display !== 'none' && menu.offsetHeight > 0,
              hasMoveDate: false,
              items: []
            };
          });

          if (meetingMenu.found) {
            const moveDateVisible = await page.evaluate(() => {
              const menu = document.getElementById('contextMenu');
              const items = menu.querySelectorAll('.context-menu-item');
              for (const item of items) {
                if (item.dataset.action === 'move-date' && item.style.display !== 'none') {
                  return { visible: true, text: item.textContent.trim() };
                }
              }
              return { visible: false };
            });

            record('Meeting context menu has move-date option', moveDateVisible.visible,
              moveDateVisible.visible ? moveDateVisible.text : 'move-date not visible');
          } else {
            record('Meeting context menu visible', false, 'Menu not shown');
          }

          await page.mouse.click(50, 50);
          await sleep(200);
        }
      }
    } else {
      record('Meeting context menu - move-date', false, 'No meeting card found');
    }

    // ========================================
    // TEST 4: Backup functionality
    // ========================================
    console.log('\n--- Test 4: Backup functionality ---');

    const backupBtns = await page.evaluate(() => {
      const found = [];
      const allBtns = document.querySelectorAll('button, [role="button"], a');
      for (const btn of allBtns) {
        const text = btn.textContent.trim();
        const title = (btn.title || '').trim();
        if (text.includes('导出备份') || text.includes('导入备份') || text.includes('恢复') ||
            title.includes('备份') || title.includes('恢复')) {
          found.push({ text: text.substring(0, 50), title });
        }
      }
      return found;
    });

    record('Backup/restore buttons exist', backupBtns.length > 0,
      backupBtns.length > 0 ? `Found ${backupBtns.length}: ${backupBtns.map(b => b.text).join(', ')}` : 'None found');

    // Test export click (should trigger download, not throw)
    const beforeErrors = [...consoleErrors];
    const exportClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim().includes('导出备份')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    await sleep(500);

    const newErrors = consoleErrors.filter(e => !beforeErrors.includes(e));
    record('Export backup - no errors on click', exportClicked && newErrors.length === 0,
      `Clicked: ${exportClicked}, New errors: ${newErrors.length}`);

    // ========================================
    // TEST 5: Calendar view context menu
    // ========================================
    console.log('\n--- Test 5: Calendar views ---');

    // Switch to week view
    const weekOk = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim() === '周视图') { btn.click(); return true; }
      }
      return false;
    });
    await sleep(1500);

    if (weekOk) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-week-view.png') });
      record('Switched to week view', true);

      // Check for calendar items or grid
      const weekHasContent = await page.evaluate(() => {
        const calItems = document.querySelectorAll('.calendar-item, [class*="cal-item"]');
        const timeSlots = document.querySelectorAll('[class*="time-slot"], [class*="timeslot"], .time-grid td');
        const cells = document.querySelectorAll('td[data-date], td[class]');
        return {
          calItems: calItems.length,
          timeSlots: timeSlots.length,
          cells: cells.length,
          calendarViewExists: !!document.querySelector('.calendar-view, .week-view')
        };
      });
      console.log('  Week view content:', JSON.stringify(weekHasContent));

      // Right-click on calendar area
      const calArea = await page.$('.calendar-view, .week-view, [class*="calendar"]');
      if (calArea) {
        const cBox = await calArea.boundingBox();
        if (cBox) {
          await page.mouse.click(cBox.x + cBox.width / 3, cBox.y + cBox.height / 3, { button: 'right' });
          await sleep(500);

          const weekMenuCheck = await page.evaluate(() => {
            const menu = document.getElementById('contextMenu');
            if (!menu) return { found: false };
            const style = window.getComputedStyle(menu);
            return {
              found: style.display !== 'none' && menu.offsetHeight > 0,
              items: Array.from(menu.querySelectorAll('.context-menu-item')).map(i => i.textContent.trim()).filter(t => t)
            };
          });

          record('Week view context menu', weekMenuCheck.found,
            weekMenuCheck.found ? `Items: ${weekMenuCheck.items.join(', ')}` : 'No menu appeared');
          await page.mouse.click(50, 50);
          await sleep(200);
        }
      }
    } else {
      record('Switch to week view', false, 'Button not found');
    }

    // Switch to month view
    const monthOk = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim() === '月视图') { btn.click(); return true; }
      }
      return false;
    });
    await sleep(1500);

    if (monthOk) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-month-view.png') });
      record('Switched to month view', true);

      // Check for month view content
      const monthHasContent = await page.evaluate(() => {
        const calItems = document.querySelectorAll('.calendar-item');
        const dayCells = document.querySelectorAll('.day-cell, [class*="day-cell"], td');
        return { calItems: calItems.length, dayCells: dayCells.length };
      });
      console.log('  Month view content:', JSON.stringify(monthHasContent));

      const calArea2 = await page.$('.calendar-view, .month-view, [class*="calendar"]');
      if (calArea2) {
        const cBox2 = await calArea2.boundingBox();
        if (cBox2) {
          await page.mouse.click(cBox2.x + cBox2.width / 3, cBox2.y + cBox2.height / 3, { button: 'right' });
          await sleep(500);

          const monthMenuCheck = await page.evaluate(() => {
            const menu = document.getElementById('contextMenu');
            if (!menu) return { found: false };
            const style = window.getComputedStyle(menu);
            return {
              found: style.display !== 'none' && menu.offsetHeight > 0,
              items: Array.from(menu.querySelectorAll('.context-menu-item')).map(i => i.textContent.trim()).filter(t => t)
            };
          });

          record('Month view context menu', monthMenuCheck.found,
            monthMenuCheck.found ? `Items: ${monthMenuCheck.items.join(', ')}` : 'No menu appeared');
          await page.mouse.click(50, 50);
          await sleep(200);
        }
      }
    } else {
      record('Switch to month view', false, 'Button not found');
    }

    // ========================================
    // TEST 6: Daily backup schedule
    // ========================================
    console.log('\n--- Test 6: Daily backup schedule ---');

    const bkpRelatedErrors = consoleErrors.filter(e => e.toLowerCase().includes('backup') || e.toLowerCase().includes('schedule'));
    record('No backup-related console errors', bkpRelatedErrors.length === 0,
      bkpRelatedErrors.length === 0 ? 'Clean' : bkpRelatedErrors.join(', '));

    // ========================================
    // TEST 7: Screenshot buttons
    // ========================================
    console.log('\n--- Test 7: Screenshot buttons ---');

    // Switch back to week for screenshot check
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.trim() === '周视图') { btn.click(); break; }
      }
    });
    await sleep(1000);

    const screenshotBtns = await page.evaluate(() => {
      const found = [];
      const allBtns = document.querySelectorAll('button, [role="button"]');
      for (const btn of allBtns) {
        const text = btn.textContent.trim();
        const title = (btn.title || '').trim();
        const inner = btn.innerHTML;
        if (text.includes('📷') || title.includes('截图') || title.includes('screenshot') ||
            text.includes('截图') || text.includes('screenshot')) {
          found.push({ text: text.substring(0, 30), title });
        }
      }
      return found;
    });

    record('Screenshot buttons on calendar views', screenshotBtns.length > 0,
      screenshotBtns.length > 0 ? `Found: ${screenshotBtns.map(b => b.text || b.title).join(', ')}` : 'None found');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-final.png') });

    // ========================================
    // CLEANUP: Remove test items
    // ========================================
    await page.evaluate(async () => {
      const app = window.dashboard || window.officeDashboard;
      if (!window.db) return;
      try {
        const items = await window.db.getAllItems();
        for (const item of items) {
          if (item.source === 'e2e-test') {
            await window.db.deleteItem(item.id);
          }
        }
        if (app && app.loadItems) await app.loadItems();
      } catch (e) {}
    });

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n\n========================================');
    console.log('E2E VERIFICATION SUMMARY');
    console.log('========================================\n');

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    const total = results.length;

    for (const r of results) {
      const icon = r.pass ? 'PASS' : 'FAIL';
      console.log(`[${icon}] ${r.name}${r.details ? ' -- ' + r.details : ''}`);
    }

    console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Pass rate: ${((passed / total) * 100).toFixed(1)}%`);

    // All errors
    const allErrors = [...new Set([...pageErrors, ...consoleErrors.filter(e => !e.includes('favicon'))])];
    if (allErrors.length > 0) {
      console.log('\nAll errors:');
      allErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }

    if (failedRequests.length > 0) {
      console.log('\nFailed requests:');
      failedRequests.forEach(r => console.log(`  - ${r.url}: ${r.error}`));
    }

    console.log('\nScreenshots: ' + SCREENSHOT_DIR);

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-state.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
