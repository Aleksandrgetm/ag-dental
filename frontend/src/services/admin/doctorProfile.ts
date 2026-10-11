export const profileLocales = ['lv', 'ru', 'en'] as const;
export type ProfileIssue = {field:string;locale?:string};
export function editorialProfile(biography:any, home:any) {
 return {biography:biography&&JSON.parse(JSON.stringify(biography)),title:Object.fromEntries(profileLocales.map(l=>[l,home?.[l]?.doctorRole]))};
}
// Missing translations are errors, never replaced with invented translations.
export function profileIssue(profile:any):ProfileIssue|null {
 for(const field of ['title','biography','qualifications']) {
  const values=profile?.[field];
  if(!values||typeof values!=='object')return {field};
  for(const locale of profileLocales){const text=values[locale];if(typeof text!=='string'||Array.from(text).length>10000||/[<>\p{Cc}]/u.test(text.replace(/[\n\t]/g,'')))return {field,locale};}
  if(Object.keys(values).length!==3)return {field};
 }
 return null;
}
export function portraitReference(assets:any[],url:string):string {
 const asset=assets.find(a=>a.url===url&&!a.protected&&a.state==='ready'&&a.metadata?.kind==='image');
 if(!asset)throw Error('portraitInvalid');
 return asset.id;
}

export function sameLocalizedText(a:any,b:any):boolean {return JSON.stringify(a&&Object.entries(a).sort())===JSON.stringify(b&&Object.entries(b).sort())}
