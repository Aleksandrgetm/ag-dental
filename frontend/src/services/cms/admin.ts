import {newsTrace,newsTraceReadOnly} from '../admin/newsTrace';
import { API_URL } from "../api";
import { useAuthStore } from "../../stores/auth";
export async function cmsRequest(
  path: string,
  signal: AbortSignal,
  body?: unknown,
  method = "GET",
) {
  const auth = useAuthStore(),
    initial = auth.session;
  const archiveAction = /\/(archive|restore-archive)$/.test(path);
  if (archiveAction) newsTrace('api.guard', {configured:!!API_URL, verified:auth.verifiedAdmin, session:!!initial, aborted:signal.aborted});
  if (!API_URL || !auth.verifiedAdmin || !initial || !/^(?:\/[a-zA-Z0-9._-]+(?:\/(?:draft|publish|rollback|unpublish|save-publish|archive|restore-archive))?)?$/.test(path)) throw Error("unavailable");
  const current=()=>!signal.aborted&&auth.user?.id===initial.user.id&&auth.session?.access_token===initial.access_token&&auth.verifiedAdmin;
  if (archiveAction && newsTraceReadOnly()) {
    newsTrace('api.read-only-stop', {wouldSend:current()});
    throw Error('unavailable');
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/admin/cms${path==='/catalog'?'/catalog':'/documents'+path}`, {
      method,
      headers: {
        Authorization: `Bearer ${initial.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    });
  } catch {
    throw Error(path.endsWith("/save-publish") ? "articleSaveFailed" : "unavailable");
  }
  if (
    !current()
  )
    throw Error("unavailable");
  if (response.status === 401 || response.status === 403) {
    auth.rejectAdminAccess(
      response.status === 401 ? "unauthorized" : "forbidden",
    );
    throw Error("unavailable");
  }
  if (response.status === 503 && /\/(archive|restore-archive|archived-news)$/.test(path)) {
    const failure = await response.json().catch(() => null);
    if (failure?.error === "news_archive_unavailable") throw Error("archiveUnavailable");
  }
  if(response.status===422&&path==='/catalog'){
    const body=await response.json().catch(()=>null);
    throw Object.assign(Error('invalid'),{field:['service','category','price','image','booking'].includes(body?.field)?body.field:''});
  }
  if (response.status === 422 && path.endsWith('/save-publish')) {
    const failure = await response.json().catch(() => null);
    const field = failure?.field;
    if (failure?.error === 'image_association_failed' && field === 'image')
      throw Object.assign(Error('imageAssociation'), {field:'image'});
    if (typeof field === 'string' && /^(image|date|(title|body|summary|category|author|seo_title|seo_description)\.(lv|ru|en))$/.test(field))
      throw Object.assign(Error('invalid'), {field});
    throw Error('publicationRejected');
  }
  if (!response.ok)
    throw Error(
      response.status === 409
        ? "conflict"
        : response.status === 422
          ? "invalid"
          : path.endsWith("/save-publish") ? "articleSaveFailed" : "unavailable",
    );
  try {
    const result=await response.json();
    if(!current())throw Error("unavailable");
    return result;
  } catch {
    throw Error("unavailable");
  }
}
