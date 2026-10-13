import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('review branch push cannot opt into automatic Vercel deployment',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)));
 assert.deepEqual(config.git.deploymentEnabled,{'feature/final-development':false,'feature/hero-mobile-fix':false});
});
