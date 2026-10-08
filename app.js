(function () {
  'use strict';
  const data = window.STATIONS;
  const input = document.getElementById('code');
  const clear = document.getElementById('clear');
  const result = document.getElementById('result');
  const list = document.getElementById('suggestions');
  let composing = false;
  let candidates = [];
  let activeIndex = -1;
  let selected = null;

  function normalize(value) {
    return String(value).normalize('NFKC').replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60)).replace(/\s+/gu, '');
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function empty(text) {
    result.replaceChildren(element('p', text ? 'state-message' : 'empty-mark', text || '—'));
  }
  function show(stations) {
    result.replaceChildren();
    for (const station of stations) {
      const block = element('div', 'station');
      const name = element('p', 'station-name' + (station.name.length > 7 ? ' long-name' : ''), station.name);
      name.append(element('small', '', '駅'));
      block.append(name, element('p', 'station-reading', station.reading));
      if (station.status === 'closed') block.append(element('p', 'station-status', '廃駅'));
      if (station.status === 'alias') block.append(element('p', 'station-status', '旧電略'));
      result.append(block);
    }
  }
  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }
  function select(station) {
    selected = station;
    input.value = station.code;
    clear.disabled = false;
    show([station]);
    closeList();
  }
  function suggestions() {
    list.replaceChildren();
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    for (let i = 0; i < candidates.length; i++) {
      const station = candidates[i];
      const option = element('li', 'suggestion');
      option.id = 'candidate-' + i;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.append(element('span', 'suggestion-code', station.code));
      const body = element('span', 'suggestion-body');
      body.append(element('span', 'suggestion-name', station.name + '駅'), element('span', 'suggestion-reading', station.reading));
      option.append(body);
      if (station.status === 'closed') option.append(element('span', 'suggestion-status', '廃駅'));
      if (station.status === 'alias') option.append(element('span', 'suggestion-status', '旧電略'));
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => select(station));
      list.append(option);
    }
    list.hidden = !candidates.length;
    input.setAttribute('aria-expanded', String(!!candidates.length));
  }
  function render() {
    selected = null;
    clear.disabled = !input.value;
    const code = normalize(input.value);
    candidates = code && /^[ァ-ヺー]+$/u.test(code) ? data.filter(station => station.code.startsWith(code)) : [];
    candidates.sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed') || a.code.localeCompare(b.code, 'ja') || a.name.localeCompare(b.name, 'ja'));
    suggestions();
    const exact = data.filter(station => station.code === code);
    if (exact.length) show(exact);
    else if (!code || candidates.length) empty();
    else empty(/^[ァ-ヺー]+$/u.test(code) ? '該当する駅がありません' : 'カナで入力してください');
  }
  function move(step) {
    if (!candidates.length) return;
    if (list.hidden) suggestions();
    activeIndex = activeIndex < 0 ? (step > 0 ? 0 : candidates.length - 1) : (activeIndex + step + candidates.length) % candidates.length;
    for (let i = 0; i < list.children.length; i++) list.children[i].setAttribute('aria-selected', String(i === activeIndex));
    const option = list.children[activeIndex];
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView?.({block: 'nearest'});
  }
  if (!Array.isArray(data)) {
    empty('データを読み込めませんでした');
    input.disabled = true;
    return;
  }
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; render(); });
  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (!selected && normalize(input.value)) suggestions(); });
  input.addEventListener('keydown', event => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!list.hidden && activeIndex >= 0) select(candidates[activeIndex]);
      closeList();
      input.blur();
    } else if (event.key === 'Escape') {
      if (!list.hidden) closeList();
      else clear.click();
    } else if (event.key === 'Tab') closeList();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    composing = false;
    render();
    input.focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('.lookup')) closeList();
  });
  render();
}());
