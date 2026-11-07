// Composes a slide in the look of our NotebookLM decks. The model paints wordless scenes and says where each part is;
// everything with words (title, labels, leader lines, focus strip, tables) is placed here by fixed geometry, so text
// can never overlap, spill or get cut, and every slide of a deck shares one layout system.

const W = 1280;
const H = 720;
const INK = '#0f1e3c';
const SOFT_INK = '#33415c';
const TEAL = '#12907e';
const GLOW = '#2b5cff';
const FONT = 'Arial, Tahoma, sans-serif';
const SCENE = { 1: [800, 600], 2: [600, 400], 3: [600, 400], 4: [600, 400] };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isArabic = (s) => /[؀-ۿ]/.test(String(s));
// Width of one line in pixels. Arabic joined letters run narrower than Latin capitals; both err on the wide side.
const widthOf = (s, size, bold) => [...String(s)].length * size * (isArabic(s) ? 0.5 : 0.56) * (bold ? 1.06 : 1);

export function wrap(text, size, maxWidth, bold, maxLines = 4) {
  // "(English term)" stays whole so it never reads reversed. One too long for the line is split, each piece isolated
  // left-to-right so its brackets stay put inside Arabic text.
  const words = (String(text ?? '').trim().match(/\([^()]*\)[^\s]*|\S+/g) || []).flatMap((token) =>
    token.includes(' ') && widthOf(token, size, bold) > maxWidth ? token.split(' ').reduce((pieces, word) => {
      const last = pieces[pieces.length - 1];
      if (last !== undefined && widthOf(`${last} ${word}`, size, bold) <= maxWidth) pieces[pieces.length - 1] = `${last} ${word}`;
      else pieces.push(word);
      return pieces;
    }, []).map((piece) => `\u2066${piece}\u2069`) : [token],
  );
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(next, size, bold) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] += ' …';
    return kept;
  }
  return lines;
}

// One text block. align is the visual side: right-aligned Arabic uses direction=rtl with anchor start.
function textBlock(lines, { x, y, size, bold, fill = INK, align = 'middle', rtl, gap = 1.28 }) {
  const dir = rtl ? ' direction="rtl"' : '';
  const anchor = rtl ? { right: 'start', left: 'end', middle: 'middle' }[align] : { left: 'start', right: 'end', middle: 'middle' }[align];
  return lines
    .map((line, i) => `<text x="${x}" y="${Math.round(y + i * size * gap)}" font-family="${FONT}" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${fill}" text-anchor="${anchor}"${dir}>${esc(line)}</text>`)
    .join('');
}

