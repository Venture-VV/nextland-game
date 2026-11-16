/* 入口 */
(function () {
  'use strict';
  window.addEventListener('DOMContentLoaded', NL.boot);

  // 舞台不该滚动。样式里用了 overflow: clip;不认这个写法的老浏览器,万一舞台被滚动了
  // (输入框获得焦点、脚本把某个按钮滚进视野时会),这里立刻拨回去,不然之后点哪儿都是偏的
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.id === 'stage' && (t.scrollLeft || t.scrollTop)) { t.scrollLeft = 0; t.scrollTop = 0; }
  }, true);

  // 发布新版后,有些浏览器(尤其是 App 内置的)会连页面本身都用缓存里的旧的。
  // 打开后去问一下服务器当前的版本号,和页面里写的不一样就换一个地址重新加载一次。
  // 每个版本只重载一次,所以不会来回刷;双击打开(file://)时取不到 version.txt,直接跳过。
  const mine = window.NL_VER && window.NL_VER.build;
  if (!mine || !/^https?:$/.test(location.protocol) || !window.fetch) return;
  fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((t) => {
      const latest = t.trim();
      if (!/^[0-9a-f]{6,}$/.test(latest) || latest === mine) return;
      let tried = null;
      try { tried = sessionStorage.getItem('nl-reloaded-for'); sessionStorage.setItem('nl-reloaded-for', latest); } catch (e) { return; }
      if (tried !== latest) location.replace(location.pathname + '?v=' + latest + location.hash);
    })
    .catch(() => {});
})();
