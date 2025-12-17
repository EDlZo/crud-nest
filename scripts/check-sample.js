const f = require('../client/src/data/thailand-hierarchy-full.json');
const names = ['กระบี่', 'กรุงเทพมหานคร', 'ชลบุรี', 'เชียงใหม่'];
names.forEach(function(n) {
  const p = f.find(function(x) { return x.name === n; });
  if (!p) {
    console.log(n + ' NOT FOUND');
  } else {
    console.log('--- ' + n);
    console.log('amphoes:', p.amphoes.map(function(a){ return a.name; }).slice(0,8));
    console.log('sample tambons of first amph:', p.amphoes[0] && p.amphoes[0].tambons && p.amphoes[0].tambons.slice(0,8));
  }
});
