import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'../backend/internal/cms/content.json'),'utf8'));
const baseline=Object.fromEntries(manifest.documents.filter(d=>d.target==='seo').map(d=>[d.path[0],d.data]));
for(const [route,translations] of Object.entries(baseline))for(const [locale,entry] of Object.entries(translations)){
 entry.imported_description=entry.description;
 const service=manifest.documents.find(d=>d.key==='service.'+route.split('/').at(-1));
 const news=manifest.documents.find(d=>d.key==='news.'+route.split('/').at(-1));
 const specific=route.startsWith('/pakalpojumi/')?service?.data.text?.[locale]:route.startsWith('/jaunumi/')?news?.data?.[locale]?.excerpt:null;
 entry.description=specific|| (route==='/'?entry.description:entry.title.replace(' · AG Zobārstniecība','')+'. '+entry.description);
}
fs.writeFileSync(path.join(root,'src/services/seo-baseline.json'),JSON.stringify(baseline,null,2)+'\n');
const {sitemapXML,SITE_ORIGIN}=await import('../src/services/seo.ts');
fs.writeFileSync(path.join(root,'public/sitemap.xml'),sitemapXML());
const robots='User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /pieraksts\nDisallow: /*?preview=\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\n';
fs.writeFileSync(path.join(root,'public/robots.txt'),robots);
console.log('Generated baseline SEO and public sitemap from approved content manifest.');