// ---------- Reading the model's reply ----------
// The reply is line based because SVG inside JSON breaks too often:
// PANEL|name|highlight  LABEL|x|y|title|text  SCENE ... END  FOCUS|text  ARROWS
export function parseScenes(raw) {
  const text = String(raw || '').replace(/```[a-z]*\n?/gi, '');
  const panels = [];
  let focus = '';
  let arrows = false;
  let current = null;
  let scene = null;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (scene !== null) {
      if (t === 'END') {
        current.scene = scene.join('\n');
        scene = null;
      } else scene.push(line);
      continue;
    }
    if (t.startsWith('PANEL|')) {
      const [, name = '', hi = ''] = t.split('|');
      current = { name: name.trim(), highlight: /^(1|true|yes)$/i.test(hi.trim()), labels: [], scene: '' };
      panels.push(current);
    } else if (t.startsWith('LABEL|') && current) {
      const [, x, y, title = '', ...rest] = t.split('|');
      const lx = Number(x);
      const ly = Number(y);
      if (Number.isFinite(lx) && Number.isFinite(ly) && title.trim()) current.labels.push({ x: lx, y: ly, title: title.trim(), text: rest.join(' ').trim() });
    } else if (t === 'SCENE' && current) scene = [];
    else if (t.startsWith('FOCUS|')) focus = t.slice(6).trim();
    else if (t === 'ARROWS') arrows = true;
  }
  if (scene !== null && current) current.scene = scene.join('\n'); // the reply was cut off: keep what was drawn
  const usable = panels.filter((p) => p.scene && /<[a-z]/i.test(p.scene)).slice(0, 4);
  return usable.length ? { panels: usable, focus, arrows } : null;
}

const VOID_ID = /\bid\s*=\s*"([^"]+)"/g;
// Closes what a cut-off reply left open, drops broken trailing tags, and removes anything that is not plain drawing.
export function cleanScene(raw, prefix) {
  let s = String(raw)
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
    .replace(/<\/?svg\b[^>]*>/gi, '')
    .replace(/<(script|style|foreignObject|iframe|object|embed|image|audio|video|animate\w*|set|text|tspan|feImage|a|title|desc|metadata)\b[^>]*\/>/gi, '')
    .replace(/<(script|style|foreignObject|iframe|object|embed|image|audio|video|animate\w*|set|text|feImage|a|title|desc|metadata)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
    .replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, 'none');
  const lastClose = s.lastIndexOf('>');
  s = lastClose >= 0 ? s.slice(0, lastClose + 1) : '';
  const stack = [];
  const kept = [];
  let cursor = 0;
  for (const match of s.matchAll(/<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    kept.push(s.slice(cursor, match.index).replace(/[<>]/g, ''));
    cursor = match.index + match[0].length;
    const name = match[1];
    if (match[0].startsWith('</')) {
      if (stack[stack.length - 1] !== name) continue; // a stray closing tag
      stack.pop();
      kept.push(match[0]);
    } else {
      kept.push(match[0]);
      if (!match[0].endsWith('/>')) stack.push(name);
    }
  }
  let out = kept.join('');
  while (stack.length) out += `</${stack.pop()}>`;
  // Two panels in one slide must not share gradient names.
  const ids = new Set([...out.matchAll(VOID_ID)].map((m) => m[1]));
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`\\bid\\s*=\\s*"${safe}"`, 'g'), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(\\s*#${safe}\\s*\\)`, 'g'), `url(#${prefix}${id})`)
      .replace(new RegExp(`href\\s*=\\s*"#${safe}"`, 'g'), `href="#${prefix}${id}"`);
  }
  return out;
}

