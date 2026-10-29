/* Sheetmancer service worker (v93 2026-10-29: cache bump for Release B; logic unchanged. v89 2026-10-28: cache bump, feedback ?v=89; logic unchanged. v88 2026-10-28: cache bump; feedback script URL versioned; logic unchanged. v85 2026-10-27: cache bump for the portrait-sync fix, DS-05; logic unchanged. v80: Candlelit Table + Arcane Violet theme art precached, 2026-10-26; logic unchanged since v79).
   - App page (/ and /index.html): network first, but if the network has not answered in 2.5 s the saved
     copy opens at once and the network answer refreshes the saved copy for next time. Only a real
     (200) HTML answer for the app page is ever saved as the app.
   - Every other page (about, privacy, delete-account, press, /__/ sign-in pages) is left to the network
     and never saved as the app, so an offline launch always opens the app.
   - Fonts, icons, manifest and the pinned Firebase SDK files: cache first (they never change at a URL).
   - Update cleanup deletes only old sheetmancer-shell-* caches; nothing else in Cache Storage is touched. */
const CACHE='sheetmancer-shell-v93';
const PREFIX='sheetmancer-shell-';
const FB='https://www.gstatic.com/firebasejs/10.12.2/';
const STATIC=['./manifest.json','./digirune-feedback.js?v=89','./digirune-keepawake.js','./icon-192.png','./icon-512.png','./icon-192-maskable.png','./icon-512-maskable.png','./apple-touch-icon.png',
 './fonts/cinzel-latin-400-normal.woff2','./fonts/cinzel-latin-700-normal.woff2','./fonts/cormorant-garamond-latin-700-normal.woff2',
 './fonts/eb-garamond-latin-400-normal.woff2','./fonts/eb-garamond-latin-600-normal.woff2','./fonts/eb-garamond-latin-700-normal.woff2','./fonts/eb-garamond-latin-400-italic.woff2',
 './studio/table-plate.webp','./studio/candle-bokeh.webp','./studio/splash-whirlwind.webp','./studio/room-violet.webp','./studio/room-violet-plate.webp','./studio/room-neon.webp','./studio/room-neon-plate.webp','./studio/room-iron.webp','./studio/room-iron-plate.webp','./studio/room-verdant.webp','./studio/room-verdant-plate.webp','./studio/room-frost.webp','./studio/room-frost-plate.webp','./studio/room-gold.webp','./studio/room-gold-plate.webp','./studio/room-parch.webp','./studio/room-parch-plate.webp','./studio/room-paper.webp','./studio/room-paper-plate.webp'];
const SDK=[FB+'firebase-app.js',FB+'firebase-auth.js',FB+'firebase-firestore.js'];
const APP_URL=new URL('./index.html',self.location).href;
function isAppPage(u){try{var x=new URL(u);if(x.origin!==self.location.origin)return false;var base=new URL('./',self.location).pathname;return x.pathname===base||x.pathname===base+'index.html';}catch(_){return false;}}
function isHtml(res){try{return res&&res.ok&&res.status===200&&res.type!=='opaqueredirect'&&/text\/html/i.test(res.headers.get('content-type')||'');}catch(_){return false;}}
async function saveApp(res){try{if(!isHtml(res))return;const c=await caches.open(CACHE);await c.put(APP_URL,res.clone());await c.put(new URL('./',self.location).href,res.clone());}catch(_){}}
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil((async function(){
    const c=await caches.open(CACHE);
    try{const r=await fetch(new Request('./index.html',{cache:'reload'}));if(isHtml(r)){await c.put(APP_URL,r.clone());await c.put(new URL('./',self.location).href,r);}}catch(_){}
    try{await c.addAll(STATIC);}catch(_){}
    for(const u of SDK){try{await c.add(new Request(u,{mode:'cors',credentials:'omit'}));}catch(_){}}
  })());
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf(PREFIX)===0&&k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',function(e){
  var req=e.request; if(req.method!=='GET')return;
  var url=req.url;
  if(req.mode==='navigate'){
    if(!isAppPage(url))return;   /* not the app: the network answers, nothing is saved */
    e.respondWith((async function(){
      const net=fetch(req).then(function(res){if(isHtml(res)){var keep=res.clone();e.waitUntil(saveApp(keep));}return res;});
      const saved=async function(){const c=await caches.open(CACHE);return (await c.match(APP_URL))||(await c.match(new URL('./',self.location).href));};
      let timer;
      const slow=new Promise(function(res){timer=setTimeout(function(){res('slow');},2500);});
      try{
        const first=await Promise.race([net.then(function(r){return {r:r};},function(err){return {err:err};}),slow]);
        clearTimeout(timer);
        if(first==='slow'){const s=await saved();if(s){e.waitUntil(net.catch(function(){}));return s;}return await net;}
        if(first.r&&first.r.ok)return first.r;
        const s2=await saved();if(s2)return s2;   /* a hosting error page never replaces the saved app */
        if(first.r)return first.r;throw first.err;
      }catch(err){const s3=await saved();if(s3)return s3;throw err;}
    })());
    return;
  }
  var u;try{u=new URL(url);}catch(_){return;}
  var same=u.origin===self.location.origin;
  var cacheable=(same&&(/\/fonts\/[^/]+\.woff2$/.test(u.pathname)||/\/(manifest\.json|icon-[^/]+\.png|apple-touch-icon\.png|digirune-(feedback|keepawake)\.js)$/.test(u.pathname)))||url.indexOf(FB)===0||/^fonts\.(googleapis|gstatic)\.com$/.test(u.host);
  if(!cacheable)return;   /* everything else goes straight to the network */
  e.respondWith(caches.match(req).then(function(hit){
    if(hit)return hit;
    return fetch(req).then(function(res){
      if(res&&(res.ok||res.type==='opaque')){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      return res;
    });
  }));
});
