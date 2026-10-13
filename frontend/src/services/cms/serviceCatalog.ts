export type LocalText=Record<'lv'|'ru'|'en',string>;
export type CatalogPrice={id:string;name:LocalText;price:string;type:'fixed'|'from'|'consultation'|'text';review?:boolean;archived:boolean;display_order:number};
export type CatalogCategory={id:string;title:LocalText;concession:unknown;items:CatalogPrice[]};
export type CatalogService={id:string;booking_id:string;seo_title?:LocalText;seo_description?:LocalText;slug:string;title:LocalText;short:LocalText;text:LocalText;image:string;category:string;price_id:string;published:boolean;archived:boolean};
export type ServiceCatalog={services:CatalogService[];categories:CatalogCategory[]};
export const emptyText=():LocalText=>({lv:'',ru:'',en:''});
export function validServiceCatalog(v:any):v is ServiceCatalog{
 const text=(x:any)=>x&&['lv','ru','en'].every(l=>typeof x[l]==='string');
 return !!v&&Array.isArray(v.services)&&Array.isArray(v.categories)&&v.services.length<=500&&v.categories.length<=100&&v.services.every((s:any)=>typeof s.id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug)&&text(s.title)&&text(s.text)&&text(s.short)&&typeof s.image==='string'&&typeof s.category==='string'&&typeof s.price_id==='string'&&typeof s.published==='boolean'&&typeof s.archived==='boolean')&&v.categories.every((c:any)=>typeof c.id==='string'&&text(c.title)&&Array.isArray(c.items)&&c.items.every((p:any)=>typeof p.id==='string'&&text(p.name)&&typeof p.price==='string'&&['fixed','from','consultation','text'].includes(p.type)&&typeof p.archived==='boolean'));
}
export function catalogPriceText(p:CatalogPrice,lang:string):string{
 if(p.type==='consultation')return {lv:'Pēc konsultācijas',ru:'После консультации',en:'On consultation'}[lang]||'Pēc konsultācijas';
 const value=/^\d+(\.\d{1,2})?(\/\d+(\.\d{1,2})?)*$/.test(p.price)?p.price.split('/').map(n=>Number(n).toLocaleString('lv-LV',{minimumFractionDigits:2,maximumFractionDigits:2})+' €').join(' / '):p.price;
 return p.type==='from'?({lv:'no ',ru:'от ',en:'from '}[lang]||'no ')+value:value;
}
