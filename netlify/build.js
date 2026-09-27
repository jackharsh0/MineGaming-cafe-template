// ponytail: single-page static export of index.php for Netlify (Netlify can't run PHP).
// It only understands the handful of PHP tags index.php actually uses - it is NOT a PHP engine.
// If the build fails with "Unhandled PHP tag", add a replacement for the new tag below.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'site');

const settings = JSON.parse(
  fs.readFileSync(path.join(root, 'backend', 'config', 'settings.json'), 'utf8')
);

// Set these in Netlify: Site configuration -> Environment variables.
// BACKEND_URL = your Express+MySQL API (Render/Railway). ADMIN_URL = your PHP admin host.
const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const adminUrl = (process.env.ADMIN_URL || '').replace(/\/+$/, '');

const get = (key, fallback = '') => {
  const val = key.split('.').reduce((v, k) => (v == null ? undefined : v[k]), settings);
  return val === undefined || val === null ? fallback : val;
};
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s) => esc(s).replace(/\n/g, '<br />\n');
const unquote = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');

let html = fs.readFileSync(path.join(root, 'index.php'), 'utf8');

// Drop every leading PHP block (maintenance check + login/portal logic).
// The maintenance block embeds its own "<!DOCTYPE html>" inside a PHP string, so anchor on the
// real <head> marker and slice back to the doctype that precedes it.
const headMarker = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
html = html.slice(html.lastIndexOf('<!DOCTYPE html>', html.indexOf(headMarker)));

// Food-items loop -> static list from settings.
const foodItems = get('website.default_food_items', []);
const foodHtml = foodItems.length
  ? foodItems
      .map((item) => {
        const name = esc(item.name ?? '');
        const price = Number(item.price ?? 0).toFixed(2);
        const icon = esc(item.icon ?? '🥤');
        return `          <div class="food-item bg-kraft border border-slate-800 rounded p-3 flex flex-col items-center text-center cursor-pointer hover:border-clay transition hover-3d-float" data-name="${name}" data-price="${price}" data-icon="${icon}">
            <span class="text-2xl">${icon}</span>
            <span class="text-xs font-bold text-slate-100 mt-1">${name}</span>
            <span class="text-[10px] text-clay font-bold">${esc(get('brand.currency_symbol', '₹'))}${price}</span>
          </div>`;
      })
      .join('\n')
  : '<div class="col-span-2 text-center text-slate-500 text-xs py-4">No food items configured in Settings.</div>';
html = html.replace(/<\?php\s+\$food_items =[\s\S]*?<\?php endforeach; endif; \?>/, foodHtml);

// Branding / settings echoes.
html = html.replace(
  /<\?php echo nl2br\(htmlspecialchars\(setting\('([^']+)',\s*"([^"]*)"\)\)\); \?>/g,
  (_, key, def) => nl2br(get(key, def))
);
html = html.replace(
  /<\?php echo htmlspecialchars\(setting\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)\); \?>/g,
  (_, key, def) => esc(get(key, unquote(def)))
);
html = html.replace(
  /<\?php echo setting\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\); \?>/g,
  (_, key, def) => get(key, unquote(def))
);

const constants = {
  SITE_NAME: () => esc(get('brand.business_name', 'MineGaming')),
  SITE_TAGLINE: () => esc(get('brand.tagline', "Jodhpur's Premier Lounge")),
  SITE_EST_YEAR: () => esc(get('brand.est_year', '2024')),
  SITE_CURRENCY: () => esc(get('brand.currency_symbol', '₹')),
  SITE_COPYRIGHT: () => esc(get('brand.copyright_text', 'All rights reserved.')),
  SITE_PAGE_TITLE: () => esc(get('system.page_title', 'MineGaming')),
};
html = html.replace(
  /<\?php echo (SITE_NAME|SITE_TAGLINE|SITE_EST_YEAR|SITE_CURRENCY|SITE_COPYRIGHT|SITE_PAGE_TITLE); \?>/g,
  (_, name) => constants[name]()
);

// Misc guards.
html = html.replace(/<\?php echo date\('Y'\); \?>/g, String(new Date().getFullYear()));
// Backend host injected at build time from the BACKEND_URL env var.
html = html.replace(/<\?php echo BACKEND_URL; \?>/g, backendUrl.replace(/'/g, "\\'"));
html = html.replace(
  /<\?php echo json_encode\(\$APP_SETTINGS\); \?>/g,
  JSON.stringify(settings)
);

// Portal button -> ADMIN_URL (your PHP admin host). Netlify cannot run PHP, so until ADMIN_URL
// is set the button is inert rather than linking to a dead placeholder.
html = html
  .replace(/<\?php echo \$portalUrl; \?>/g, adminUrl || '#')
  .replace(/<\?php echo \$portalIcon; \?>/g, 'fa-solid fa-right-to-bracket')
  .replace(/<\?php echo \$portalText; \?>/g, 'Portal Login')
  .replace(/href="index\.php"/g, 'href="/"');

if (!backendUrl) console.warn('BACKEND_URL not set - the live status board and booking form will fail.');
if (!adminUrl) console.warn('ADMIN_URL not set - "Portal Login" is disabled (PHP admin is not deployed).');

if (html.includes('<?php')) {
  const tag = html.slice(html.indexOf('<?php'), html.indexOf('<?php') + 80);
  console.error(`Unhandled PHP tag remains near: ${tag}\nAdd a replacement in netlify/build.js`);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.copyFileSync(path.join(root, 'css', 'retro_wood.css'), path.join(outDir, 'css', 'retro_wood.css'));
fs.copyFileSync(path.join(root, 'js', 'tailwindcss.js'), path.join(outDir, 'js', 'tailwindcss.js'));

console.log('Static landing page written to site/ (no PHP left).');
