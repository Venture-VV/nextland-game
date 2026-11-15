/* 剧情对话：暮光玻璃穹顶大厅背景 + 高清半写实立绘微景深切换 + 珠光磨砂字幕栏 */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;

  // script: [{title}, {who, as, side, text}, {choice:[...]}]; who 为空是旁白
  NL.ui.story = function (script, onDone) {
    const layers = document.querySelector('#layers');
    const bg = h('img.story-bg', { src: NL.img('otome/bg/story_atrium.webp'), draggable: 'false' });
    const plateWrap = h('div.story-char-wrap.hidden');
    const plate = h('img.story-plate', { draggable: 'false' });
    plateWrap.appendChild(plate);

    const tag = h('div.story-name.hidden');
    const text = h('div.story-text');
    const more = h('div.story-more', '✦');
    const box = h('div.story-box', text, more);

    const el = h('div.story',
      bg,
      h('div.story-ambient'),
      plateWrap,
      h('div.story-top-bar', h('span.stb-brand', '✦ NEXTLAND · 暮光纪事')),
      tag,
      box,
      h('button.story-skip', { onclick: (e) => { e.stopPropagation(); finish(); } }, h('i'), '跳过'));
    layers.appendChild(el);
    let i = -1, typing = 0, full = '', shown = 0, waiting = null, lastSrc = '';

    function finish() {
      clearInterval(typing);
      el.remove();
      if (onDone) onDone();
    }
    function next() {
      i++;
      if (i >= script.length) return finish();
      const line = script[i];
      if (line.title) return titleCard(line.title);
      if (line.choice) return choose(line.choice);
      const info = line.who ? D.storyPlates[line.who] : null;
      if (info) {
        const nextSrc = NL.img(info[0]);
        if (lastSrc !== nextSrc) {
          lastSrc = nextSrc;
          plate.src = nextSrc;
          plateWrap.classList.remove('enter');
          void plateWrap.offsetWidth;
          plateWrap.classList.add('enter');
        }
        plateWrap.classList.remove('hidden');
        bg.classList.add('dof');
      } else {
        plateWrap.classList.add('hidden');
        bg.classList.remove('dof');
      }
      tag.textContent = line.as || line.who || '';
      tag.className = 'story-name ' + (line.who ? line.side || (info && info[1]) || 'l' : 'hidden');
      full = line.text; shown = 0; text.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        shown += 2;
        text.textContent = full.slice(0, shown);
        if (shown >= full.length) clearInterval(typing);
      }, 28);
    }
    function titleCard(t) {
      plateWrap.classList.add('hidden');
      bg.classList.remove('dof');
      tag.className = 'story-name hidden';
      text.textContent = '';
      const card = h('div.story-title',
        h('span.st-eyebrow', '✦  C H A P T E R  ✦'),
        h('b', t),
        h('u.st-line'),
        h('i', 'NEXTLAND · TWILIGHT CHRONICLE'));
      el.appendChild(card);
      waiting = () => { card.remove(); waiting = null; next(); };
      setTimeout(() => waiting && waiting(), 1300);
    }
    function choose(opts) {
      const dim = h('div.story-choice', opts.map((o) =>
        h('button', { onclick: (e) => { e.stopPropagation(); dim.remove(); waiting = null; next(); } }, '✦  ' + o)));
      el.appendChild(dim);
      waiting = () => {}; // 必须选一个
    }
    el.addEventListener('click', () => {
      if (waiting) return waiting();
      if (shown < full.length) { clearInterval(typing); shown = full.length; text.textContent = full; return; }
      next();
    });
    next();
  };
})();
