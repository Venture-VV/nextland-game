/* 剧情对话：剪影立绘 + 对话框，支持标题卡、选项、跳过 */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;

  // script: [{title}, {who, as, side, text}, {choice:[...]}];who 为空是旁白
  NL.ui.story = function (script, onDone) {
    const layers = document.querySelector('#layers');
    const plate = h('img.story-plate', { draggable: 'false' });
    const tag = h('div.story-name');
    const text = h('div.story-text');
    const more = h('div.story-more', '▼');
    const box = h('div.story-box', text, more);
    const el = h('div.story',
      h('div.story-top', { style: { backgroundImage: NL.bg('mission/banner.jpg') } }),
      plate, tag, box,
      h('button.story-skip', { onclick: (e) => { e.stopPropagation(); finish(); } }, h('i'), '跳过'));
    layers.appendChild(el);
    let i = -1, typing = 0, full = '', shown = 0, waiting = null;

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
      const src = NL.img(info ? info[0] : 'story/none.jpg');
      if (plate.getAttribute('src') !== src) { // 换了说话的人:立绘重新入场(入场动画在样式里,只有表的升级动效有)
        plate.src = src;
        plate.style.animation = 'none'; void plate.offsetWidth; plate.style.animation = '';
      }
      tag.textContent = line.as || line.who || '';
      tag.className = 'story-name ' + (line.who ? line.side || info[1] : 'hidden');
      full = line.text; shown = 0; text.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        shown += 2;
        text.textContent = full.slice(0, shown);
        if (shown >= full.length) clearInterval(typing);
      }, 28);
    }
    function titleCard(t) {
      plate.src = NL.img('story/none.jpg');
      tag.className = 'story-name hidden';
      text.textContent = '';
      const card = h('div.story-title', h('b', t), h('i', 'NEXTLAND'));
      el.appendChild(card);
      waiting = () => { card.remove(); waiting = null; next(); };
      setTimeout(() => waiting && waiting(), 1300);
    }
    function choose(opts) {
      const dim = h('div.story-choice', opts.map((o) => h('button', { onclick: (e) => { e.stopPropagation(); dim.remove(); waiting = null; next(); } }, o)));
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
