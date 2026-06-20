import esbuild from 'esbuild';
import { build as viteBuild } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function generateIcon(size) {
  // Create a simple SVG icon as a PNG placeholder using canvas-like approach
  // Since we can't use canvas in Node easily, create an SVG file instead
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6"/>
      <stop offset="100%" style="stop-color:#6366F1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size * 0.65}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${size * 0.45}" fill="white">C</text>
</svg>`;
  return svg;
}

async function createIcons() {
  const iconsDir = path.join(__dirname, 'dist/icons');
  ensureDir(iconsDir);

  // Check if Sharp or Canvas is available for PNG generation
  // Fall back to SVG icons renamed as .png (Chrome will still use them in most cases)
  const sizes = [16, 32, 48, 128];

  try {
    // Try to use sharp if available
    const sharp = await import('sharp').catch(() => null);

    if (sharp) {
      for (const size of sizes) {
        const svg = Buffer.from(generateIcon(size));
        await sharp.default(svg).png().toFile(path.join(iconsDir, `icon${size}.png`));
      }
      console.log('✓ Icons generated with sharp');
    } else {
      // Create SVG files that look like PNGs - Chrome accepts SVG for icons
      for (const size of sizes) {
        const iconPath = path.join(iconsDir, `icon${size}.png`);
        if (!fs.existsSync(iconPath)) {
          // Copy a minimal valid PNG (1x1 purple pixel)
          const minimalPng = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xd7, 0x63, 0xe8, 0x62, 0x60, 0x00,
            0x00, 0x00, 0x04, 0x00, 0x01, 0xb4, 0x71, 0x0e,
            0xde, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
            0x44, 0xae, 0x42, 0x60, 0x82
          ]);
          fs.writeFileSync(iconPath, minimalPng);
        }
      }
      console.log('✓ Icons created (minimal PNG placeholders)');
      console.log('  → Replace dist/icons/*.png with proper icons for production');
    }
  } catch (e) {
    console.warn('Warning: Could not generate icons:', e.message);
  }
}

async function buildScripts() {
  const commonConfig = {
    bundle: true,
    platform: 'browser',
    target: ['chrome114'],
    minify: true,
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env': '{}',
    },
    external: [],
  };

  // Build background service worker (ESM module)
  await esbuild.build({
    ...commonConfig,
    entryPoints: [path.join(__dirname, 'src/background/service-worker.ts')],
    outfile: path.join(__dirname, 'dist/background.js'),
    format: 'esm',
    splitting: false,
  });
  console.log('✓ Background service worker built');

  // Build content script (IIFE for page injection)
  await esbuild.build({
    ...commonConfig,
    entryPoints: [path.join(__dirname, 'src/content/index.ts')],
    outfile: path.join(__dirname, 'dist/content.js'),
    format: 'iife',
    globalName: 'CodeSenseContent',
  });
  console.log('✓ Content script built');
}

async function buildUI() {
  // Use Vite to build popup and sidebar with React + Tailwind
  await viteBuild({
    configFile: path.join(__dirname, 'vite.config.ts'),
    build: { emptyOutDir: false },
  });

  // Move HTML files from nested paths to dist/ root
  const htmlMoves = [
    { from: 'dist/src/popup/index.html', to: 'dist/popup.html' },
    { from: 'dist/src/sidebar/index.html', to: 'dist/sidebar.html' },
  ];

  for (const { from, to } of htmlMoves) {
    const fromPath = path.join(__dirname, from);
    const toPath = path.join(__dirname, to);
    if (fs.existsSync(fromPath)) {
      let html = fs.readFileSync(fromPath, 'utf8');
      // Fix relative paths: ../../file.js -> ./file.js
      // When moved from dist/src/popup/ to dist/, remove the ../../ prefix
      html = html.replace(/src="\.\.\/\.\.\/([^"]+)"/g, 'src="./$1"');
      html = html.replace(/href="\.\.\/\.\.\/([^"]+)"/g, 'href="./$1"');
      fs.writeFileSync(toPath, html);
      fs.unlinkSync(fromPath);
      console.log(`  ✓ ${from} → ${to}`);
    }
  }

  // Remove empty nested dirs
  try {
    fs.rmdirSync(path.join(__dirname, 'dist/src/popup'));
    fs.rmdirSync(path.join(__dirname, 'dist/src/sidebar'));
    fs.rmdirSync(path.join(__dirname, 'dist/src'));
  } catch { /**/ }

  console.log('✓ UI (popup + sidebar) built with Vite');
}

async function copyAssets() {
  const distDir = path.join(__dirname, 'dist');
  ensureDir(distDir);

  // Copy manifest.json
  copyFile(
    path.join(__dirname, 'public/manifest.json'),
    path.join(__dirname, 'dist/manifest.json')
  );
  console.log('✓ manifest.json copied');

  // Copy any additional public assets
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    const items = fs.readdirSync(publicDir);
    for (const item of items) {
      if (item !== 'manifest.json') {
        const src = path.join(publicDir, item);
        const dest = path.join(distDir, item);
        if (fs.statSync(src).isFile()) {
          copyFile(src, dest);
        }
      }
    }
  }
}

async function generateContentCSS() {
  // Create a minimal CSS file for content script (shadow DOM styles)
  const css = `/* CodeSense AI Content Script Styles */
#codesense-toggle-btn {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2147483647;
  width: 32px;
  height: 64px;
  background: linear-gradient(135deg, #8B5CF6, #6366F1);
  border: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -2px 0 12px rgba(139, 92, 246, 0.4);
  transition: all 0.2s ease;
  color: white;
  font-size: 14px;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  font-family: monospace;
  font-weight: bold;
}
#codesense-toggle-btn:hover {
  width: 36px;
  box-shadow: -4px 0 20px rgba(139, 92, 246, 0.6);
}
`;
  fs.writeFileSync(path.join(__dirname, 'dist/content.css'), css);
  console.log('✓ Content CSS created');
}

async function copyDataFiles() {
  const src = path.join(__dirname, 'src/data/problems-data.json');
  const dest = path.join(__dirname, 'dist/data/problems-data.json');
  if (fs.existsSync(src)) {
    ensureDir(path.join(__dirname, 'dist/data'));
    fs.copyFileSync(src, dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`✓ problems-data.json copied to dist/data/ (${kb} KB)`);
  } else {
    console.warn('⚠ src/data/problems-data.json not found — run: pnpm build:company-data');
  }
}

async function buildAll() {
  console.log('\n🚀 Building CodeSense AI Extension...\n');
  const startTime = Date.now();

  try {
    // Clean dist (but preserve icons if they exist)
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      const items = fs.readdirSync(distDir);
      for (const item of items) {
        if (item !== 'icons') {
          const itemPath = path.join(distDir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            fs.rmSync(itemPath, { recursive: true });
          } else {
            fs.unlinkSync(itemPath);
          }
        }
      }
    }
    ensureDir(distDir);

    await copyAssets();
    await createIcons();
    await buildScripts();
    await buildUI();
    await generateContentCSS();
    await copyDataFiles();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Extension built in ${elapsed}s`);
    console.log('\n📦 Load the "dist/" folder as an unpacked extension in Chrome:');
    console.log('   chrome://extensions → Enable Developer Mode → Load unpacked → Select dist/\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