// Where the drawing really is. Models often paint in a corner of the canvas they were given, or past its edge, so the
// frame shows what was drawn rather than the canvas that was asked for. Moves are followed; rotations and scales are not,
// which at worst leaves a little more margin.
export function drawnBox(scene) {
  const body = String(scene).replace(/<(defs|clipPath|linearGradient|radialGradient|pattern|mask|symbol)\b[\s\S]*?<\/\1\s*>/gi, '');
  const stack = [];
  let dx = 0;
  let dy = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x + dx);
    maxX = Math.max(maxX, x + dx);
    minY = Math.min(minY, y + dy);
    maxY = Math.max(maxY, y + dy);
  };
  for (const tag of body.matchAll(/<(\/?)([a-zA-Z]+)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g)) {
    const [, closing, name, attrs, selfClosed] = tag;
    if (closing) {
      const back = stack.pop();
      if (back) [dx, dy] = back;
      continue;
    }
    const attr = (key) => Number((attrs.match(new RegExp(`(?:^|\\s)${key}\\s*=\\s*"(-?[\\d.]+)`)) || [])[1]);
    const move = attrs.match(/transform\s*=\s*"[^"]*translate\(\s*(-?[\d.]+)[\s,]*(-?[\d.]+)?/);
    const before = [dx, dy];
    if (move) {
      dx += Number(move[1]);
      dy += Number(move[2] || 0);
    }
    const shape = name.toLowerCase();
    if (shape === 'rect') {
      add(attr('x') || 0, attr('y') || 0);
      add((attr('x') || 0) + attr('width'), (attr('y') || 0) + attr('height'));
    } else if (shape === 'circle' || shape === 'ellipse') {
      const rx = shape === 'circle' ? attr('r') : attr('rx');
      const ry = shape === 'circle' ? attr('r') : attr('ry');
      add((attr('cx') || 0) - rx, (attr('cy') || 0) - ry);
      add((attr('cx') || 0) + rx, (attr('cy') || 0) + ry);
    } else if (shape === 'line') {
      add(attr('x1'), attr('y1'));
      add(attr('x2'), attr('y2'));
    } else if (shape === 'polygon' || shape === 'polyline') {
      const nums = ((attrs.match(/points\s*=\s*"([^"]*)"/) || [])[1] || '').match(/-?[\d.]+/g) || [];
      for (let i = 0; i + 1 < nums.length; i += 2) add(Number(nums[i]), Number(nums[i + 1]));
    } else if (shape === 'path') {
      const d = (attrs.match(/\sd\s*=\s*"([^"]*)"/) || [])[1] || '';
      let x = 0;
      let y = 0;
      for (const [, cmd, list] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
        const nums = (list.match(/-?\d*\.?\d+/g) || []).map(Number);
        const rel = cmd === cmd.toLowerCase();
        const kind = cmd.toUpperCase();
        if (kind === 'H') { x = rel ? x + (nums.at(-1) || 0) : nums.at(-1) ?? x; add(x, y); continue; }
        if (kind === 'V') { y = rel ? y + (nums.at(-1) || 0) : nums.at(-1) ?? y; add(x, y); continue; }
        if (kind === 'Z' || nums.length < 2) continue;
        const step = { M: 2, L: 2, T: 2, S: 4, Q: 4, C: 6, A: 7 }[kind] || 2;
        for (let i = 0; i + step <= nums.length; i += step) {
          const ex = nums[i + step - 2];
          const ey = nums[i + step - 1];
          x = rel ? x + ex : ex;
          y = rel ? y + ey : ey;
          add(x, y);
        }
      }
    }
    if (selfClosed) [dx, dy] = before;
    else stack.push(before);
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
}

// The part of the scene shown in a frame of this shape: all that was drawn, widened evenly to fit, with nothing cut.
function viewFor(panel, frameW, frameH, [sw, sh]) {
  const box = drawnBox(panel.scene);
  const usable = box && box.w > sw * 0.15 && box.h > sh * 0.15;
  let { x, y, w, h } = usable ? box : { x: 0, y: 0, w: sw, h: sh };
  const ratio = frameW / frameH;
  if (w / h > ratio) {
    const grown = w / ratio;
    y -= (grown - h) / 2;
    h = grown;
  } else {
    const grown = h * ratio;
    x -= (grown - w) / 2;
    w = grown;
  }
  return { x, y, w, h };
}

// ---------- Fixed pieces ----------
const defs = () => `<defs>
<pattern id="grid-s" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#dbe5f0" stroke-width="1"/></pattern>
<linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfdff"/><stop offset="1" stop-color="#eef4fa"/></linearGradient>
<filter id="shadow" x="-6%" y="-6%" width="112%" height="116%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#1b2c52" flood-opacity=".2"/></filter>
<filter id="glow" x="-12%" y="-12%" width="124%" height="124%"><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="${GLOW}" flood-opacity=".75"/></filter>
<filter id="paint" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="7" result="wobble"/>
<feDisplacementMap in="SourceGraphic" in2="wobble" scale="3.5" xChannelSelector="R" yChannelSelector="G"/>
</filter>
</defs>`;
const background = () => `<rect width="${W}" height="${H}" fill="url(#page)"/><rect width="${W}" height="${H}" fill="url(#grid-s)"/>`;

function titleBlock(title) {
  const big = widthOf(title, 44, true) <= 1160;
  const size = big ? 44 : 38;
  const lines = wrap(title, size, 1160, true, 2);
  return { svg: textBlock(lines, { x: W / 2, y: 62, size, bold: true, align: 'middle', rtl: isArabic(title), gap: 1.2 }), bottom: 62 + (lines.length - 1) * size * 1.2 + 24 };
}

function focusStrip(text, rtl) {
  if (!text) return { svg: '', top: H - 30 };
  const lines = wrap(text, 22, 1060, true, 2);
  const h = 22 * 1.3 * lines.length + 24;
  const top = H - 26 - h;
  const size = 22;
  return {
    svg: `<rect x="90" y="${top}" width="1100" height="${h}" rx="4" fill="#ffffff" stroke="${INK}" stroke-width="2"/><circle cx="90" cy="${top + h / 2}" r="7" fill="${TEAL}"/><circle cx="1190" cy="${top + h / 2}" r="7" fill="${TEAL}"/>${textBlock(lines, { x: W / 2, y: top + 20 + size * 0.5, size, bold: true, align: 'middle', rtl })}`,
    top,
  };
}

function formulaBox(formula, y) {
  if (!formula) return { svg: '', height: 0 };
  const lines = wrap(formula, 28, 1040, true, 2);
  const h = 28 * 1.3 * lines.length + 22;
  return {
    svg: `<rect x="120" y="${y}" width="1040" height="${h}" rx="6" fill="#fff9e6" stroke="#c99a1c" stroke-width="2"/>${lines.map((l, i) => `<text x="${W / 2}" y="${y + 36 + i * 36}" font-family="Cambria Math, Times New Roman, serif" font-size="28" font-weight="700" fill="${INK}" text-anchor="middle" direction="ltr">${esc(l)}</text>`).join('')}`,
    height: h + 12,
  };
}

function frame(x, y, w, h, panel, index, sceneSize, nameHeight, rtl) {
  const [sw, sh] = sceneSize;
  const border = panel.highlight
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h + nameHeight}" fill="#ffffff" stroke="${GLOW}" stroke-width="5" filter="url(#glow)"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h + nameHeight}" fill="#ffffff" stroke="${INK}" stroke-width="1.6" filter="url(#shadow)"/>`;
  const inset = 8;
  const name = nameHeight ? textBlock(wrap(panel.name, 22, w - 16, true, 1), { x: x + w / 2, y: y + h + nameHeight - 11, size: 22, bold: true, align: 'middle', rtl: rtl || isArabic(panel.name) }) : '';
  const view = viewFor(panel, w - inset * 2, h - inset, sceneSize);
  const box = `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`;
  return `${border}<svg x="${x + inset}" y="${y + inset}" width="${w - inset * 2}" height="${h - inset}" viewBox="${box}" preserveAspectRatio="xMidYMid meet"><g filter="url(#paint)"><rect x="${view.x}" y="${view.y}" width="${view.w}" height="${view.h}" fill="#f4f8fb"/>${cleanScene(panel.scene, `p${index}-`)}</g></svg>${name}`;
}

