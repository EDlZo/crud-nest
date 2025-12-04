#!/usr/bin/env node
// scripts/merge-visibility.js
// Usage:
//   API_BASE_URL=https://your-backend.example.com SUPERADMIN_TOKEN=ey... node scripts/merge-visibility.js
// or
//   node scripts/merge-visibility.js --url https://your-backend.example.com --token ey...

const { argv, env } = require('process');

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url' && argv[i + 1]) {
      args.url = argv[++i];
    } else if (a === '--token' && argv[i + 1]) {
      args.token = argv[++i];
    }
  }
  args.url = args.url || env.API_BASE_URL || env.VITE_API_BASE_URL;
  args.token = args.token || env.SUPERADMIN_TOKEN || env.TOKEN || env.CRUD_TOKEN;
  return args;
}

async function main() {
  const { url, token } = parseArgs();
  if (!url) {
    console.error('Missing API base URL. Set API_BASE_URL or pass --url');
    process.exit(2);
  }
  if (!token) {
    console.error('Missing token. Set SUPERADMIN_TOKEN or pass --token');
    process.exit(2);
  }

  const getUrl = `${url.replace(/\/$/, '')}/auth/visibility`;

  try {
    console.log('GET', getUrl);
    const res = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      console.error('GET /auth/visibility failed:', res.status, text);
      process.exit(3);
    }
    const current = await res.json();
    console.log('Current visibility:', JSON.stringify(current, null, 2));

    const defaults = {
      superadmin: { activities: true, deals: true },
      admin: { activities: true, deals: true },
      guest: { activities: false, deals: false },
    };

    // Merge without overwriting existing keys (only add missing keys for activities/deals)
    const merged = { ...current };
    ['superadmin', 'admin', 'guest'].forEach((role) => {
      merged[role] = Object.assign({}, merged[role] || {});
      ['activities', 'deals'].forEach((k) => {
        if (typeof merged[role][k] === 'undefined') merged[role][k] = defaults[role][k];
      });
    });

    console.log('Merged visibility to save:', JSON.stringify(merged, null, 2));

    const postRes = await fetch(getUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: merged }),
    });

    if (!postRes.ok) {
      const text = await postRes.text();
      console.error('POST /auth/visibility failed:', postRes.status, text);
      process.exit(4);
    }

    const saved = await postRes.json();
    console.log('Saved visibility:', JSON.stringify(saved, null, 2));
    console.log('\nDone. Sidebar should reflect Activities & Deals for roles after users reload or after visibilityUpdated event.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Node 18+ provides global fetch; if older Node, advise the user
if (typeof fetch === 'undefined') {
  console.error('This script requires Node 18+ (global fetch).');
  console.error('Upgrade Node or run a small curl command instead (instructions in README).');
  process.exit(1);
}

main();
