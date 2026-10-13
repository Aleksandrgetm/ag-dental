import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPriceText,validServiceCatalog} from '../src/services/cms/serviceCatalog.ts';
import {resolvePublic} from '../api/render.ts';
const text={lv:'LV',ru:'RU',en:'EN'},service={id:'service.synthetic',booking_id:'',slug:'synthetic-service',title:text,short:text,text,image:'',category:'category.synthetic',price_id:'',published:true,archived:false};
test('catalog price types preserve text and localize presentation',()=>{
 const p={price:'51.50',type:'fixed'};assert.equal(catalogPriceText(p,'en'),'51,50 €');assert.equal(catalogPriceText({...p,type:'from'},'ru'),'от 51,50 €');assert.equal(catalogPriceText({...p,type:'text',price:'50 / consultation'},'en'),'50 / consultation');assert.equal(catalogPriceText({...p,type:'consultation'},'en'),'On consultation');
});
test('catalog service routes and archival override static SEO fallback',()=>{
 const c={services:[service],categories:[{id:'category.synthetic',title:text,items:[]}]};assert.equal(validServiceCatalog(c),true);const rows=[{key:'catalog.services',payload:c}];assert.equal(resolvePublic('/pakalpojumi/synthetic-service','ru',rows).status,200);assert.equal(resolvePublic('/pakalpojumi/konsultacija','lv',rows).status,404);c.services[0]={...service,archived:true};assert.equal(resolvePublic('/pakalpojumi/synthetic-service','ru',rows).status,404);
});
