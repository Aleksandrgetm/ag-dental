import baseline from './seo-baseline.json' with {type:'json'};
export const SITE_ORIGIN='https://www.zobarstnieciba-ag.lv';
export const locales=['lv','ru','en'] as const;
export const publicPaths=Object.keys(baseline).filter(p=>!/^\/(admin|login|register|forgot-password|reset-password|pieraksts)(\/|$)/.test(p)&&!p.includes('*'));
export const canonicalURL=(path:string,locale:string)=>SITE_ORIGIN+path+(locale==='ru'||locale==='en'?'?lang='+locale:'');
export const seoBaseline=baseline as Record<string,Record<string,{title:string;description:string}>>;
export function resolveSEO(path:string,locale:string,published?:{title:string;description:string}){
 const base=(baseline as Record<string,Record<string,{title:string;description:string;imported_description?:string}>>)[path]?.[locale];
 return published?{title:published.title,description:published.description===base?.imported_description?base.description:published.description}:base;
}
export function escapeHTML(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
export function metadataHTML(path:string,locale:string,content:{title:string;description:string},indexable=true){
 const url=canonicalURL(path,locale);return `<title>${escapeHTML(content.title)}</title><meta name="description" content="${escapeHTML(content.description)}"><meta name="robots" content="${indexable?'index, follow':'noindex, nofollow'}"><link rel="canonical" href="${escapeHTML(url)}">`+(indexable?[...locales,'x-default'].map(l=>`<link rel="alternate" hreflang="${l}" href="${escapeHTML(canonicalURL(path,l==='x-default'?'lv':l))}">`).join(''):'')+`<meta property="og:title" content="${escapeHTML(content.title)}"><meta property="og:description" content="${escapeHTML(content.description)}"><meta property="og:url" content="${escapeHTML(url)}"><meta property="og:type" content="website">`;
}
export function sitemapXML(paths=publicPaths){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+paths.flatMap(path=>locales.map(locale=>'<url><loc>'+escapeHTML(canonicalURL(path,locale))+'</loc>'+[...locales,'x-default'].map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${escapeHTML(canonicalURL(path,l==='x-default'?'lv':l))}"/>`).join('')+'</url>')).join('\n')+'</urlset>\n'}

// Preserve approved route metadata before deriving anything from editorial copy.
// Newly created routes may carry independent metadata in the service catalog.
export function resolveServiceSEO(path:string,locale:string,service:{title:Record<string,string>;short:Record<string,string>;text:Record<string,string>;seo_title?:Record<string,string>;seo_description?:Record<string,string>},published?:{title:string;description:string}){
 const approved=resolveSEO(path,locale,published);
 return approved?{title:approved.title,description:approved.description}:{title:service.seo_title?.[locale]||service.title[locale]+' · AG Zobārstniecība',description:service.seo_description?.[locale]||service.short[locale]||service.text[locale]};
}
