#!/usr/bin/env node
/** Convert a single-bundle Expo web export into a portable, double-clickable preview. */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || path.join(project, 'work/share-web'));
const destination = path.resolve(process.argv[3] || path.join(project, 'Mezatonline-Ac.html'));
const mime = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.json': 'application/json', '.wasm': 'application/wasm',
};

async function walk(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.filter((entry) => !entry.name.startsWith('.')).map(async (entry) => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
  }));
  return groups.flat();
}

function escapeScript(value) {
  return value.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

async function main() {
  const files = await walk(source);
  const names = new Set(files);
  if (!names.has('index.html')) throw new Error(`index.html bulunamadı: ${source}`);
  const javascript = files.filter((file) => /\.(?:m?js)$/.test(file));
  if (javascript.length !== 1) {
    throw new Error(`Tek JavaScript paketi gerekli; ${javascript.length} bulundu. Expo web dışa aktarımında asyncRoutes ve bölünmüş paketleri kapatın. Dosyalar: ${javascript.join(', ') || '(yok)'}`);
  }

  const cache = new Map();
  const embeddedFiles = new Set();

  function resolveReference(reference, from) {
    if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return null;
    let clean;
    try { clean = decodeURIComponent(reference.split(/[?#]/, 1)[0].replace(/\\\//g, '/')); } catch { return null; }
    const root = clean.replace(/^\.?\//, '');
    const local = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
    return names.has(root) ? root : names.has(local) ? local : null;
  }

  async function dataUrl(file, ancestors = new Set()) {
    if (ancestors.has(file)) throw new Error(`Döngüsel dosya başvurusu paketlenemedi: ${file}`);
    if (cache.has(file)) return cache.get(file);
    // Cache in-flight work too: parallel references to one font/image share one read.
    const nextAncestors = new Set([...ancestors, file]);
    const pending = (async () => {
      const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
      let bytes = await readFile(path.join(source, file));
      if (/\.(?:m?js|css|json)$/i.test(file)) bytes = Buffer.from(await rewriteText(bytes.toString('utf8'), file, nextAncestors));
      const result = `data:${type};base64,${bytes.toString('base64')}`;
      embeddedFiles.add(file);
      return result;
    })();
    cache.set(file, pending);
    return pending;
  }

  async function replaceAsync(text, expression, replace) {
    const matches = [...text.matchAll(expression)];
    const replacements = await Promise.all(matches.map((match) => replace(match)));
    for (let index = matches.length - 1; index >= 0; index--) {
      const match = matches[index];
      text = text.slice(0, match.index) + replacements[index] + text.slice(match.index + match[0].length);
    }
    return text;
  }

  async function rewriteText(text, from, ancestors = new Set()) {
    text = text.replace(/\/\/[#@]\s*sourceMappingURL=[^\r\n]*/g, '').replace(/\/\*[#@]\s*sourceMappingURL=[\s\S]*?\*\//g, '');
    // Exported asset URIs are literal strings. Handle root, root-relative and CSS-relative paths.
    text = await replaceAsync(text, /(["'`])((?:\/?(?:assets|_expo)\/|\.{1,2}\/|\/)[^"'`\r\n]*?)\1/g, async (match) => {
      const file = resolveReference(match[2], from);
      if (!file || /\.(?:m?js)$/i.test(file)) return match[0];
      return `${match[1]}${await dataUrl(file, ancestors)}${match[1]}`;
    });
    text = await replaceAsync(text, /url\(\s*(["']?)([^"')]+)\1\s*\)/g, async (match) => {
      const file = resolveReference(match[2].trim(), from);
      return file ? `url("${await dataUrl(file, ancestors)}")` : match[0];
    });
    return text;
  }

  let inner = await readFile(path.join(source, 'index.html'), 'utf8');
  inner = inner.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');
  inner = await replaceAsync(inner, /<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script\s*>/gi, async (match) => {
    const file = resolveReference(match[3], 'index.html');
    if (!file) throw new Error(`Yerel olmayan veya bulunamayan başlangıç betiği: ${match[3]}`);
    const code = await rewriteText(await readFile(path.join(source, file), 'utf8'), file);
    embeddedFiles.add(file);
    // Preserve defer semantics: srcdoc reaches its root markup before the bundle executes.
    return `<script>document.addEventListener('DOMContentLoaded',function(){\n${escapeScript(code)}\n});<\/script>`;
  });
  inner = await replaceAsync(inner, /<link\b[^>]*>/gi, async (match) => {
    const tag = match[0];
    const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(tag);
    if (!href) return tag;
    const file = resolveReference(href[2], 'index.html');
    if (!file) return tag;
    if (/\brel\s*=\s*["']stylesheet["']/i.test(tag)) {
      const css = await rewriteText(await readFile(path.join(source, file), 'utf8'), file);
      embeddedFiles.add(file);
      return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
    }
    if (/\brel\s*=\s*["'](?:modulepreload|preload|prefetch)["']/i.test(tag)) return '';
    return tag.replace(href[0], `href="${await dataUrl(file)}"`);
  });
  inner = await replaceAsync(inner, /\b(src|poster)\s*=\s*(["'])(.*?)\2/gi, async (match) => {
    const file = resolveReference(match[3], 'index.html');
    return file ? `${match[1]}="${await dataUrl(file)}"` : match[0];
  });

  const bridge = `<script>(function(){
    // Clear this preview's saved demo state before the application hydrates.
    try{if(parent.__mezatPreviewFreshStart===true){var storage=localStorage;for(var index=storage.length-1;index>=0;index--){var key=storage.key(index);if(key&&key.indexOf('mezat:')===0)storage.removeItem(key)}parent.__mezatPreviewFreshStart=false}}catch(_){}
    function tell(type,message){parent.postMessage({source:'mezatonline-preview',type:type,message:message||''},'*')}
    addEventListener('error',function(event){if(event.message)tell('error',event.message)});
    addEventListener('unhandledrejection',function(event){var error=event.reason;if(error&&error.name==='NotAllowedError')return;tell('error',error&&error.message||String(error))});
    addEventListener('DOMContentLoaded',function(){
      var ready=false;
      function check(){var root=document.getElementById('root');if(!ready&&root&&root.textContent.trim().length>10){ready=true;tell('ready');observer.disconnect()}}
      var observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true,characterData:true});check();
    });
  })();<\/script>`;
  inner = inner.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}<meta name="color-scheme" content="light">${bridge}`);
  let sourceCommit = 'unknown';
  try { sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8' }).trim(); } catch {}
  const builtAt = new Date().toISOString();
  const encoded = Buffer.from(inner).toString('base64');
  const outer = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><meta name="theme-color" content="#ffffff"><meta name="mezatonline-source-commit" content="${sourceCommit}"><meta name="mezatonline-built-at" content="${builtAt}"><title>Mezatonline · Paylaşım önizlemesi</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#202020;background:#f4f3ef}button{font:inherit;cursor:pointer}header{height:80px;padding:0 32px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e3e1db;background:rgba(255,255,255,.9)}.brand{display:flex;align-items:center;gap:12px}.mark{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#0D9488;color:#fff;font-size:21px;font-weight:900}.name{font-weight:800;font-size:19px;letter-spacing:-.5px}.eyebrow{margin-top:3px;font-size:12px;color:#74736c}.actions{display:flex;gap:8px}.actions button,.retry{border:1px solid #d8d6cf;background:#fff;border-radius:9px;padding:9px 13px;font-size:12px;font-weight:650;color:#34342e}.actions button:hover,.retry:hover{background:#0D9488;border-color:#0D9488;color:#fff}.stage{position:absolute;inset:80px 0 44px;display:flex;align-items:center;justify-content:center;padding:16px}.sizer{position:relative;flex:none}.phone{position:absolute;left:0;top:0;width:406px;height:860px;transform-origin:top left;border:8px solid #222;border-radius:35px;overflow:hidden;background:#fff;box-shadow:0 22px 65px #2222,0 4px 15px #0001}iframe{display:block;border:0;width:390px;height:844px;background:#fff}.status{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;text-align:center;padding:34px;background:#fff}.status[hidden]{display:none}.spinner{width:30px;height:30px;border:3px solid #eee;border-top-color:#202020;border-radius:50%;animation:spin .8s linear infinite}.status strong{font-size:17px}.status p{margin:0;max-width:280px;font-size:13px;line-height:1.6;color:#737373;overflow-wrap:anywhere}.status.error .spinner{display:none}.retry{display:none}.status.error .retry{display:block}.note{position:absolute;bottom:0;left:0;right:0;height:44px;padding:0 20px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;color:#73716b;line-height:1.4}@keyframes spin{to{transform:rotate(360deg)}}
/* Phone browsers get the app canvas without the desktop preview furniture. */
@media (max-width:600px), (max-width:1024px) and (max-height:600px){
  html,body{width:100%;height:100%;overscroll-behavior:none;background:#fff}
  body{height:100vh;height:100dvh;height:var(--visible-height,100dvh)}
  header,.note{display:none}
  .stage{position:fixed;top:0;left:0;right:0;bottom:auto;height:100vh;height:100dvh;height:var(--visible-height,100dvh);padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);align-items:stretch;justify-content:stretch;min-height:0}
  .sizer{width:100%;height:100%;min-width:0;min-height:0}
  .phone{border:0;border-radius:0;box-shadow:none;background:#fff}
  iframe{background:#fff}
}
</style></head><body>
<header><div class="brand"><div class="mark" aria-hidden="true">m.</div><div><div class="name">mezatonline</div><div class="eyebrow">Paylaşım önizlemesi</div></div></div><nav class="actions" aria-label="Önizleme kontrolleri"><button id="home" type="button">Ana sayfa</button><button id="reset" type="button">Baştan başlat</button></nav></header>
<main class="stage" id="stage"><div class="sizer" id="sizer"><div class="phone" id="phone"><iframe id="app" title="Mezatonline telefon önizlemesi" allow="camera; microphone; autoplay; clipboard-write" referrerpolicy="no-referrer"></iframe><div class="status" id="status" role="status" aria-live="polite"><div class="spinner"></div><strong id="status-title">Mezatonline açılıyor</strong><p id="status-detail">Telefon önizlemesi hazırlanıyor…</p><button class="retry" id="retry" type="button">Yeniden dene</button></div></div></div></main>
<footer class="note">Demo verilerle çalışır. Görseller ve videolar için internet bağlantısı gerekir.</footer>
<script>
(function(){
  var bytes=Uint8Array.from(atob('${encoded}'),function(c){return c.charCodeAt(0)});
  var html=new TextDecoder().decode(bytes);
  var app=document.getElementById('app'),phone=document.getElementById('phone'),stage=document.getElementById('stage'),sizer=document.getElementById('sizer'),status=document.getElementById('status');
  var title=document.getElementById('status-title'),detail=document.getElementById('status-detail'),timer;
  var mobileLayout=matchMedia('(max-width:600px), (max-width:1024px) and (max-height:600px)');
  function fit(){
    var viewport=window.visualViewport;
    document.documentElement.style.setProperty('--visible-height',(viewport?viewport.height:innerHeight)+'px');
    var mobile=mobileLayout.matches;
    var styles=getComputedStyle(stage);
    var availableW=Math.max(1,stage.clientWidth-parseFloat(styles.paddingLeft)-parseFloat(styles.paddingRight));
    var availableH=Math.max(1,stage.clientHeight-parseFloat(styles.paddingTop)-parseFloat(styles.paddingBottom));
    var width=mobile?availableW:406,height=mobile?availableH:860;
    var scale=mobile?1:Math.min(1,availableW/width,availableH/height);
    app.style.width=(mobile?width:390)+'px';
    app.style.height=(mobile?height:844)+'px';
    phone.style.width=width+'px';phone.style.height=height+'px';
    phone.style.transform='scale('+scale+')';
    sizer.style.width=width*scale+'px';sizer.style.height=height*scale+'px';
  }
  function error(message){clearTimeout(timer);status.hidden=false;status.classList.add('error');title.textContent='Önizleme açılamadı';detail.textContent=message||'Lütfen yeniden deneyin.'}
  function load(fresh){if(fresh===true)window.__mezatPreviewFreshStart=true;clearTimeout(timer);status.hidden=false;status.classList.remove('error');title.textContent='Mezatonline açılıyor';detail.textContent='Telefon önizlemesi hazırlanıyor…';app.srcdoc=html;timer=setTimeout(function(){error('Tarayıcı önizlemeyi başlatamadı. Dosyayı güncel Chrome, Edge veya Safari ile açıp yeniden deneyin.')},45000)}
  addEventListener('message',function(event){var data=event.data;if(event.source!==app.contentWindow||!data||data.source!=='mezatonline-preview')return;if(data.type==='ready'){clearTimeout(timer);status.hidden=true}else if(data.type==='error'){error(data.message)}});
  addEventListener('pageshow',function(event){if(event.persisted)load(true)});
  document.getElementById('home').onclick=load;
  document.getElementById('reset').onclick=function(){try{if(typeof app.contentWindow.__mezatPreviewReset==='function')app.contentWindow.__mezatPreviewReset()}catch(_){}load(true)};
  document.getElementById('retry').onclick=load;addEventListener('resize',fit);addEventListener('orientationchange',fit);if(window.visualViewport){visualViewport.addEventListener('resize',fit)}mobileLayout.addEventListener('change',fit);new ResizeObserver(fit).observe(stage);fit();load(true);
})();
</script></body></html>`;
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, outer);
  const size = (Buffer.byteLength(outer) / 1024 / 1024).toFixed(2);
  console.log(`Hazır: ${destination}\n${embeddedFiles.size} yerel dosya gömüldü; ${size} MB. Sunucu veya kurulum gerekmez.`);
}

main().catch((error) => { console.error(`Önizleme paketlenemedi: ${error.message}`); process.exitCode = 1; });
