/**
 * Hook-order linter: flags hooks (useState/useEffect/useRef/..) that appear
 * AFTER an early `return` statement inside the same .tsx/.ts React file,
 * excluding the main render return (`return (`). Rough heuristic, prints candidates.
 */
import fs from 'node:fs';
import { globSync } from 'node:fs';

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(p);
  }
};
walk('src');
walk('core');

let flagged = 0;
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let lastEarlyReturn = -1;
  lines.forEach((line, i) => {
    const isHook = /\buse[A-Z][A-Za-z]*\s*\(/.test(line) && !/function |const use[A-Z]/.test(line.split('//')[0]);
    const isEarlyReturn = /return null;|return null\s*;$/.test(line) || /if \(.*\) return null;/.test(line);
    if (isEarlyReturn) lastEarlyReturn = i;
    if (isHook && lastEarlyReturn >= 0 && i > lastEarlyReturn) {
      // ignore if the early return is inside a different function scope — approximate:
      console.log(`${file}:${i + 1} hook after early-return@${lastEarlyReturn + 1}: ${line.trim().slice(0, 70)}`);
      flagged++;
    }
  });
}
console.log(`\n${flagged} candidate lines (verify each: must be same component scope).`);
