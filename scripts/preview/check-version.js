/* Keep a hosted preview current when an old tab returns from the background. */
(function () {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
  var marker = document.querySelector('meta[name="mezatonline-source-commit"]');
  var currentCommit = marker && marker.content;
  if (!/^[a-f0-9]{40}$/i.test(currentCommit || '')) return;
  currentCommit = currentCommit.toLowerCase();

  var checking = false;
  var reloading = false;
  var lastCheck = -Infinity;
  var deferredCheck = null;
  var minimumInterval = 15000;
  var guardKey = 'mezatonline:version-reload:' + window.location.pathname;

  function canCheck() {
    return !reloading && document.visibilityState !== 'hidden' && navigator.onLine !== false;
  }

  function rememberedTarget() {
    try { return window.sessionStorage.getItem(guardKey); } catch (_) { return null; }
  }

  function rememberTarget(target) {
    try {
      if (target === null) window.sessionStorage.removeItem(guardKey);
      else window.sessionStorage.setItem(guardKey, target);
    } catch (_) { /* The URL still prevents repeated reloads without storage. */ }
  }

  async function checkVersion() {
    checking = true;
    lastCheck = Date.now();
    var timeout;
    try {
      var controller = new AbortController();
      timeout = setTimeout(function () { controller.abort(); }, 8000);
      var versionUrl = new URL('/version.json', window.location.href);
      versionUrl.searchParams.set('check', String(lastCheck));
      var response = await fetch(versionUrl.href, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      var version = await response.json();
      var target = version && version.sourceCommit;
      if (typeof target !== 'string' || !/^[a-f0-9]{40}$/i.test(target)) return;
      target = target.toLowerCase();
      if (target === currentCommit) {
        rememberTarget(null);
        return;
      }
      // Ignore a response that completed after the tab went offline/backgrounded.
      if (!canCheck()) return;
      var destination = new URL(window.location.href);
      var transition = currentCommit + ':' + target;
      if (destination.searchParams.get('v') === target || rememberedTarget() === transition) return;
      destination.searchParams.set('v', target);
      rememberTarget(transition);
      reloading = true;
      window.location.replace(destination.href);
    } catch (_) {
      // An offline, blocked, malformed, or timed-out check must leave the app usable.
    } finally {
      clearTimeout(timeout);
      checking = false;
    }
  }

  function requestCheck() {
    if (!canCheck() || checking) return;
    var delay = minimumInterval - (Date.now() - lastCheck);
    if (delay > 0) {
      if (deferredCheck === null) {
        deferredCheck = setTimeout(function () {
          deferredCheck = null;
          requestCheck();
        }, delay);
      }
      return;
    }
    if (deferredCheck !== null) {
      clearTimeout(deferredCheck);
      deferredCheck = null;
    }
    // checkVersion catches its own failures, including rejected fetch/JSON promises.
    checkVersion();
  }

  window.addEventListener('pageshow', requestCheck);
  window.addEventListener('focus', requestCheck);
  window.addEventListener('online', requestCheck);
  document.addEventListener('visibilitychange', requestCheck);
  setInterval(requestCheck, 60000);
  requestCheck();
})();