// Where a point of a scene lands on the page.
const toPage = (point, panel, x, y, w, h, size) => {
  const inset = 8;
  const iw = w - inset * 2;
  const ih = h - inset;
  const view = viewFor(panel, iw, ih, size);
  const scale = iw / view.w;
  const inside = (v, low, span) => Math.min(Math.max(v, low + span * 0.03), low + span * 0.97);
  return {
    x: x + inset + (inside(point.x, view.x, view.w) - view.x) * scale,
    y: y + inset + (inside(point.y, view.y, view.h) - view.y) * scale,
  };
};

// Labels in one side column, each as near its target's height as room allows, kept in target order so lines do not cross.
function column(labels, side, colX, colW, top, bottom, rtl, { titleSize, textSize, maxTextLines }) {
  const items = labels
    .slice()
    .sort((a, b) => a.py - b.py)
    .map((l) => {
      const title = wrap(l.title, titleSize, colW, true, 2);
      const body = l.text && textSize ? wrap(l.text, textSize, colW, false, maxTextLines) : [];
      return { ...l, titleLines: title, body, height: title.length * titleSize * 1.26 + body.length * textSize * 1.3 + 16 };
    });
  const total = items.reduce((sum, i) => sum + i.height, 0);
  const room = bottom - top;
  // Too much text for the room: shorten the descriptions until it fits.
  const heightOf = (i) => i.titleLines.length * titleSize * 1.26 + i.body.length * textSize * 1.3 + 16;
  const sum = () => items.reduce((all, i) => all + i.height, 0);
  if (total > room) for (const i of items) if (i.body.length > 2) { i.body = [...i.body.slice(0, 2)]; i.body[1] += ' …'; i.height = heightOf(i); }
  if (sum() > room) for (const i of items) if (i.body.length > 1) { i.body = [`${i.body[0]} …`]; i.height = heightOf(i); }
  if (sum() > room) for (const i of items) { i.body = []; i.height = heightOf(i); }
  while (sum() > room && items.length > 1) items.pop();
  let y = top;
  for (const i of items) {
    i.top = Math.max(y, i.py - i.height / 2);
    y = i.top + i.height;
  }
  let over = y - bottom;
  for (let k = items.length - 1; k >= 0 && over > 0; k -= 1) {
    const next = k === items.length - 1 ? bottom : items[k + 1].top;
    items[k].top = Math.min(items[k].top, next - items[k].height);
  }
  if (items.length && items[0].top < top) items[0].top = top;
  let out = '';
  for (const i of items) {
    const align = rtl ? 'right' : side === 'left' ? 'right' : 'left';
    const textX = align === 'right' ? colX + colW : colX;
    const firstY = i.top + titleSize;
    const titleSvg = textBlock(i.titleLines, { x: textX, y: firstY, size: titleSize, bold: true, fill: INK, align, rtl, gap: 1.26 });
    const bodySvg = i.body.length ? textBlock(i.body, { x: textX, y: firstY + i.titleLines.length * titleSize * 1.26 - 2, size: textSize, fill: SOFT_INK, align, rtl, gap: 1.3 }) : '';
    const widest = Math.max(...i.titleLines.map((l) => widthOf(l, titleSize, true)), ...i.body.map((l) => widthOf(l, textSize)));
    // The line leaves from the edge of the words that faces the frame.
    const lineY = i.top + titleSize * 0.65;
    const lineX = side === 'left' ? colX + colW + 12 : rtl ? Math.max(colX - 12, colX + colW - widest - 12) : colX - 12;
    const end = `<circle cx="${i.px.toFixed(1)}" cy="${i.py.toFixed(1)}" r="5.5" fill="${TEAL}" stroke="#ffffff" stroke-width="1.5"/>`;
    out += `<path d="M${lineX} ${lineY}L${i.px.toFixed(1)} ${i.py.toFixed(1)}" stroke="#ffffff" stroke-width="5" opacity=".75" fill="none"/><path d="M${lineX} ${lineY}L${i.px.toFixed(1)} ${i.py.toFixed(1)}" stroke="${TEAL}" stroke-width="2.4" fill="none"/><circle cx="${lineX}" cy="${lineY}" r="5" fill="${TEAL}"/>${end}${titleSvg}${bodySvg}`;
  }
  return out;
}

