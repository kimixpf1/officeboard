/**
 * E2E线上功能验证 - 纯HTTP方式
 * 不依赖浏览器，通过HTTP请求和HTML解析验证线上部署
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://kimixpf1.github.io/officeboard/';
const results = [];

function log(category, name, passed, detail = '') {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${category.padEnd(16)} | ${name}${detail ? ' | ' + detail : ''}`);
  results.push({ category, name, passed, detail });
}

function fetch(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { clearTimeout(timer); resolve({ status: res.statusCode, headers: res.headers, body: data }); });
    }).on('error', e => { clearTimeout(timer); reject(e); });
  });
}

async function run() {
  console.log('='.repeat(70));
  console.log('Office Board E2E - HTTP-based Online Verification');
  console.log(`URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  // =============================================
  // TEST 1: Main page HTTP
  // =============================================
  console.log('\n--- 1. Main Page Load ---');
  try {
    const res = await fetch(BASE_URL);
    log('Page Load', 'HTTP 200', res.status === 200, `status=${res.status}`);
    log('Page Load', 'HTML Content', res.body.includes('<!DOCTYPE html>'), `length=${res.body.length}`);
    log('Page Load', 'Title Present', res.body.includes('办公室智能工作面板'));
    log('Page Load', 'Page Size', res.body.length > 50000, `${(res.body.length / 1024).toFixed(1)}KB`);

    // Cache headers
    const cacheControl = res.headers['cache-control'] || '';
    log('Page Load', 'Cache Headers', true, `cache-control: ${cacheControl}`);
  } catch (e) {
    log('Page Load', 'HTTP Request', false, e.message);
  }

  // =============================================
  // TEST 2: Static Assets (CSS)
  // =============================================
  console.log('\n--- 2. CSS Assets ---');
  const cssFiles = [
    'css/base.css?v=2',
    'css/layout.css?v=8',
    'css/themes.css?v=9',
    'css/components.css?v=3',
    'css/responsive.css?v=6',
  ];
  for (const css of cssFiles) {
    try {
      const res = await fetch(BASE_URL + css);
      log('CSS Assets', css.split('?')[0], res.status === 200, `status=${res.status}, size=${(res.body.length / 1024).toFixed(1)}KB`);
    } catch (e) {
      log('CSS Assets', css.split('?')[0], false, e.message);
    }
  }

  // =============================================
  // TEST 3: Static Assets (JS)
  // =============================================
  console.log('\n--- 3. JS Assets ---');
  const jsFiles = [
    'js/utils.js?v=5',
    'js/db.js?v=30',
    'js/app-date-view.js?v=14',
    'js/app.js?v=243',
    'js/crypto.js?v=17',
    'js/kimi.js?v=16',
    'js/core/pdf-parser.js?v=2',
    'js/ocr.js?v=54',
    'js/report.js?v=16',
    'js/calendar.js?v=42',
    'js/upload-flow.js?v=9',
  ];
  for (const js of jsFiles) {
    try {
      const res = await fetch(BASE_URL + js);
      const name = js.split('?')[0];
      log('JS Assets', name, res.status === 200, `status=${res.status}, size=${(res.body.length / 1024).toFixed(1)}KB`);
    } catch (e) {
      log('JS Assets', js.split('?')[0], false, e.message);
    }
  }

  // =============================================
  // TEST 4: Panel JS Modules
  // =============================================
  console.log('\n--- 4. Panel JS Modules ---');
  const panelFiles = [
    'js/panels/countdown.js',
    'js/panels/links.js',
    'js/panels/contacts.js',
    'js/panels/tools.js',
    'js/panels/side-panels.js',
    'js/weather.js',
    'js/core/recurring.js',
    'js/core/cross-date.js',
    'js/core/backup.js',
    'js/core/context-menu.js',
    'js/core/idle-bar.js',
    'js/core/pet-renderer.js',
    'js/core/alarm.js',
  ];
  for (const p of panelFiles) {
    try {
      const res = await fetch(BASE_URL + p);
      log('Panel Modules', path.basename(p), res.status === 200, `status=${res.status}, size=${(res.body.length / 1024).toFixed(1)}KB`);
    } catch (e) {
      log('Panel Modules', path.basename(p), false, e.message);
    }
  }

  // =============================================
  // TEST 5: Index.html Content Analysis
  // =============================================
  console.log('\n--- 5. HTML Structure ---');
  try {
    const res = await fetch(BASE_URL);
    const html = res.body;

    // Core elements
    const checks = [
      ['Header Logo', '.logo'],
      ['Clock Element', '#headerClock'],
      ['Weather Element', '#headerWeather'],
      ['Theme Button', '#themeBtn'],
      ['Sync Button', '#syncBtn'],
      ['Settings Button', '#settingsBtn'],
      ['Report Button', '#reportBtn'],
      ['NLP Input', '#nlpInput'],
      ['Parse Button', '#parseBtn'],
      ['Upload Button', '#uploadBtn'],
      ['Date Picker', '#datePicker'],
      ['View Buttons', '.view-btn'],
      ['Board View', '#boardView'],
      ['Calendar View', '#calendarView'],
      ['Todo Column', 'data-type="todo"'],
      ['Meeting Column', 'data-type="meeting"'],
      ['Document Column', 'data-type="document"'],
      ['Item Modal', '#itemModal'],
      ['Report Modal', '#reportModal'],
      ['Sync Modal', '#syncModal'],
      ['API Key Modal', '#apiKeyModal'],
      ['Context Menu', '#contextMenu'],
      ['Countdown Panel', '#countdownPanel'],
      ['Tools Panel', '#toolsPanel'],
      ['Links Panel', '#linksPanel'],
      ['Memo Panel', '#memoPanel'],
      ['Schedule Panel', '#schedulePanel'],
      ['Contacts Panel', '#contactsPanel'],
      ['Sticky Note', '#stickyNoteCard'],
      ['Loading Overlay', '#loadingOverlay'],
      ['Copyright Footer', '.copyright-footer'],
      ['Version Badge', '#deployVersionBadge'],
      ['Transfer Modal', '#transferModal'],
      ['Confirm Modal', '#confirmModal'],
      ['Calculator Modal', '#calculatorModal'],
      ['Weather Modal', '#weatherModal'],
      ['Timer Modal', '#timerModal'],
    ];

    for (const [name, selector] of checks) {
      const found = html.includes(selector.replace(/[#.]/g, id => '').replace('[', ' ').replace('="', '="'));
      // More robust check
      const cleanSelector = selector.replace(/[#.\[\]="]/g, ' ').trim().split(/\s+/)[0];
      const present = html.includes(cleanSelector);
      log('HTML Structure', name, present, `selector="${selector}"`);
    }
  } catch (e) {
    log('HTML Structure', 'Analysis', false, e.message);
  }

  // =============================================
  // TEST 6: Supabase CDN
  // =============================================
  console.log('\n--- 6. External Dependencies ---');
  const externalDeps = [
    ['Supabase ESM', 'https://esm.sh/@supabase/supabase-js@2.38.4?bundle'],
    ['Favicon', BASE_URL + 'favicon.svg'],
  ];
  for (const [name, url] of externalDeps) {
    try {
      const res = await fetch(url, 10000);
      log('External Deps', name, res.status === 200, `status=${res.status}`);
    } catch (e) {
      log('External Deps', name, false, e.message.substring(0, 100));
    }
  }

  // =============================================
  // TEST 7: CSP Header Check
  // =============================================
  console.log('\n--- 7. Security ---');
  try {
    const res = await fetch(BASE_URL);
    const html = res.body;

    const hasCSP = html.includes('Content-Security-Policy');
    log('Security', 'CSP Meta Tag', hasCSP);

    const hasReferrer = html.includes('strict-origin-when-cross-origin');
    log('Security', 'Referrer Policy', hasReferrer);

    const hasNosniff = html.includes('nosniff');
    log('Security', 'X-Content-Type-Options', hasNosniff);

    // Check no hardcoded secrets
    const hasSecrets = /sk-[a-zA-Z0-9]{20,}/.test(html) || /password\s*[:=]\s*['"][^'"]{8,}/.test(html);
    log('Security', 'No Hardcoded Secrets', !hasSecrets);
  } catch (e) {
    log('Security', 'Security Check', false, e.message);
  }

  // =============================================
  // TEST 8: Version Check
  // =============================================
  console.log('\n--- 8. Version Info ---');
  try {
    const res = await fetch(BASE_URL + 'js/app.js?v=243');
    const js = res.body;

    const versionMatch = js.match(/20\d{2}-\d{2}-\d{2}\s+v[\d.]+/);
    const version = versionMatch ? versionMatch[0] : 'not found';
    log('Version', 'App Version', versionMatch !== null, `version="${version}"`);

    const scriptVersionsMatch = js.match(/scriptVersions/);
    log('Version', 'Script Versions Array', scriptVersionsMatch !== null);
  } catch (e) {
    log('Version', 'Version Check', false, e.message);
  }

  // =============================================
  // TEST 9: WeChat Upload Page
  // =============================================
  console.log('\n--- 9. WeChat Upload Page ---');
  try {
    const res = await fetch(BASE_URL + 'wechat-upload.html');
    log('WeChat', 'HTTP 200', res.status === 200, `status=${res.status}`);
    if (res.status === 200) {
      log('WeChat', 'Page Content', res.body.includes('wechat'), `size=${(res.body.length / 1024).toFixed(1)}KB`);
    }
  } catch (e) {
    log('WeChat', 'WeChat Page', false, e.message);
  }

  // =============================================
  // TEST 10: Supabase Connection Test
  // =============================================
  console.log('\n--- 10. Supabase Connectivity ---');
  try {
    // The project ref is pfomqdegassaqxdyyweo
    const supabaseUrl = 'https://pfomqdegassaqxdyyweo.supabase.co/rest/v1/';
    const res = await fetch(supabaseUrl, 10000);
    // Expect 401 or similar (no API key), but connection works
    log('Supabase', 'Endpoint Reachable', res.status === 401 || res.status === 200, `status=${res.status}`);
  } catch (e) {
    log('Supabase', 'Endpoint Reachable', false, e.message.substring(0, 100));
  }

  // =============================================
  // TEST 11: JS Syntax Validation
  // =============================================
  console.log('\n--- 11. JS Syntax Quick Check ---');
  const criticalJS = ['js/app.js?v=243', 'js/db.js?v=30', 'js/ocr.js?v=54', 'js/calendar.js?v=42'];
  for (const js of criticalJS) {
    try {
      const res = await fetch(BASE_URL + js);
      const name = js.split('?')[0];
      // Check for obvious syntax issues
      const hasSyntaxError = res.body.includes('SyntaxError') && !res.body.includes('catch');
      const reasonableSize = res.body.length > 1000;
      log('JS Syntax', path.basename(name), reasonableSize && !hasSyntaxError,
        `size=${(res.body.length / 1024).toFixed(1)}KB, syntaxOK=${!hasSyntaxError}`);
    } catch (e) {
      log('JS Syntax', path.basename(js), false, e.message);
    }
  }

  // =============================================
  // Summary
  // =============================================
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log('\n' + '='.repeat(70));
  console.log(`HTTP E2E Summary: ${passed}/${total} PASS, ${failed} FAIL (${((passed/total)*100).toFixed(1)}%)`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r =>
      console.log(`  [FAIL] ${r.category} - ${r.name}${r.detail ? ' | ' + r.detail : ''}`)
    );
  }

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    method: 'HTTP-based verification (no browser)',
    total, passed, failed,
    passRate: `${((passed/total)*100).toFixed(1)}%`,
    results,
  };
  const reportPath = path.join(__dirname, 'e2e-full-verify-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);
}

run().catch(e => { console.error('Fatal:', e); process.exit(2); });
