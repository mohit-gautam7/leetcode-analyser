import { mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import AdmZip from 'adm-zip';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT_DIR = join(ROOT, 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'problems-data.json');

function slugFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/problems\/([^\/\s?#]+)/);
  return m ? m[1].toLowerCase() : null;
}

function normalizeKey(s) {
  return s.toLowerCase().replace(/[\s\-_.]/g, '');
}

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
    cur += ch;
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

function normalizeDifficulty(d) {
  const u = (d ?? '').toUpperCase();
  if (u === 'EASY') return 'Easy';
  if (u === 'MEDIUM') return 'Medium';
  if (u === 'HARD') return 'Hard';
  return 'Unknown';
}

async function buildMap() {
  // slug → { title, difficulty, companies: Map<name, frequency> }
  const problems = new Map();
  // normalizedKey → canonical company name
  const canonicalMap = new Map();

  function upsert(slug, title, difficulty, company, freq) {
    if (!slug || !company) return;
    if (!problems.has(slug)) {
      problems.set(slug, { title: title || slug, difficulty: normalizeDifficulty(difficulty), companies: new Map() });
    }
    const p = problems.get(slug);
    if (title && title.length > p.title.length) p.title = title;
    if (difficulty) p.difficulty = normalizeDifficulty(difficulty);
    const compMap = p.companies;
    if (!compMap.has(company) || compMap.get(company) < freq) compMap.set(company, freq);
  }

  // ── ZIP 2 first — proper company name casing ──
  // CSV: Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
  {
    const zip = new AdmZip(join(ROOT, 'interview-company-wise-problems-main.zip'));
    const entries = zip.getEntries().filter(e => e.entryName.includes('/5. All.csv'));

    for (const entry of entries) {
      const parts = entry.entryName.split('/');
      const company = parts[parts.length - 2];
      canonicalMap.set(normalizeKey(company), company);

      const lines = entry.getData().toString('utf8').split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const f = parseCsvLine(line);
        const slug = slugFromUrl(f[4]);
        upsert(slug, f[1], f[0], company, parseFloat(f[2]) || 0);
      }
    }
    console.log(`ZIP2: ${entries.length} companies`);
  }

  // ── ZIP 1 — more companies, lowercase slug folder names ──
  // CSV: ID,URL,Title,Difficulty,Acceptance %,Frequency %
  {
    const zip = new AdmZip(join(ROOT, 'leetcode-companywise-interview-questions-master.zip'));
    const entries = zip.getEntries().filter(e => e.entryName.endsWith('/all.csv'));

    for (const entry of entries) {
      const parts = entry.entryName.split('/');
      const rawFolder = parts[parts.length - 2];
      const key = normalizeKey(rawFolder);
      let company = canonicalMap.get(key);
      if (!company) {
        company = rawFolder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        canonicalMap.set(key, company);
      }

      const lines = entry.getData().toString('utf8').split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const f = parseCsvLine(line);
        const slug = slugFromUrl(f[1]);
        upsert(slug, f[2], f[3], company, parseFloat(f[5]) || 0);
      }
    }
    console.log(`ZIP1: ${entries.length} companies`);
  }

  // Serialize: slug → { title, difficulty, companies: [name, ...] sorted by freq desc }
  const result = {};
  for (const [slug, { title, difficulty, companies }] of problems) {
    const sorted = [...companies.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    result[slug] = { title, difficulty, companies: sorted };
  }
  return result;
}

async function main() {
  console.log('Building problems data...');
  const map = await buildMap();

  const slugs = Object.keys(map);
  const allCompanies = new Set(Object.values(map).flatMap(p => p.companies));
  console.log(`Problems: ${slugs.length}, Companies: ${allCompanies.size}`);

  mkdirSync(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(map), 'utf8');

  const bytes = (await readFile(OUT_FILE)).length;
  console.log(`Written: ${OUT_FILE} (${(bytes / 1024).toFixed(1)} KB)`);

  // Also build inverted company-tags.json for backward compat
  const tags = {};
  for (const [slug, { companies }] of Object.entries(map)) {
    tags[slug] = companies.slice(0, 10);
  }
  await writeFile(join(OUT_DIR, 'company-tags.json'), JSON.stringify(tags), 'utf8');
  console.log('Also updated company-tags.json');
}

main().catch(e => { console.error(e); process.exit(1); });
