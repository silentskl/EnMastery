export const LIBRARY_REFRESH_EVENT="english-mastery:library-refresh";
export function notifyLibraryRefresh(domain="all"){
 if(typeof window==="undefined")return;
 sessionStorage.setItem(LIBRARY_REFRESH_EVENT,JSON.stringify({domain,at:Date.now()}));
 window.dispatchEvent(new CustomEvent(LIBRARY_REFRESH_EVENT,{detail:{domain}}));
}
