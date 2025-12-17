#!/usr/bin/env node
// Fetch Thailand province/amphoe/tambon data from a few known public raw JSON endpoints
// and write them to `src/thailand/static-*.json` for local use.

const fs = require('fs');
const { join } = require('path');

const outDir = join(process.cwd(), 'src', 'thailand');
const repoCandidates = [
  'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/',
  'https://raw.githubusercontent.com/kongvut/thai-provinces-districts/master/',
  'https://raw.githubusercontent.com/kongvut/thai-province-data/main/api/latest/',
];

async function tryFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchWithCandidates(paths) {
  for (const base of repoCandidates) {
    for (const p of paths) {
      const url = base + p;
      console.log('Trying', url);
      const data = await tryFetch(url);
      if (data) return { data, url };
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Fetching provinces...');
  const prov = await fetchWithCandidates(['province.json', 'provinces.json', 'api_province.json', 'api_province.json', 'api_province.json']);
  if (prov) {
    fs.writeFileSync(join(outDir, 'static-provinces.json'), JSON.stringify(prov.data, null, 2));
    console.log('Wrote static-provinces.json from', prov.url);
  } else {
    console.warn('Failed to fetch provinces from candidates');
  }

  console.log('Fetching amphoes...');
  const amph = await fetchWithCandidates(['amphoe.json', 'amphoes.json', 'api_amphoe.json', 'api_amphoes.json']);
  if (amph) {
    fs.writeFileSync(join(outDir, 'static-amphoes.json'), JSON.stringify(amph.data, null, 2));
    console.log('Wrote static-amphoes.json from', amph.url);
  } else {
    console.warn('Failed to fetch amphoes from candidates');
  }

  console.log('Fetching tambons/districts...');
  const tamb = await fetchWithCandidates(['district.json', 'districts.json', 'api_district.json', 'api_districts.json', 'tambon.json', 'tambons.json']);
  if (tamb) {
    fs.writeFileSync(join(outDir, 'static-tambons.json'), JSON.stringify(tamb.data, null, 2));
    console.log('Wrote static-tambons.json from', tamb.url);
  } else {
    console.warn('Failed to fetch tambons from candidates');
  }

  console.log('Done. Restart your Nest dev server to pick up the new files.');
}

main().catch(err => { console.error(err); process.exitCode = 1; });
