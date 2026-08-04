const VER='bcmca-2026-08-03-f1';
const SHELL=['./','index.html','manifest.webmanifest','search-index.json',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(
    ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  if(u.pathname.endsWith('.pdf')){
    // cache-first: protocols are versioned by deploy
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
      const cp=n.clone();caches.open(VER).then(c=>c.put(e.request,cp));return n;})));
  } else {
    // network-first: shell and index stay fresh, fall back to cache offline
    e.respondWith(fetch(e.request).then(n=>{
      const cp=n.clone();caches.open(VER).then(c=>c.put(e.request,cp));return n;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true})
      .then(r=>r||caches.match('./'))));
  }
});
self.addEventListener('message',async e=>{
  if(!e.data||!e.data.cacheAll) return;
  const port=e.ports[0], files=e.data.cacheAll, c=await caches.open(VER);
  let i=0;
  for(const f of files){
    try{ if(!(await c.match(f))){ await c.add(f); } }catch(err){}
    i++; if(i%5===0||i===files.length) port.postMessage({i,total:files.length});
  }
  port.postMessage({done:true});
});