function splitSides(labels, midX) {
  const left = [];
  const right = [];
  for (const l of labels.slice().sort((a, b) => Math.abs(b.px - midX) - Math.abs(a.px - midX))) (l.px < midX ? left : right).push(l);
  while (left.length > right.length + 1) right.push(left.pop());
  while (right.length > left.length + 1) left.push(right.pop());
  return [left, right];
}

function layoutOne(panel, top, bottom, rtl) {
  const size = SCENE[1];
  const h = Math.min(bottom - top, 500);
  const w = Math.round((h - 8) * (size[0] / size[1])) + 16;
  const x = Math.round((W - w) / 2);
  const y = Math.round(top + (bottom - top - h) / 2);
  const placed = panel.labels.slice(0, 8).map((l) => ({ ...l, px: 0, py: 0, ...(() => { const p = toPage(l, panel, x, y, w, h, size); return { px: p.x, py: p.y }; })() }));
  const [left, right] = splitSides(placed, W / 2);
  const colW = x - 56;
  const style = { titleSize: 22, textSize: 18, maxTextLines: 4 };
  return frame(x, y, w, h, panel, 0, size, 0, rtl) + column(left, 'left', 26, colW - 10, top, bottom, rtl, style) + column(right, 'right', x + w + 30, colW - 10, top, bottom, rtl, style);
}

function layoutTwo(panels, top, bottom, rtl) {
  const size = SCENE[2];
  const nameH = 38;
  const avail = bottom - top;
  const w = 370;
  const h = Math.min(Math.round((w - 16) * (size[1] / size[0])) + 8, avail - nameH);
  const y = Math.round(top + (avail - h - nameH) / 2);
  const order = rtl ? panels.slice().reverse() : panels;
  const xs = [266, 644];
  const style = { titleSize: 20, textSize: 18, maxTextLines: 3 };
  let out = '';
  order.forEach((panel, i) => {
    const x = xs[i];
    out += frame(x, y, w, h, panel, panels.indexOf(panel), size, nameH, rtl);
  });
  order.forEach((panel, i) => {
    const x = xs[i];
    const placed = panel.labels.slice(0, 3).map((l) => { const p = toPage(l, panel, x, y, w, h, size); return { ...l, px: p.x, py: p.y }; });
    out += i === 0 ? column(placed, 'left', 18, 226, top, bottom, rtl, style) : column(placed, 'right', 1036, 226, top, bottom, rtl, style);
  });
  return out;
}

