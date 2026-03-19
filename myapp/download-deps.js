/**
 * download-deps.js
 * Run once from the myapp/ directory: node download-deps.js
 * Downloads all CDN dependencies for offline use.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const get = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    get.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function getText(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https : http;
    get.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return getText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const files = [
  [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'resources/js/three.min.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    'resources/js/GLTFLoader.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js',
    'resources/js/DRACOLoader.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/draco_decoder.js',
    'resources/js/draco/draco_decoder.js'
  ],
  [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/draco_decoder.wasm',
    'resources/js/draco/draco_decoder.wasm'
  ],
  [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/draco_wasm_wrapper.js',
    'resources/js/draco/draco_wasm_wrapper.js'
  ],
];

async function downloadFonts() {
  console.log('Fetching Google Fonts CSS (woff2)...');
  // Send a modern Chrome UA so Google returns woff2 instead of TTF
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap';
  const css = await new Promise((resolve, reject) => {
    https.get(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(getText(res.headers.location));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  const fontDir = 'resources/assets/fonts';
  if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });

  // Extract woff2 URLs
  const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
  let match;
  let i = 0;
  const replacements = [];
  while ((match = urlRegex.exec(css)) !== null) {
    const fontUrl = match[1];
    const filename = `oswald-${i++}.woff2`;
    replacements.push({ fontUrl, filename });
  }

  let localCSS = css;
  for (const { fontUrl, filename } of replacements) {
    console.log(`  Downloading font: ${filename}`);
    await download(fontUrl, `${fontDir}/${filename}`);
    localCSS = localCSS.replace(fontUrl, `../assets/fonts/${filename}`);
  }

  const fontsCSS = localCSS.replace(/\/\* [a-z-]+ \*\//g, '').trim();
  fs.writeFileSync('resources/css/fonts.css', fontsCSS);
  console.log('  -> resources/css/fonts.css written');
}

(async () => {
  console.log('\n=== Downloading offline dependencies ===\n');

  for (const [url, dest] of files) {
    console.log(`Downloading ${path.basename(url)}...`);
    await download(url, dest);
    console.log(`  -> ${dest}`);
  }

  await downloadFonts();

  console.log('\n=== All done! ===');
  console.log('Next steps:');
  console.log('  1. neu update   (downloads Neutralino binary + neutralino.js)');
  console.log('  2. neu build --release');
  console.log('  3. In dist/myapp/: copy /b myapp-win_x64.exe+myapp.neu myapp-portable.exe');
})();
