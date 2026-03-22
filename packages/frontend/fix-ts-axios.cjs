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
  
  if (code.includes('res.success')) {
    code = code.replace(/res\.success/g, '(res as any).success');
    changed = true;
  }
  if (code.includes('res.data')) {
    // be careful not to replace things like `(res as any).data.data` incorrectly, 
    // actually, `res.data` usually appears in `setDrives(res.data)`. 
    // Wait, replacing `res.data` with `(res as any).data` is safe.
    // Let's use negative lookbehind so we don't double replace `(res as any).data` if run twice.
    code = code.replace(/(?<!\bas any\)\.)res\.data/g, '(res as any).data');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, code);
    console.log('Fixed TS', file);
    count++;
  }
});
console.log('Total fixed TS:', count);