// Three panels have no outer sides to spare, so parts get numbered dots and the list sits under each panel.
function layoutThree(panels, top, bottom, rtl, arrows) {
  const size = SCENE[3];
  const gap = arrows ? 44 : 24;
  const w = Math.round((W - 64 - gap * 2) / 3);
  const h = Math.min(Math.round((w - 16) * (size[1] / size[0])) + 8, Math.round((bottom - top) * 0.56));
  const nameH = 38;
  const order = rtl ? panels.slice().reverse() : panels;
  let out = '';
  order.forEach((panel, i) => {
    const x = 32 + i * (w + gap);
    out += frame(x, top, w, h, panel, panels.indexOf(panel), size, nameH, rtl);
    const labels = panel.labels.slice(0, 3);
    labels.forEach((l, n) => {
      const p = toPage(l, panel, x, top, w, h, size);
      out += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="${TEAL}" stroke="#fff" stroke-width="2"/><text x="${p.x.toFixed(1)}" y="${(p.y + 5).toFixed(1)}" font-family="${FONT}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${n + 1}</text>`;
    });
    let y = top + h + nameH + 18;
    const room = bottom - y;
    const perLabel = room / Math.max(labels.length, 1);
    const textLines = perLabel >= 86 ? 3 : perLabel >= 62 ? 2 : perLabel >= 44 ? 1 : 0;
    labels.forEach((l, n) => {
      const markX = rtl ? x + w - 12 : x + 12;
      const textX = rtl ? x + w - 32 : x + 32;
      const tl = wrap(l.title, 19, w - 40, true, 1);
      const bl = l.text && textLines ? wrap(l.text, 17, w - 40, false, textLines) : [];
      out += `<circle cx="${markX}" cy="${y + 12}" r="11" fill="${TEAL}"/><text x="${markX}" y="${y + 17}" font-family="${FONT}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${n + 1}</text>`;
      out += textBlock(tl, { x: textX, y: y + 18, size: 19, bold: true, align: rtl ? 'right' : 'left', rtl });
      out += textBlock(bl, { x: textX, y: y + 42, size: 17, fill: SOFT_INK, align: rtl ? 'right' : 'left', rtl, gap: 1.26 });
      y += 26 + bl.length * 22 + 6;
    });
    if (arrows && i < order.length - 1) {
      const ax = x + w + gap / 2;
      const ay = top + h / 2;
      const d = rtl ? -1 : 1;
      out += `<path d="M${ax - 12 * d} ${ay - 15}L${ax + 12 * d} ${ay}L${ax - 12 * d} ${ay + 15}Z" fill="${TEAL}"/>`;
    }
  });
  return out;
}

function layoutFour(panels, top, bottom, rtl) {
  const size = SCENE[4];
  const nameH = 34;
  const rowGap = 12;
  const rowH = Math.round((bottom - top - rowGap) / 2);
  const h = rowH - nameH;
  const w = Math.round((h - 8) * (size[0] / size[1])) + 16;
  const xs = [W / 2 - w - 6, W / 2 + 6];
  const colW = xs[0] - 50;
  const style = { titleSize: 19, textSize: 0, maxTextLines: 0 };
  const order = rtl ? [panels[1], panels[0], panels[3], panels[2]] : panels;
  let out = '';
  order.forEach((panel, i) => {
    out += frame(xs[i % 2], top + Math.floor(i / 2) * (rowH + rowGap), w, h, panel, panels.indexOf(panel), size, nameH, rtl);
  });
  const sides = [[], []];
  order.forEach((panel, i) => {
    const x = xs[i % 2];
    const y = top + Math.floor(i / 2) * (rowH + rowGap);
    for (const l of panel.labels.slice(0, 3)) {
      const p = toPage(l, panel, x, y, w, h, size);
      sides[i % 2].push({ ...l, px: p.x, py: p.y });
    }
  });
  return out + column(sides[0], 'left', 18, colW - 12, top, bottom, rtl, style) + column(sides[1], 'right', xs[1] + w + 24, colW - 12, top, bottom, rtl, style);
}

const wrapSvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}${background()}${body}</svg>`;

export function composeSlide(slide, deckLanguage, plan) {
  const title = slide.title || '';
  const rtl = deckLanguage === 'ar' || isArabic(title);
  const head = titleBlock(title);
  const strip = focusStrip(slide.note || plan.focus || '', rtl); // the lecture's own words come first
  const top = Math.round(head.bottom);
  const formula = formulaBox(slide.formula, Math.round(strip.top - 12) - (slide.formula ? 28 * 1.3 * wrap(slide.formula, 28, 1040, true, 2).length + 22 : 0));
  const bottom = Math.round(strip.top - 14 - formula.height);
  const panels = plan.panels;
  let body;
  if (panels.length === 1) body = layoutOne(panels[0], top, bottom, rtl);
  else if (panels.length === 2) body = layoutTwo(panels, top, bottom, rtl);
  else if (panels.length === 3) body = layoutThree(panels, top, bottom, rtl, plan.arrows);
  else body = layoutFour(panels, top, bottom, rtl);
  return wrapSvg(`${head.svg}${body}${formula.svg}${strip.svg}`);
}

// A table is exact content, so no model touches it.
export function composeTable(slide, deckLanguage) {
  const title = slide.title || '';
  const rtl = deckLanguage === 'ar' || isArabic(title);
  const head = titleBlock(title);
  const strip = focusStrip(slide.note || '', rtl);
  const headers = slide.visual?.headers || [];
  const rows = (slide.visual?.rows || []).map((r) => (Array.isArray(r) ? r : r.cells || []));
  const columns = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const order = (cells) => {
    const filled = Array.from({ length: columns }, (_, i) => cells[i] ?? '');
    return rtl ? filled.reverse() : filled;
  };
  const x = 60;
  const width = W - 120;
  const colW = width / columns;
  const top = Math.round(head.bottom + 6);
  const bottom = strip.top - 14;
  const measure = (cells, size, bold) => Math.max(...cells.map((c) => wrap(c, size, colW - 24, bold, 4).length), 1);
  const headLines = measure(headers, 22, true);
  const rowLines = rows.map((r) => measure(r, 20, false));
  const totalLines = rowLines.reduce((a, b) => a + b, 0);
  const headH = headers.length ? headLines * 28 + 22 : 0;
  const spare = bottom - top - headH - totalLines * 26;
  const pad = Math.max(10, Math.min(64, spare / Math.max(rows.length, 1)));
  const used = headH + totalLines * 26 + rows.length * pad;
  const startY = Math.round(top + Math.max(0, (bottom - top - used) / 2));
  let y = startY;
  let out = `<rect x="${x}" y="${startY}" width="${width}" height="${Math.min(bottom - startY, used)}" fill="#fff" stroke="${INK}" stroke-width="1.6" filter="url(#shadow)"/>`;
  if (headers.length) {
    out += `<rect x="${x}" y="${y}" width="${width}" height="${headH}" fill="#14305c"/>`;
    order(headers).forEach((c, i) => {
      out += textBlock(wrap(c, 22, colW - 24, true, 4), { x: x + colW * i + colW / 2, y: y + 32, size: 22, bold: true, fill: '#ffffff', align: 'middle', rtl });
    });
    y += headH;
  }
  rows.forEach((row, r) => {
    const h = rowLines[r] * 26 + pad;
    if (y + h > bottom + 1) return;
    if (r % 2) out += `<rect x="${x + 1}" y="${y}" width="${width - 2}" height="${h}" fill="#eaf3f7"/>`;
    order(row).forEach((c, i) => {
      out += textBlock(wrap(c, 20, colW - 24, false, 4), { x: x + colW * i + colW / 2, y: y + pad / 2 + 20, size: 20, fill: INK, align: 'middle', rtl });
    });
    if (r) out += `<path d="M${x} ${y}H${x + width}" stroke="#c9d6e4"/>`;
    y += h;
  });
  for (let i = 1; i < columns; i += 1) out += `<path d="M${x + colW * i} ${startY}V${y}" stroke="#c9d6e4"/>`;
  return wrapSvg(`${head.svg}${out}${strip.svg}`);
}

export function scenePrompt(slide, deckLanguage, custom) {
  const ar = deckLanguage === 'ar';
  const count = slide.visual?.items?.length || 0;
  const panelRule = count >= 2 && count <= 4
    ? `This slide has ${count} items, so use exactly ${count} panels, one for each item, named after it. No item may be dropped.`
    : 'Choose the number of panels by the content: 1 panel when one subject can show everything, which is the best choice whenever possible; 2 for a comparison; 3 for three items or steps; 4 for four kinds of something.';
  return `You are a senior scientific illustrator painting a study slide. The finish to reach is a colour plate from a printed medical or science textbook: rich, softly shaded, accurate, filling its frame.

