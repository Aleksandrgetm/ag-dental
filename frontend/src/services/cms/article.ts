import type {CreatedPayload} from './created';
export type ArticleLocale = 'lv'|'ru'|'en';
export type LegacyArticle = {
 slug:string;title:string;date:string;category:string;image:string;source:string;
 excerpt:string;paragraphs:string[];introduction?:string;author?:string;
};
export type EditorialArticle = {
 slug:string;title:string;date:string;category:string;image:string;introduction:string;
 author:string;caption:string;body:string[];quote?:string;source?:string;
};
// Adapt data, not templates. Unmodified imported revisions keep their approved
// first-paragraph lead and existing image attribution; created news gets no invented author.
export function importedArticle(p:LegacyArticle):EditorialArticle {
 const explicit=p.introduction!==undefined;
 const paragraphs=explicit?p.paragraphs:p.paragraphs.slice(1);
 const quote=p.slug==='zobu-higiena-kas-pieejama-ikvienam'&&paragraphs.length?paragraphs.at(-1):undefined;
 return {slug:p.slug,title:p.title,date:p.date,category:p.category,image:p.image,
 introduction:explicit?p.introduction!:p.paragraphs[0]||'',author:p.author||'',
 caption:p.author??(p.image==='doctor'?'Dr. Anda Gutovska':'AG Zobārstniecība'),
 body:quote?paragraphs.slice(0,-1):paragraphs,quote,source:p.source};
}
export function createdArticle(p:CreatedPayload,locale:ArticleLocale):EditorialArticle {
 return {slug:p.slug,title:p.title[locale],date:p.date,category:p.category?.[locale]||'',
 image:p.image,introduction:p.summary[locale],author:p.author?.[locale]||'',caption:p.author?.[locale]||'',
 body:p.body[locale].split(/\n\s*\n/).filter(s=>s.trim())};
}
