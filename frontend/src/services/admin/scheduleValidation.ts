export type EditableHour={id?:string;weekday:number;start:string;end:string;effective_from?:string;effective_until?:string};
export function scheduleErrors(hours:EditableHour[]):Record<number,string>{
 const errors:Record<number,string>={};
 for(const h of hours){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.start)||(!/^([01]\d|2[0-3]):[0-5]\d$/.test(h.end)&&h.end!=='24:00'))errors[h.weekday]='timeRequired';
  else if(h.start>=h.end)errors[h.weekday]='timeOrder';
  else if(h.effective_from&&h.effective_until&&h.effective_from>h.effective_until)errors[h.weekday]='effectiveOrder';
 }
 for(let i=0;i<hours.length;i++)for(let j=i+1;j<hours.length;j++){
  const a=hours[i]!,b=hours[j]!;
  if(a.weekday===b.weekday&&a.start<b.end&&b.start<a.end&&(a.effective_from||'0000')<=(b.effective_until||'9999')&&(b.effective_from||'0000')<=(a.effective_until||'9999'))errors[a.weekday]='timeOverlap';
 }
 return errors;
}
