const fs = require('fs');
const path = require('path');

const inPath = path.resolve(__dirname, '../client/src/data/thailand-hierarchy-full.json');
const outPath = path.resolve(__dirname, '../client/src/data/thailand-hierarchy-full.hier.json');

function main() {
  const raw = fs.readFileSync(inPath, 'utf8');
  const arr = JSON.parse(raw);
  const provinces = {};

  arr.forEach((r) => {
    const prov = r.province || r.province_name || r.prov || r.PROVINCE;
    const amph = r.amphoe || r.amphur || r.amph || r.AMPHOE;
    const tamb = r.district || r.tambon || r.district_name || r.DISTRICT;
    if (!prov) return;
    if (!provinces[prov]) provinces[prov] = { name: prov, amphoes: {} };
    if (!provinces[prov].amphoes[amph]) provinces[prov].amphoes[amph] = { name: amph, tambons: [] };
    if (tamb && !provinces[prov].amphoes[amph].tambons.includes(tamb)) provinces[prov].amphoes[amph].tambons.push(tamb);
  });

  const outArr = Object.values(provinces).map((pv) => ({ name: pv.name, amphoes: Object.values(pv.amphoes) }));
  fs.writeFileSync(outPath, JSON.stringify(outArr, null, 2), 'utf8');
  console.log('WROTE', outPath, 'provinces', outArr.length);
  console.log(JSON.stringify(outArr.slice(0, 3), null, 2));
}

main();
