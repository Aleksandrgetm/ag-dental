export type PriceRow = {name:Record<string,string>;price:string;review?:boolean;archived?:boolean;display_order?:number};
export function visiblePriceRows<T extends object>(rows:T[]):T[]{
 return rows.map((row,index)=>({row,index})).filter(({row})=>!(row as any).archived).sort((a,b)=>((a.row as any).display_order??a.index)-((b.row as any).display_order??b.index)||a.index-b.index).map(({row})=>row);
}
export function validPricePayload(baseline:any,value:any):boolean{
 const obj=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const text=(v:any)=>obj(v)&&Object.keys(v).length===3&&['lv','ru','en'].every(l=>typeof v[l]==='string'&&v[l].trim()&&v[l].length<=2000&&!/<\s*\/?\s*[a-z][^>]*>|[\x00-\x08\x0b\x0c\x0e-\x1f]/i.test(v[l]));
 if(!obj(value)||Object.keys(value).sort().join()!=='concession,items,title'||value.concession!==baseline.concession||!text(value.title)||!Array.isArray(value.items)||value.items.length<baseline.items.length||value.items.length>300)return false;
 return value.items.every((row:any,index:number)=>obj(row)&&Object.keys(row).every(k=>['name','price','review','archived','display_order'].includes(k))&&text(row.name)&&typeof row.price==='string'&&/^[0-9]{1,7}(\.[0-9]{1,2})?(\/[0-9]{1,7}(\.[0-9]{1,2})?)*$/.test(row.price)&&(row.archived===undefined||typeof row.archived==='boolean')&&(row.display_order===undefined||(Number.isInteger(row.display_order)&&Math.abs(row.display_order)<=1000000))&&(index<baseline.items.length?row.review===baseline.items[index].review:row.review===undefined));
}
