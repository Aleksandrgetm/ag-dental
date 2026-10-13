export type NewsLanguage='lv'|'ru'|'en';
export type NewsField='title'|'body'|'introduction'|'category'|'author'|'date'|'image';
export type NewsIssue={field:NewsField;language?:NewsLanguage};
const markup=/<\s*\/?\s*[a-z][^>]*>|[\x00-\x08\x0b\x0c\x0e-\x1f]/i;
export function newsIssues(text:(field:Exclude<NewsField,'date'|'image'>,lang:NewsLanguage)=>string,date:string,image:string,imported=false):NewsIssue[]{
 const issues:NewsIssue[]=[];
 for(const language of ['lv','ru','en'] as const){
  for(const [field,max] of [['title',imported?12000:200],['body',imported?12000:20000],['introduction',1000],['category',imported?12000:200],['author',200]] as const){
   const value=text(field,language),required=field==='title'||field==='body'&&!(imported&&text('introduction',language).trim());
   const parts=imported&&field==='body'?value.split(/\n\s*\n/):[value];
   if(required&&!value.trim()||parts.some(v=>new TextEncoder().encode(v).length>max||markup.test(v)))issues.push({field,language});
  }
 }
 const parsed=new Date(date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)issues.push({field:'date'});
 if(!image)issues.push({field:'image'});
 return issues;
}
export function newsServerIssue(path:string):NewsIssue|undefined {
 const [field,language]=path.split('.');
 if(field==='date'||field==='image')return {field};
 const mapped=field==='summary'?'introduction':field==='seo_title'?'title':field==='seo_description'?'introduction':field;
 if(['title','body','introduction','category','author'].includes(mapped)&&['lv','ru','en'].includes(language||''))return {field:mapped as NewsField,language:language as NewsLanguage};
}

// Derived SEO text must obey the Go UTF-8 byte limit without cutting a character.
export function newsExcerpt(value:string,max=500):string {let result='',size=0;for(const c of value){const bytes=new TextEncoder().encode(c).length;if(size+bytes>max)break;size+=bytes;result+=c}return result}
