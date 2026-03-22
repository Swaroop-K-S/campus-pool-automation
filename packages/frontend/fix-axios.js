const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
        results.push(file);
    }
  });
  return results;
}
const files = walk('./src/pages');
let count = 0;
files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (code.includes('res.data?.success')) {
    code = code.replace(/res\.data\?\.success/g, 'res.success');
    changed = true;
  }
  if (code.includes('res.data.data')) {
    code = code.replace(/res\.data\.data/g, 'res.data');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, code);
    console.log('Fixed', file);
    count++;
  }
});
console.log('Total fixed:', count);
