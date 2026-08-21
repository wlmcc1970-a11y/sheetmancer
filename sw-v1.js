const CACHE='sheetmancer-shell-v75';
const FONT_CSS='https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap';
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil((async function(){
    const c=await caches.open(CACHE);
    try{await c.addAll([new Request('./',{cache:'reload'}),new Request('./index.html',{cache:'reload'})]);}catch(_){}
    try{await c.addAll(['./manifest.json','./icon-192.png','./icon-512.png','./icon-192-maskable.png','./icon-512-maskable.png','./apple-touch-icon.png']);}catch(_){}
    try{await c.add(FONT_CSS);}catch(_){}
  })());
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',function(e){
  var req=e.request; if(req.method!=='GET')return;
  // Network-first for page navigations so updates always land when online; cache is the offline fallback.
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(function(res){
      try{var copy=res.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});}catch(_){}
      return res;
    }).catch(function(){
      return caches.match('./index.html').then(function(h){return h||caches.match('./');});
    }));
    return;
  }
  // Cache-first for other assets (fonts, etc.).
  e.respondWith(caches.match(req).then(function(hit){
    if(hit)return hit;
    return fetch(req).then(function(res){
      try{var u=new URL(req.url);
        if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(u.host)){
          var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
      }catch(_){}
      return res;
    }).catch(function(){return caches.match(req).then(function(h){return h||new Response('',{status:504,statusText:'Offline'});});});
  }));
});
