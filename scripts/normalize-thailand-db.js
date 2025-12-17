const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../client/src/data/thailand-db.json');
const outPath = path.resolve(__dirname, '../client/src/data/thailand-hierarchy-full.json');

function extractThaiSubstrings(s) {
  if (typeof s !== 'string') return [];
  const matches = s.match(/[\u0E00-\u0E7F]+/g);
  if (!matches) return [];
  return matches.map(x => x.trim()).filter(x => x.length >= 2);
}

function findFirstThaiString(node) {
  if (!node) return null;
  if (typeof node === 'string') {
    const parts = extractThaiSubstrings(node);
    if (!parts.length) return null;
    // prefer the longest contiguous Thai substring as the primary name
    let longest = parts.reduce((a, b) => (a.length >= b.length ? a : b), parts[0]);
    return longest;
  }
  if (Array.isArray(node)) {
    for (const el of node) {
      const v = findFirstThaiString(el);
      if (v) return v;
    }
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const v = findFirstThaiString(node[k]);
      if (v) return v;
    }
  }
  return null;
}

function collectThaiStrings(node, into = new Set()) {
  if (!node) return into;
  if (typeof node === 'string') {
    for (const p of extractThaiSubstrings(node)) into.add(p);
    return into;
  }
  if (Array.isArray(node)) {
    for (const el of node) collectThaiStrings(el, into);
    return into;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) collectThaiStrings(node[k], into);
    return into;
  }
  return into;
}

function collectThaiNamesOrdered(node, out = []) {
  if (!node) return out;
  if (typeof node === 'string') {
    const parts = extractThaiSubstrings(node);
    if (parts.length) out.push(parts.join(''));
    return out;
  }
  if (Array.isArray(node)) {
    for (const el of node) {
      if (typeof el === 'string') {
        const parts = extractThaiSubstrings(el);
        if (parts.length) out.push(parts.join(''));
        continue;
      }
      if (Array.isArray(el) && el.length > 0 && typeof el[0] === 'string') {
        const parts = extractThaiSubstrings(el[0]);
        if (parts.length) out.push(parts.join(''));
        continue;
      }
      collectThaiNamesOrdered(el, out);
    }
    return out;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) collectThaiNamesOrdered(node[k], out);
    return out;
  }
  return out;
}

try {
  const raw = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(raw);
  const data = Array.isArray(db) ? db : db.data;
  const result = [];

  if (!Array.isArray(data)) {
    console.error('Unexpected db shape: expected data array');
    process.exit(1);
  }

  for (const provinceEntry of data) {
    // expected [provinceName, amphoesArray, ...maybe other]
    const provinceName = findFirstThaiString(provinceEntry[0]) || String(provinceEntry[0] || '').trim();
    const amphRaw = provinceEntry[1];
    if (!provinceName) continue;
    const province = { name: provinceName, amphoes: [] };

    if (Array.isArray(amphRaw)) {
      for (const amphEntry of amphRaw) {
        const amphName = findFirstThaiString(amphEntry) || (typeof amphEntry === 'string' ? amphEntry : null);
        // collect ordered thai names (including tambons) from amphEntry
        const allOrdered = collectThaiNamesOrdered(amphEntry);
        // remove occurrences equal to amphName or provinceName
        const tambons = allOrdered.filter(s => s && s !== amphName && s !== provinceName && s.length > 1);
        // dedupe while preserving order
        const seen = new Set();
        const deduped = [];
        for (const t of tambons) {
          if (!seen.has(t)) {
            seen.add(t);
            deduped.push(t);
          }
        }
        province.amphoes.push({ name: amphName || 'UNKNOWN', tambons: deduped });
      }
    }

    result.push(province);
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('Wrote normalized hierarchy to', outPath);
} catch (err) {
  console.error('Error normalizing DB:', err);
  process.exit(1);
}
