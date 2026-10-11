import {calendarDate,monthDates} from '../booking/calendar.ts';
export type CalendarMode='day'|'week'|'month'|'list';
export function shiftDay(date:string,days:number){const d=calendarDate(date);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function calendarRange(date:string,mode:CalendarMode):{from:string;to:string;days:string[]}{
 let from=date,to=date;
 if(mode==='week'){from=shiftDay(date,-((calendarDate(date).getUTCDay()+6)%7));to=shiftDay(from,6)}
 if(mode==='month'){const values=monthDates(date.slice(0,7));from=values[0]!;to=values.at(-1)!}
 if(mode==='list')to=shiftDay(date,30);
 const days:string[]=[];for(let d=from;d<=to;d=shiftDay(d,1))days.push(d);
 return {from,to,days};
}
export function transitions(status:string):string[]{return status==='pending'?['confirmed','cancelled','rejected']:status==='confirmed'?['completed','cancelled','no_show']:[]}
