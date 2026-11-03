// Прототип: окно настроек виджета.
// Шаг 2: шестерёнка открывает и закрывает общее окно.
// Шаг 3: крестик в окне закрывает его.
// Шаг 4: «провалы» (стрелки) открывают окна «Размер» и «Стиль», кнопка «назад» возвращает в общее.
// Шаг 5: компонент «Выбор цвета» открывает окно выбора цвета (Фон / Заголовок / Маркер);
//        цвет из палитры сразу виден на виджете; крестик возвращает прежний, зелёная галка сохраняет.
(function () {
  var widget = document.getElementById('widget-selected');
  var btn = document.getElementById('btn-settings');
  var panel = document.getElementById('settings-panel');
  if (!widget || !btn || !panel) return;

  var views = panel.querySelectorAll('.settings__view');
  var colorWin = document.getElementById('color-window');
  var cwTitle = document.getElementById('cw-title');
  var cwPicked = document.getElementById('cw-picked');
  var cwCode = document.getElementById('cw-code');

  // Применённые цвета и элементы виджета, на которые они влияют
  var COLORS = {
    bg:     { title: 'Фон',       css: '#ffffff', hex: '#FFFFFF' },
    title:  { title: 'Заголовок', css: '#000000', hex: '#000000' },
    marker: { title: 'Маркер',    css: '#0085f2', hex: '#0085F2' }
  };
  var TARGETS = {
    bg:     document.querySelector('.widget-selected__body'),
    title:  document.querySelector('.widget-selected__header h2'),
    marker: document.querySelector('.widget-selected__marker')
  };
  var PROP = { bg: 'background', title: 'color', marker: 'background' };

  // стартовый цвет маркера берём из самого виджета, чтобы окно показывало то же, что на экране
  (function () {
    var m = getComputedStyle(TARGETS.marker).backgroundColor.match(/\d+/g);
    if (!m) return;
    var hex = '#' + m.slice(0, 3).map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('').toUpperCase();
    COLORS.marker.css = hex.toLowerCase();
    COLORS.marker.hex = hex;
    var sw = panel.querySelectorAll('[data-color-target="marker"] .swatch');
    for (var i = 0; i < sw.length; i++) sw[i].style.background = hex;
  })();

  function g(rgb) { return 'linear-gradient(-69.61deg,' + rgb + ',#fff)'; }
  var PALETTES = {
    bg: [
      ['#ffffff', '#FFFFFF'], [g('rgb(235,244,255)'), '#EBF4FF'], [g('rgb(238,235,255)'), '#EEEBFF'],
      [g('rgb(255,236,235)'), '#FFECEB'], [g('rgb(255,248,235)'), '#FFF8EB'], [g('rgb(235,255,238)'), '#EBFFEE'],
      [g('rgb(255,241,235)'), '#FFF1EB'], [g('rgb(248,248,248)'), '#F8F8F8'], [g('rgb(235,253,255)'), '#EBFDFF'],
      [g('rgb(248,255,235)'), '#F8FFEB']
    ],
    title: ['#000000', '#999999', '#8991a9', '#2562aa', '#5a49ab', '#cc3d00', '#c2140a', '#e6a119', '#298e3c', '#cccccc'],
    marker: ['#0085f2', '#2562aa', '#c2140a', '#f47843', '#e6a119', '#298e3c', '#8dc742', '#5a49ab', '#cccccc', '#8991a9']
  };

  var current = null; // { target, saved } пока окно цвета открыто

  // c.off — цвет сброшен: элемент на виджете скрыт, кружок перечёркнут
  function paint(target, c) {
    var el = TARGETS[target];
    if (target === 'bg') el.style.setProperty('--wbg', c.off ? 'transparent' : c.css);
    else if (target === 'title') {
      TARGETS.bg.classList.toggle('title-off', !!c.off); // заголовок убирается из разметки
      el.style.color = c.css;
    } else {
      el.style.display = c.off ? 'none' : '';
      el.style.background = c.css;
    }
  }
  function showPicked(c) {
    // у отключённого элемента показываем цвет по умолчанию, значения серые, прозрачность 0
    var shown = c.off && current ? INITIAL[current.target] : c;
    cwPicked.style.background = shown.css;
    cwCode.textContent = shown.hex;
    document.getElementById('cw-op').textContent = c.off ? '0' : '100';
    cwPicked.parentNode.classList.toggle('is-off', !!c.off);
  }
  // Остальные свойства второго уровня, которые можно скрыть крестиком
  var PROPS = { shadow: { off: false, label: 'Тень' }, round: { off: false, label: 'Скругления' } };
  var CHIP_LABEL = { title: 'Заголовок', marker: 'Маркер', shadow: 'Тень', round: 'Скругления' };
  var hiddenOrder = []; // порядок скрытия: так идут чипсы
  function isOff(p) { return p === 'title' || p === 'marker' ? !!COLORS[p].off : PROPS[p].off; }
  function paintProp(p) {
    if (p === 'shadow') TARGETS.bg.style.boxShadow = PROPS.shadow.off ? 'none' : '';
    if (p === 'round') { if (PROPS.round.off) TARGETS.bg.style.setProperty('--wr', '0px'); else TARGETS.bg.style.removeProperty('--wr'); }
  }
  function setPropOff(p, off) {
    if (p === 'title' || p === 'marker') { COLORS[p].off = off; paint(p, COLORS[p]); syncSwatches(p); return; }
    PROPS[p].off = off; paintProp(p); renderLevel2();
  }
  // Второй уровень: скрытые свойства уходят из блока в чипсы, шрифт живёт только вместе с заголовком
  function renderLevel2() {
    var viewEl = panel.querySelector('[data-view-name="style"]');
    var titleOff = isOff('title'), markerOff = isOff('marker');
    var rows = viewEl.querySelectorAll('[data-prop]:not(.js-prop-off)');
    for (var i = 0; i < rows.length; i++) {
      var p = rows[i].getAttribute('data-prop');
      rows[i].hidden = p === 'font' ? titleOff : isOff(p);
    }
    viewEl.querySelector('[data-cloud="head"]').hidden = titleOff && markerOff;
    hiddenOrder = ['title', 'marker', 'shadow', 'round'].filter(isOff); // порядок как в облаках, сверху вниз
    var box = document.getElementById('s-chips');
    var firstStatic = box.querySelector('.s-chip:not(.s-chip--dyn)');
    var old = box.querySelectorAll('.s-chip--dyn');
    for (var k = 0; k < old.length; k++) box.removeChild(old[k]);
    hiddenOrder.forEach(function (p) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 's-chip s-chip--dyn';
      chip.setAttribute('data-chip', p);
      chip.textContent = CHIP_LABEL[p];
      box.insertBefore(chip, firstStatic);
    });
  }

  // кружки и крестики в окне настроек повторяют состояние цвета
  function syncSwatches(target) {
    var c = COLORS[target];
    var sw = panel.querySelectorAll('[data-color-target="' + target + '"] .swatch');
    for (var i = 0; i < sw.length; i++) {
      sw[i].classList.toggle('swatch--empty', !!c.off);
      sw[i].style.background = c.off ? '' : c.css;
    }
    var xs = panel.querySelectorAll('.js-color-reset[data-for="' + target + '"]');
    for (var k = 0; k < xs.length; k++) xs[k].hidden = !!c.off;
    if (target === 'bg') { fillLink.hidden = !!c.off; if (c.off) closeFill(); }
    renderLevel2();
  }
  var resetBtns = panel.querySelectorAll('.js-color-reset');
  for (var r = 0; r < resetBtns.length; r++) {
    var holder = resetBtns[r].parentNode.querySelector('[data-color-target]');
    resetBtns[r].setAttribute('data-for', holder.getAttribute('data-color-target'));
  }

  function renderPalette(target, withEmpty) {
    var box = document.getElementById('cw-swatches');
    box.innerHTML = '';
    box.classList.toggle('cw-swatches--11', !!withEmpty);
    if (withEmpty) {
      // «Отключить»: пустое состояние, элемент скрывается, окно закрывается с применением
      var e = document.createElement('button');
      e.type = 'button';
      e.className = 'cw-sw cw-sw--empty';
      e.title = 'Отключить';
      e.addEventListener('click', function () {
        COLORS[target].off = true;
        paint(target, COLORS[target]);
        closeColor(true);
      });
      box.appendChild(e);
    }
    PALETTES[target].forEach(function (p) {
      var item = typeof p === 'string' ? { css: p, hex: p.toUpperCase() } : { css: p[0], hex: p[1] };
      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'cw-sw';
      s.style.background = item.css;
      s.title = item.hex;
      s.addEventListener('click', function () {
        // цвет сразу виден в окне и на самом виджете, но пока не сохранён
        var c = { title: COLORS[target].title, css: item.css, hex: item.hex, off: false };
        COLORS[target] = c;
        showPicked(c);
        paint(target, c);
      });
      box.appendChild(s);
    });
    var extra = colorWin.querySelectorAll('.cw-link-bg');
    for (var i = 0; i < extra.length; i++) extra[i].hidden = target !== 'bg';
  }

  function openColor(target, btn) {
    if (current) closeColor(false);
    var c = COLORS[target];
    if (!c) return;
    current = { target: target, saved: { title: c.title, css: c.css, hex: c.hex, off: !!c.off } };
    cwTitle.textContent = c.title;
    showPicked(c);
    var level = btn.closest('[data-view-name]');
    renderPalette(target, target === 'bg' || (level && level.getAttribute('data-view-name') === 'main'));
    var tabs = colorWin.querySelector('.cw-tumbler');
    tabs.hidden = target !== 'bg'; // «Цвет | Картинка» только у фона
    colorWin.hidden = false;
    // верхний левый угол окна = верхний левый угол кнопки выбора цвета
    var sw = btn.getBoundingClientRect();
    var host = colorWin.offsetParent.getBoundingClientRect();
    colorWin.style.left = (sw.left - host.left - colorWin.offsetParent.clientLeft) + 'px';
    colorWin.style.top = (sw.top - host.top - colorWin.offsetParent.clientTop) + 'px';
    colorWin.style.right = 'auto';
  }

  // Закрыть окно. save=true (зелёная галка) — применить; иначе вернуть прежний цвет
  function closeColor(save) {
    if (current) {
      var t = current.target;
      if (save === true) {
        syncSwatches(t);
      } else {
        COLORS[t] = current.saved;
        paint(t, current.saved);
        syncSwatches(t);
      }
      current = null;
    }
    colorWin.hidden = true;
  }

  var fillLink = document.getElementById('fill-link');
  var fillMenu = document.getElementById('fill-menu');
  var INITIAL = {};
  Object.keys(COLORS).forEach(function (k) {
    INITIAL[k] = { title: COLORS[k].title, css: COLORS[k].css, hex: COLORS[k].hex, off: false };
  });
  var heightLink = document.getElementById('height-link');
  var heightMenu = document.getElementById('height-menu');
  var INITIAL_HEIGHT = heightLink.textContent;
  var INITIAL_NAME = nameInputInit();
  function nameInputInit() { var i = panel.querySelector('.settings__title'); return i ? i.value : ''; }

  function setHeight(v) {
    heightLink.textContent = v;
    var sv = document.getElementById('size-height-val');
    if (sv) sv.textContent = v.toLowerCase();
    var items = heightMenu.querySelectorAll('.hm-item');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-active', items[i].getAttribute('data-value') === v);
  }
  function openHeight() {
    heightMenu.hidden = false;
    // первый пункт стоит над значением редактора; текст пунктов совпадает с текстом значения
    var l = heightLink.getBoundingClientRect();
    var host = heightMenu.offsetParent.getBoundingClientRect();
    heightMenu.style.left = (l.left - host.left - heightMenu.offsetParent.clientLeft - 33) + 'px';
    heightMenu.style.top = (l.top + l.height / 2 - host.top - heightMenu.offsetParent.clientTop - 26) + 'px';
  }
  function closeHeight() { heightMenu.hidden = true; }
  heightLink.addEventListener('click', function () { if (heightMenu.hidden) openHeight(); else closeHeight(); });
  heightMenu.addEventListener('click', function (e) {
    var it = e.target.closest('.hm-item');
    if (!it) return;
    setHeight(it.getAttribute('data-value'));
    closeHeight();
  });

  document.addEventListener('click', function (e) {
    if (!heightMenu.hidden && !heightMenu.contains(e.target) && e.target !== heightLink) closeHeight();
    if (!fillMenu.hidden && !fillMenu.contains(e.target) && e.target !== fillLink) closeFill();
  });

  // Заливка фоном: на всём виджете или только под контентом
  function setFill(mode, text) {
    TARGETS.bg.classList.toggle('fill-content', mode === 'content');
    fillLink.textContent = text;
    var its = fillMenu.querySelectorAll('.hm-item');
    for (var i = 0; i < its.length; i++) its[i].classList.toggle('is-active', its[i].getAttribute('data-fill') === mode);
  }
  function closeFill() { fillMenu.hidden = true; }
  function openFill() {
    fillMenu.hidden = false;
    var l = fillLink.getBoundingClientRect();
    var host = fillMenu.offsetParent.getBoundingClientRect();
    fillMenu.style.left = (l.left - host.left - fillMenu.offsetParent.clientLeft - 33) + 'px';
    fillMenu.style.top = (l.top + l.height / 2 - host.top - fillMenu.offsetParent.clientTop - 58) + 'px';
  }
  fillLink.addEventListener('click', function () { if (fillMenu.hidden) openFill(); else closeFill(); });
  fillMenu.addEventListener('click', function (e) {
    if (e.target.closest('.fm-close')) { closeFill(); return; }
    var it = e.target.closest('.hm-item');
    if (!it) return;
    setFill(it.getAttribute('data-fill'), it.getAttribute('data-text'));
    closeFill();
  });

  // Внутренние отступы виджета (по умолчанию 12px со всех сторон)
  var PAD = { t: 12, r: 12, b: 12, l: 12 };
  var padRow = document.getElementById('pad-row');
  var padBox = document.getElementById('pad-box');
  var padShort = document.getElementById('pad-short');
  var padBtn = panel.querySelector('.js-pad-toggle');
  function applyPad() {
    ['t', 'r', 'b', 'l'].forEach(function (k) { TARGETS.bg.style.setProperty('--p' + k, PAD[k] + 'px'); });
  }
  function fillPadInputs() {
    var map = { h: PAD.l, v: PAD.t, t: PAD.t, r: PAD.r, b: PAD.b, l: PAD.l };
    panel.querySelectorAll('[data-pad]').forEach(function (i) { i.value = map[i.getAttribute('data-pad')]; });
  }
  function setPadExpanded(on) {
    if (!on) { PAD.r = PAD.l; PAD.b = PAD.t; applyPad(); } // свёрнутый вид хранит пару: горизонтальные и вертикальные
    fillPadInputs();
    padBox.hidden = !on;
    padShort.hidden = on;
    padRow.classList.toggle('s-prow--exp', on);
    padBtn.setAttribute('aria-pressed', String(on));
  }
  padBtn.addEventListener('click', function () { setPadExpanded(padBtn.getAttribute('aria-pressed') !== 'true'); });
  // внешние отступы: только раскрытие, значения пока не вводятся
  var outRow = document.getElementById('pad-row-out');
  var outBtn = panel.querySelector('.js-pad-toggle-out');
  function setOutExpanded(on) {
    document.getElementById('pad-box-out').hidden = !on;
    document.getElementById('pad-short-out').hidden = on;
    outRow.classList.toggle('s-prow--exp', on);
    outBtn.setAttribute('aria-pressed', String(on));
  }
  outBtn.addEventListener('click', function () { setOutExpanded(outBtn.getAttribute('aria-pressed') !== 'true'); });

  // при вводе оставляем только цифры, на виджете значение применяется когда поле потеряло фокус
  panel.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-pad')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
  });
  panel.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-pad');
    if (!k) return;
    var v = parseInt(e.target.value, 10) || 0;
    if (k === 'h') { PAD.l = v; PAD.r = v; }
    else if (k === 'v') { PAD.t = v; PAD.b = v; }
    else PAD[k] = v;
    applyPad();
  });

  // Кнопка сброса активна только если что-то изменено
  function isDirty() {
    var d = false;
    Object.keys(COLORS).forEach(function (k) { if (COLORS[k].css !== INITIAL[k].css || COLORS[k].off) d = true; });
    Object.keys(PROPS).forEach(function (k) { if (PROPS[k].off) d = true; });
    if (heightLink.textContent !== INITIAL_HEIGHT) d = true;
    if (TARGETS.bg.classList.contains('fill-content')) d = true;
    var ni = panel.querySelector('.settings__title');
    if (ni && ni.value !== INITIAL_NAME) d = true;
    if (PAD.t !== 12 || PAD.r !== 12 || PAD.b !== 12 || PAD.l !== 12) d = true;
    return d;
  }
  function setResetState(btnEl, dirty) {
    btnEl.classList.toggle('is-muted', !dirty);
    btnEl.disabled = !dirty;
  }
  function refreshReset() {
    setResetState(panel.querySelector('[data-view-name="main"] .s-reset-btn'), isDirty());
    var styleD = false;
    Object.keys(COLORS).forEach(function (k) { if (COLORS[k].css !== INITIAL[k].css || COLORS[k].off) styleD = true; });
    Object.keys(PROPS).forEach(function (k) { if (PROPS[k].off) styleD = true; });
    if (TARGETS.bg.classList.contains('fill-content')) styleD = true;
    setResetState(panel.querySelector('[data-view-name="style"] .s-reset-btn'), styleD);
    setResetState(panel.querySelector('[data-view-name="size"] .s-reset-btn'), PAD.t !== 12 || PAD.r !== 12 || PAD.b !== 12 || PAD.l !== 12);
    var cr = colorWin.querySelector('.js-color-reset-draft');
    var cd = false;
    if (current) { var cc = COLORS[current.target]; cd = cc.css !== current.saved.css || !!cc.off !== !!current.saved.off; }
    setResetState(cr, cd);
  }
  panel.addEventListener('click', function () { setTimeout(refreshReset, 0); });
  panel.addEventListener('change', function () { setTimeout(refreshReset, 0); });
  colorWin.addEventListener('click', function () { setTimeout(refreshReset, 0); });
  heightMenu.addEventListener('click', function () { setTimeout(refreshReset, 0); });
  fillMenu.addEventListener('click', function () { setTimeout(refreshReset, 0); });
  refreshReset();

  // Окно выбора стиля виджета: набор готовых сочетаний заголовка, маркера и фона
  var styleLink = document.getElementById('style-link');
  var styleMenu = document.getElementById('style-menu');
  function closeStyle() { styleMenu.hidden = true; }
  function openStyle() {
    styleMenu.hidden = false;
    var panelR = panel.getBoundingClientRect();
    var l = styleLink.getBoundingClientRect();
    var host = styleMenu.offsetParent.getBoundingClientRect();
    styleMenu.style.left = (panelR.left - host.left - styleMenu.offsetParent.clientLeft + 8) + 'px';
    styleMenu.style.top = (l.top - host.top - styleMenu.offsetParent.clientTop - 8) + 'px';
  }
  function applyStyle(kind) {
    function on(t) { COLORS[t].off = false; paint(t, COLORS[t]); syncSwatches(t); }
    function off(t) { COLORS[t].off = true; paint(t, COLORS[t]); syncSwatches(t); }
    if (kind === 'inside') { on('title'); on('marker'); on('bg'); }          // вернуть заголовок, маркер и фон, если скрыты
    else if (kind === 'notitle') { off('title'); off('marker'); }             // без заголовка и маркера
    else if (kind === 'outside') { setFill('content', 'только на контенте'); off('marker'); }
    else if (kind === 'plain') { off('title'); off('marker'); off('bg'); }    // отключить всё
  }
  styleLink.addEventListener('click', function () { if (styleMenu.hidden) openStyle(); else closeStyle(); });
  styleMenu.addEventListener('click', function (e) {
    if (e.target.closest('.sm-close')) { closeStyle(); return; }
    var card = e.target.closest('.sm-card');
    if (!card) return;
    applyStyle(card.getAttribute('data-style'));
    styleLink.textContent = card.getAttribute('data-name');
    closeStyle();
    setTimeout(refreshReset, 0);
  });
  document.addEventListener('click', function (e) {
    if (!styleMenu.hidden && !styleMenu.contains(e.target) && e.target !== styleLink) closeStyle();
  });

  // Сброс на первом уровне: всё возвращается к стартовым значениям
  function resetAll() {
    if (current) closeColor(false);
    closeHeight();
    closeFill();
    closeStyle();
    styleLink.textContent = 'Заголовок внутри виджета';
    setFill('all', 'на всем виджете');
    Object.keys(COLORS).forEach(function (k) {
      COLORS[k] = { title: INITIAL[k].title, css: INITIAL[k].css, hex: INITIAL[k].hex, off: false };
      paint(k, COLORS[k]);
      syncSwatches(k);
    });
    Object.keys(PROPS).forEach(function (p) { PROPS[p].off = false; paintProp(p); });
    hiddenOrder = [];
    renderLevel2();
    PAD = { t: 12, r: 12, b: 12, l: 12 };
    applyPad();
    setPadExpanded(false);
    setOutExpanded(false);
    setHeight(INITIAL_HEIGHT);
    var ni = panel.querySelector('.settings__title');
    if (ni) ni.value = INITIAL_NAME;
    TARGETS.title.textContent = INITIAL_NAME;
  }

  // Сброс в окнах второго уровня: только свойства своего окна
  function resetStyle() {
    if (current) closeColor(false);
    closeFill();
    setFill('all', 'на всем виджете');
    Object.keys(COLORS).forEach(function (k) {
      COLORS[k] = { title: INITIAL[k].title, css: INITIAL[k].css, hex: INITIAL[k].hex, off: false };
      paint(k, COLORS[k]);
      syncSwatches(k);
    });
    Object.keys(PROPS).forEach(function (p) { PROPS[p].off = false; paintProp(p); });
    hiddenOrder = [];
    renderLevel2();
  }
  function resetSize() {
    PAD = { t: 12, r: 12, b: 12, l: 12 };
    applyPad();
    setPadExpanded(false);
    setOutExpanded(false);
  }

  // Название виджета: текст из поля сразу попадает в заголовок виджета
  var nameInput = panel.querySelector('.settings__title');
  if (nameInput) nameInput.addEventListener('input', function () {
    TARGETS.title.textContent = nameInput.value;
  });

  function setView(name) {
    for (var i = 0; i < views.length; i++) {
      views[i].hidden = views[i].getAttribute('data-view-name') !== name;
    }
    panel.setAttribute('data-view', name);
    closeHeight();
    closeFill();
    closeStyle();
  }

  function setOpen(open) {
    panel.hidden = !open;
    if (!open) { closeColor(false); closeHeight(); closeFill(); closeStyle(); }
    widget.classList.toggle('settings-open', open);
    btn.classList.toggle('is-active', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) setView('main'); // окно всегда открывается на общем виде
  }

  // Шестерёнка: повторный клик закрывает окно
  btn.addEventListener('click', function () { setOpen(panel.hidden); });

  // Делегирование кликов внутри окна
  panel.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !panel.contains(t)) return;
    if (t.classList.contains('js-settings-close') || t.classList.contains('js-settings-save')) { setOpen(false); btn.focus(); }
    else if (t.classList.contains('js-settings-back')) setView('main');
    else if (t.classList.contains('js-open-size')) setView('size');
    else if (t.classList.contains('js-open-style')) setView('style');
    else if (t.classList.contains('s-reset-btn') && t.closest('[data-view-name="main"]')) resetAll();
    else if (t.classList.contains('s-reset-btn') && t.closest('[data-view-name="style"]')) resetStyle();
    else if (t.classList.contains('s-reset-btn') && t.closest('[data-view-name="size"]')) resetSize();
    else if (t.classList.contains('js-prop-off')) setPropOff(t.getAttribute('data-prop'), true);
    else if (t.hasAttribute('data-chip')) setPropOff(t.getAttribute('data-chip'), false);
    else if (t.classList.contains('js-color-reset')) {
      var tg = t.getAttribute('data-for');
      COLORS[tg].off = true;
      paint(tg, COLORS[tg]);
      syncSwatches(tg);
    }
    else if (t.hasAttribute('data-color-target')) openColor(t.getAttribute('data-color-target'), t);
  });

  // Окно выбора цвета: галочка и крестик возвращают в окно настроек
  colorWin.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.classList.contains('js-color-reset-draft') && current) {
      // сброс изменений: вернуть цвет, который был при открытии окна
      COLORS[current.target] = { title: current.saved.title, css: current.saved.css, hex: current.saved.hex, off: current.saved.off };
      showPicked(COLORS[current.target]);
      paint(current.target, COLORS[current.target]);
    } else if (t.classList.contains('js-color-done')) closeColor(true);
    else if (t.classList.contains('js-color-close')) closeColor(false);
  });
})();