You paint scenes and name their parts. Another program adds every word on the slide, so a scene holds no text at all: no letters, numbers or symbols anywhere inside SCENE.

Reply in exactly this line format and nothing else:
FOCUS|one short sentence: the single idea to remember
PANEL|short panel name|1 if this is the key panel, otherwise 0
LABEL|x|y|short part name|one short explanation
SCENE
...SVG drawing elements...
END

${panelRule} When 3 panels are ordered steps, add a line ARROWS after FOCUS. Mark exactly one key panel when there are 2 or more.

When you choose 1 panel, its canvas is 800 wide and 600 high; use all of it and show one continuous scene, never separate cards. When you choose 2, 3 or 4 panels, each panel has its own canvas 600 wide and 400 high, in its own SCENE, and each panel shows one subject only. Each LABEL's x,y must be a point exactly on the part it names, in that canvas. Give 1 panel 4 to 8 labels, 2 panels 2 to 4 each, 3 panels 2 to 3 each, and 4 panels 2 to 3 each. Spread the labelled parts across the drawing, with parts on the left and on the right.

How to paint a scene (SVG elements only: g, path, circle, ellipse, rect, polygon, line, use, defs, linearGradient, radialGradient, clipPath):
- Start with a rect that fills the whole canvas in a pale, bright colour, then fill the canvas edge to edge with the subject at large size and its surroundings. Never a small object floating in empty space, never an icon, never clip art.
- Keep the whole picture bright and well lit, like a printed textbook plate. Never use a black, navy or dark background.
- Use at least 150 elements. Prefer organic curved paths with C and Q commands over plain rectangles and circles. Repeat structures many times with small differences, as a painter would: rows of cells, fibres, droplets, tiles, cables.
- Build volume in layers: a base shape with a gradient, a darker shadow shape, a soft highlight shape, then a thin darker outline of the same hue. Every large shape gets a gradient.
- Use a natural, harmonious palette suited to the subject, with real proportions and correct anatomy or apparatus. Draw what the subject truly looks like, so someone who knows it would recognise it at once.
- An abstract idea becomes a concrete scene built from real objects: a room, a bench, equipment, containers, specimens, seen in slight perspective. Never draw people, faces, bodies, hands, figures, characters or protective suits, because they come out looking wrong. Show protective gear as goggles, gloves and masks laid out on a shelf, and show a person's task through the tools laid out for it.
- Give each id a short name. Keep coordinates to one decimal place at most.

Language of all LABEL, PANEL and FOCUS text: ${ar ? 'Arabic, keeping scientific terms in English in parentheses exactly as given' : 'the same language as the content'}. Use a | only as the separator.
Use only the facts below, and include each main point as a label explanation. Add no facts of your own.
${JSON.stringify({ title: slide.title, bullets: slide.bullets, visual: slide.visual, formula: slide.formula, focus: slide.note, picture: slide.illustration })}
${custom ? `The student's wishes for the deck: ${JSON.stringify(custom)}` : ''}`;
}

// The first draft is usually sound but sparse, so the model gets it back once to repaint it as a finished plate.
export function refinePrompt(draft) {
  return `Below is your first draft of a slide scene. Repaint it as a finished colour plate from a printed science textbook, and reply in exactly the same line format.
Keep every PANEL name, every LABEL's part name and text, and the FOCUS line exactly as they are, and keep the same number of panels. You may move a LABEL's x,y so it sits exactly on the part it names.
What to change:
- Make the main subject large: it fills at least 75% of the canvas. Remove empty areas.
- Have at least three times as many drawing elements. Add the real fine detail of the subject: repeated cells and fibres with small differences, surface texture, inner structures, liquid levels, bolts, reflections, cast shadows.
- Replace any plain or geometric shape with an organic, accurately shaped one, so the subject is recognisable at a glance. Replace anything symbolic, such as a triangle or a warning sign standing for an idea, with the real thing.
- Every large shape has a gradient, a shadow shape, a highlight and a thin darker outline of its own hue.
- Stay bright and well lit, with no text in any SCENE.

DRAFT:
${draft}`;
}
