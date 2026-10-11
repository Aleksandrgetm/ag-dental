import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validPricePayload,visiblePriceRows} from '../src/services/cms/priceRows.ts';
import manifest from '../../backend/internal/cms/content.json' with {type:'json'};
test('price row order and archiving preserve reference offsets without mutating source',()=>{
 const base=manifest.documents.find(d=>d.key==='prices.0').data;
 const next=structuredClone(base);next.items[0].display_order=20;
 assert.equal(validPricePayload(base,next),true);
 assert.equal(visiblePriceRows(next.items)[0],next.items[1]);
 assert.equal(next.items[0].price,'50.00');
 next.items[0].archived=true;assert.equal(visiblePriceRows(next.items).length,1);
 next.items.push({name:{lv:'Synthetic LV',ru:'Synthetic RU',en:'Synthetic EN'},price:'12.00'});
 assert.equal(validPricePayload(base,next),true);
 next.items[2].name.en='';assert.equal(validPricePayload(base,next),false);
 assert.equal(validPricePayload(base,{...base,items:base.items.slice(1)}),false);
 assert.equal(validPricePayload(base,{...base,unexpected:'value'}),false);
});
