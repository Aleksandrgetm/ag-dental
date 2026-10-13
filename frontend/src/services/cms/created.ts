export const createdKey=/^created\.(news|page|faq)\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type CreatedText=Record<'lv'|'ru'|'en',string>;
export type CreatedPayload={slug:string;date:string;title:CreatedText;summary:CreatedText;body:CreatedText;seo_title:CreatedText;seo_description:CreatedText;image:string;order:number;category?:CreatedText;author?:CreatedText};
export function validCreated(value:any):value is CreatedPayload {
 if(!value||typeof value!=='object'||Object.keys(value).filter(k=>!['category','author'].includes(k)).sort().join(',')!=='body,date,image,order,seo_description,seo_title,slug,summary,title')return false;
 if(typeof value.slug!=='string'||value.slug.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Number.isFinite(Date.parse(value.date))||typeof value.image!=='string'||!Number.isSafeInteger(value.order)||Math.abs(value.order)>1000000)return false;
 for(const [key,max] of [['title',200],['body',20000],['seo_title',200],['seo_description',500]] as const){const field=value[key];if(!field||Object.keys(field).sort().join(',')!=='en,lv,ru'||!['lv','ru','en'].every(l=>typeof field[l]==='string'&&field[l].trim()&&field[l].length<=max&&!/<\s*\/?\s*[a-z][^>]*>|[\x00-\x08\x0b\x0c\x0e-\x1f]/i.test(field[l])))return false}
 for(const [key,max] of [['summary',1000],['category',200],['author',200]] as const){const field=value[key];if(field===undefined&&key!=='summary')continue;if(!field||Object.keys(field).sort().join(',')!=='en,lv,ru'||!['lv','ru','en'].every(l=>typeof field[l]==='string'&&field[l].length<=max&&!/<\s*\/?\s*[a-z][^>]*>|[\x00-\x08\x0b\x0c\x0e-\x1f]/i.test(field[l])))return false}
 return true;
}
export const createdPath=(key:string,slug:string)=>`${key.startsWith('created.news.')?'/jaunumi':key.startsWith('created.faq.')?'/jautajumi':'/informacija'}/${slug}`;
export function emptyCreated():CreatedPayload {const text=()=>({lv:'',ru:'',en:''});return {slug:'',date:new Date().toISOString().slice(0,10),title:text(),summary:text(),body:text(),seo_title:text(),seo_description:text(),image:'',order:0}}
