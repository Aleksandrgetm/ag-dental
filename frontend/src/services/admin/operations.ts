import { API_URL } from '../api';
import { useAuthStore } from '../../stores/auth';
export type OperationRow = {id:string;version:string;data:Record<string,any>};
export async function operationRequest(path:string,signal:AbortSignal,body?:unknown,method='GET',idempotencyKey?:string) {
 const auth=useAuthStore(), session=auth.session;
 const operations=/^\/operations\/(services|doctors|schedules|time-off|appointments)(?:\/options|\/preview\?service_id=[a-f0-9-]{36}&doctor_id=[a-f0-9-]{36}&date=[0-9-]{10}|\/[a-f0-9-]{36}(?:\/history)?)?$/.test(path);
 const appointments=/^\/booking\/(?:settings|appointments(?:\/search|\/[a-f0-9-]{36}(?:\/(?:status|reschedule|history)|\/availability\?service_id=[a-f0-9-]{36}&doctor_id=[a-f0-9-]{36}&date=[0-9-]{10})?)?)$/.test(path);
 if(!API_URL||!session||!auth.verifiedAdmin||!(operations||appointments))throw Error('unavailable');
 const identity=session.user.id,token=session.access_token;
 const current=()=>!signal.aborted&&auth.user?.id===identity&&auth.session?.access_token===token&&auth.verifiedAdmin;
 const r=await fetch(API_URL+'/admin'+path,{method,body:body===undefined?undefined:JSON.stringify(body),headers:{Authorization:'Bearer '+session.access_token,...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},cache:'no-store',credentials:'omit',signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});
 if(!current())throw Error('unavailable');
 if(r.status===401||r.status===403){auth.rejectAdminAccess(r.status===401?'unauthorized':'forbidden');throw Error('unavailable')}
 if(r.status===409){const detail=await r.json().catch(()=>({}));if(detail.error==='schedule_impact'&&Number.isInteger(detail.affected_appointments)&&detail.affected_appointments>0){const error=Object.assign(Error('impact'),{count:detail.affected_appointments});throw error}}
 if(r.status===400||r.status===422){const d=await r.json().catch(()=>({}));if(['nameRequired','profileInvalid','profileFieldInvalid','portraitInvalid','editorialInvalid','linkRequired','profileRequestInvalid','timeOrder','timeOverlap','effectiveOrder'].includes(d.validation_code))throw Object.assign(Error('invalid'),{validation:d.validation_code,day:d.weekday,field:['title','biography','qualifications','portrait','editorial_key'].includes(d.field)?d.field:'',locale:['lv','ru','en'].includes(d.locale)?d.locale:''});throw Error('invalid')}
 if(r.status===503){const d=await r.json().catch(()=>({}));throw Error(d.error==='booking_not_configured'?'notReady':'unavailable')}
 if(!r.ok)throw Error(r.status===409?'conflict':r.status===400||r.status===422?'invalid':'unavailable');
 const result=r.status===204?null:await r.json();
 if(!current())throw Error('unavailable');
 return result;
}
