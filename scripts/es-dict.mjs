// Copies the Polish hunspell dictionary from the dictionary-pl npm package into the
// Elasticsearch build context (docker/elasticsearch/hunspell/pl_PL).
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgDir = 'node_modules/dictionary-pl';
const out = 'docker/elasticsearch/hunspell/pl_PL';
mkdirSync(out, { recursive: true });
copyFileSync(join(pkgDir, 'index.aff'), join(out, 'pl_PL.aff'));
copyFileSync(join(pkgDir, 'index.dic'), join(out, 'pl_PL.dic'));
console.log(`hunspell dictionary written to ${out}`);
