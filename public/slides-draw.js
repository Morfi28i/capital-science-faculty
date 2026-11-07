// Draws one slide on a canvas. The same drawing feeds the live preview, the viewer, the presenter and the PDF, so what
// a student sees is exactly what they download, and the browser shapes Arabic correctly.
const hasArabic = (t) => /[؀-ۿ]/.test(String(t));

function wrap(c, text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > width && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
// The biggest size at which the text fits the box.
function fit(c, text, width, height, size, min, weight, font, lead = 1.3) {
  let s = size,
    lines;
  for (;;) {
    c.font = `${weight} ${s}px ${font}`;
    lines = wrap(c, text, width);
    if (lines.length * s * lead <= height || s <= min) break;
    s -= 1;
  }
  const most = Math.max(1, Math.floor(height / (s * lead)));
  if (lines.length > most) {
    lines = lines.slice(0, most);
    lines[most - 1] = `${lines[most - 1].replace(/\s*\S*$/, '')}…`;
  }
  return { lines, size: s, lead };
}
function write(c, block, x, y, { weight = 400, font, color, align = 'center' }) {
  c.font = `${weight} ${block.size}px ${font}`;
  c.fillStyle = color;
  c.textAlign = align;
  let at = y + block.size;
  block.lines.forEach((line) => {
    c.direction = hasArabic(line) ? 'rtl' : 'ltr';
    c.fillText(line, x, at);
    at += block.size * block.lead;
  });
  return at - block.size;
}
function panel(c, x, y, w, h, { fill, stroke, glow, radius = 8, line = 2 }) {
  c.save();
  if (glow) {
    c.shadowColor = glow;
    c.shadowBlur = 26;
  }
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, radius);
  else c.rect(x, y, w, h);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.shadowBlur = glow ? 12 : 0;
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
  c.restore();
}
function connector(c, points, color, arrow) {
  c.save();
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 2.5;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  if (arrow) {
    const [x2, y2] = points[points.length - 1],
      [x1, y1] = points[points.length - 2],
      a = Math.atan2(y2 - y1, x2 - x1);
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - 13 * Math.cos(a - 0.5), y2 - 13 * Math.sin(a - 0.5));
    c.lineTo(x2 - 13 * Math.cos(a + 0.5), y2 - 13 * Math.sin(a + 0.5));
    c.closePath();
    c.fill();
  }
  c.restore();
}
function background(c, W, H, t, l) {
  c.fillStyle = t.bg;
  c.fillRect(0, 0, W, H);
  if (t.grid) {
    c.save();
    c.strokeStyle = t.grid;
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 40; x < W; x += 40) {
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (let y = 40; y < H; y += 40) {
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
    c.restore();
  }
  if (l.layout === 'band') return;
  if (!t.grid) {
    c.fillStyle = t.accent;
    c.fillRect(0, 0, W, 12);
  }
}
function footer(c, W, H, t, l, font, page) {
  c.save();
  c.fillStyle = t.ink;
  c.globalAlpha = 0.62;
  c.font = `500 ${Math.round(W * 0.014)}px ${font}`;
  if (l.footer) {
    c.direction = hasArabic(l.footer) ? 'rtl' : 'ltr';
    c.textAlign = 'center';
    c.fillText(String(l.footer), W / 2, H - 22);
  }
  c.direction = 'ltr';
  if (l.brand) {
    c.textAlign = 'right';
    c.fillText('Capital Science', W - 34, H - 22);
  }
  if (page && l.numbers) {
    c.textAlign = 'left';
    c.fillText(page, 34, H - 22);
  }
  c.restore();
}
export function drawCover(canvas, deck, l, t, font) {
  const c = canvas.getContext('2d'),
    W = canvas.width,
    H = canvas.height;
  background(c, W, H, t, l);
  const title = fit(c, deck.title || '', W - 200, H * 0.46, Math.round(W * 0.056), 26, 800, font, 1.22);
  const height = title.lines.length * title.size * title.lead;
  const end = write(c, title, W / 2, (H - height) / 2 - 30, { weight: 800, font, color: t.accent });
  c.fillStyle = t.second;
  c.fillRect(W / 2 - 80, end + 14, 160, 5);
  if (l.author) {
    const by = fit(c, l.author, W - 200, 50, Math.round(W * 0.024), 16, 500, font);
    write(c, by, W / 2, end + 34, { weight: 500, font, color: t.ink });
  }
  footer(c, W, H, t, l, font);
}
// A titled box. Every visual below is built from these.
function card(c, x, y, w, h, item, t, font, scale, { glow, center = true, big = 1 } = {}) {
  panel(c, x, y, w, h, { fill: t.card, stroke: glow ? t.second : t.ink, glow: glow ? t.second : null, line: glow ? 3 : 1.6 });
  const pad = 14,
    inner = w - pad * 2,
    align = center ? 'center' : hasArabic(`${item.title}${item.text}`) ? 'right' : 'left',
    ax = center ? x + w / 2 : align === 'right' ? x + w - pad : x + pad,
    titleH = item.text ? Math.min((h - pad * 2) * 0.42, 90) : h - pad * 2;
  const title = fit(c, item.title || '', inner, titleH, Math.round(34 * big * scale), 14, 700, font, 1.2);
  const titleH_ = title.lines.length * title.size * title.lead;
  const body = item.text ? fit(c, item.text, inner, Math.max(h - pad * 2 - titleH_ - 6, 14), Math.round(27 * big * scale), 13, 400, font, 1.3) : null;
  const total = titleH_ + (body ? body.lines.length * body.size * body.lead + 6 : 0);
  // The words sit in the middle of the box, so a tall box never looks half empty.
  const after = write(c, title, ax, y + Math.max(pad - 2, (h - total) / 2), { weight: 700, font, color: t.ink, align });
  if (body) write(c, body, ax, after + 2, { font, color: t.ink, align });
}
function drawTree(c, v, box, t, font, scale) {
  const items = v.items.slice(0, 5),
    rootW = Math.min(box.w * 0.5, 520),
    rootH = Math.min(box.h * 0.2, 76),
    cx = box.x + box.w / 2;
  card(c, cx - rootW / 2, box.y, rootW, rootH, { title: v.root || '' }, t, font, scale);
  const gap = 24,
    top = box.y + rootH + 52,
    w = (box.w - gap * (items.length - 1)) / items.length,
    h = Math.min(box.y + box.h - top, box.h * 0.62);
  const busY = box.y + rootH + 24;
  connector(c, [[cx, box.y + rootH], [cx, busY]], t.ink);
  items.forEach((item, i) => {
    const x = box.x + i * (w + gap);
    connector(c, [[cx, busY], [x + w / 2, busY], [x + w / 2, top - 2]], t.ink, true);
    card(c, x, top, w, h, item, t, font, scale, { glow: i === 0 });
  });
}
function drawFlow(c, v, box, t, font, scale, rtl) {
  const items = v.items.slice(0, 8),
    perRow = items.length <= 4 ? items.length : Math.ceil(items.length / 2),
    rows = Math.ceil(items.length / perRow),
    gap = 44,
    rowGap = 34,
    w = (box.w - gap * (perRow - 1)) / perRow,
    h = Math.min((box.h - rowGap * (rows - 1)) / rows, box.h * (rows === 1 ? 0.6 : 0.5)),
    top = box.y + (box.h - (h * rows + rowGap * (rows - 1))) / 2;
  const place = (i) => {
    const r = Math.floor(i / perRow),
      col = i % perRow,
      across = rtl ? perRow - 1 - col : col;
    return [box.x + across * (w + gap), top + r * (h + rowGap)];
  };
  items.forEach((item, i) => {
    const [x, y] = place(i);
    if (i < items.length - 1) {
      const [nx, ny] = place(i + 1);
      if (ny === y) {
        const from = nx > x ? x + w : x,
          to = nx > x ? nx : nx + w;
        connector(c, [[from + (nx > x ? 3 : -3), y + h / 2], [to - (nx > x ? 3 : -3), y + h / 2]], t.ink, true);
      } else {
        const mid = y + h + rowGap / 2;
        connector(c, [[x + w / 2, y + h], [x + w / 2, mid], [nx + w / 2, mid], [nx + w / 2, ny - 2]], t.ink, true);
      }
    }
    card(c, x, y, w, h, { title: `${i + 1}. ${item.title}`, text: item.text }, t, font, scale, { glow: i === 0 });
  });
}
function drawCards(c, v, box, t, font, scale) {
  const items = v.items.slice(0, 6),
    cols = items.length <= 2 ? Math.max(items.length, 1) : items.length === 4 ? 2 : 3,
    rows = Math.ceil(items.length / cols),
    gap = 20,
    w = (box.w - gap * (cols - 1)) / cols,
    h = Math.min((box.h - gap * (rows - 1)) / rows, rows === 1 ? box.h * 0.72 : box.h),
    top = box.y + (box.h - (h * rows + gap * (rows - 1))) / 2,
    big = items.length <= 3 ? 1.28 : 1;
  items.forEach((item, i) => {
    card(c, box.x + (i % cols) * (w + gap), top + Math.floor(i / cols) * (h + gap), w, h, item, t, font, scale, { glow: i === 0 && v.type !== 'compare', center: true, big });
  });
}
function drawTable(c, v, box, t, font, scale) {
  const rows = v.rows.slice(0, 9).map((r) => r.cells || []),
    cols = Math.max(v.headers.length, ...rows.map((r) => r.length), 1),
    w = box.w / cols,
    headH = Math.min(52, box.h * 0.16),
    rowH = (box.h - headH) / Math.max(rows.length, 1),
    rtl = hasArabic(JSON.stringify([v.headers, rows]));
  const xOf = (i) => box.x + (rtl ? cols - 1 - i : i) * w;
  panel(c, box.x, box.y, box.w, headH, { fill: t.accent, radius: 6 });
  v.headers.slice(0, cols).forEach((h, i) => {
    const b = fit(c, h, w - 20, headH - 8, Math.round(29 * scale), 13, 700, font, 1.15);
    write(c, b, xOf(i) + w / 2, box.y + (headH - b.lines.length * b.size * b.lead) / 2 - 1, { weight: 700, font, color: t.bg });
  });
  rows.forEach((row, r) => {
    const y = box.y + headH + r * rowH;
    panel(c, box.x, y, box.w, rowH, { fill: r % 2 ? t.soft : t.card, radius: 0 });
    row.slice(0, cols).forEach((cell, i) => {
      const b = fit(c, cell, w - 20, rowH - 8, Math.round(27 * scale), 12, 400, font, 1.2);
      write(c, b, xOf(i) + w / 2, y + (rowH - b.lines.length * b.size * b.lead) / 2 - 1, { font, color: t.ink });
    });
  });
}
function drawLabels(c, v, box, t, font, scale, image) {
  const items = v.items.slice(0, 8),
    imgW = box.w * 0.46,
    imgH = box.h,
    ix = box.x + (box.w - imgW) / 2;
  panel(c, ix - 5, box.y - 5, imgW + 10, imgH + 10, { fill: '#ffffff', stroke: t.ink, line: 1.5, radius: 4 });
  const ratio = Math.min(imgW / image.width, imgH / image.height),
    dw = image.width * ratio,
    dh = image.height * ratio;
  c.drawImage(image, ix + (imgW - dw) / 2, box.y + (imgH - dh) / 2, dw, dh);
  const sideW = (box.w - imgW) / 2 - 34,
    half = Math.ceil(items.length / 2);
  [items.slice(0, half), items.slice(half)].forEach((side, s) => {
    const rowH = box.h / Math.max(side.length, 1),
      left = s === 0,
      x = left ? box.x : ix + imgW + 34;
    side.forEach((item, i) => {
      const y = box.y + i * rowH,
        align = hasArabic(`${item.title}${item.text}`) ? 'right' : left ? 'right' : 'left',
        ax = align === 'right' ? x + sideW : x;
      const head = fit(c, item.title || '', sideW, rowH * 0.42, Math.round(28 * scale), 13, 700, font, 1.15);
      const end = write(c, head, ax, y, { weight: 700, font, color: t.accent, align });
      if (item.text) write(c, fit(c, item.text, sideW, Math.max(rowH - (end - y) - 8, 14), Math.round(23 * scale), 12, 400, font, 1.22), ax, end, { font, color: t.ink, align });
      const lineY = y + Math.min(head.size * 0.7, rowH / 2);
      connector(c, left ? [[x + sideW + 6, lineY], [ix - 6, lineY]] : [[x - 6, lineY], [ix + imgW + 6, lineY]], t.second, true);
    });
  });
}
function drawBullets(c, bullets, box, t, font, scale, center) {
  const rtl = hasArabic(bullets.join(' '));
  let size = Math.round(36 * scale),
    blocks,
    total;
  const lead = 1.4,
    width = box.w - 36;
  for (;;) {
    c.font = `400 ${size}px ${font}`;
    blocks = bullets.map((b) => wrap(c, b, width));
    total = blocks.reduce((n, b) => n + b.length * size * lead + 12, 0);
    if (total <= box.h || size <= 14) break;
    size -= 1;
  }
  let y = box.y + Math.max(0, (box.h - total) / 2) * 0.5;
  const right = box.x + box.w,
    x = center ? box.x + box.w / 2 : rtl ? right - 30 : box.x + 30;
  c.textAlign = center ? 'center' : rtl ? 'right' : 'left';
  blocks.forEach((lines) => {
    if (!center) {
      c.fillStyle = t.second;
      c.beginPath();
      c.arc(rtl ? right - 8 : box.x + 8, y + size * 0.72, 6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = t.ink;
    lines.forEach((line) => {
      c.direction = rtl ? 'rtl' : 'ltr';
      if (y + size > box.y + box.h + size) return;
      c.fillText(line, x, y + size);
      y += size * lead;
    });
    y += 12;
  });
}
export function drawSlide(canvas, slide, page, l, t, font, image) {
  const c = canvas.getContext('2d'),
    W = canvas.width,
    H = canvas.height,
    scale = (Math.min(W, H * 1.78) / 1280) * (l.size / 100),
    rtl = hasArabic(`${slide.title} ${slide.bullets.join(' ')}`),
    band = l.layout === 'band' ? 34 : 0,
    x = 60 + (rtl ? 0 : band),
    w = W - 120 - band;
  c.textBaseline = 'alphabetic';
  background(c, W, H, t, l);
  if (band) {
    c.fillStyle = t.accent;
    c.fillRect(rtl ? W - band : 0, 0, band, H);
  }
  const titleMax = Math.round((l.layout === 'bigtitle' ? 70 : 54) * scale),
    title = fit(c, slide.title, w, titleMax * 2.5, titleMax, 22, 700, font, 1.2);
  const align = l.layout === 'band' ? (rtl ? 'right' : 'left') : 'center',
    tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  let y = write(c, title, tx, 26, { weight: 700, font, color: t.accent, align }) + 12;
  const bottom = H - 50;
  let end = bottom;
  // The formula and the tip sit in framed strips at the foot, like the deck's "focus" boxes.
  const strip = (text, opts) => {
    const b = fit(c, text, w - 40, 62, Math.round(opts.size * scale), 13, opts.weight, font, 1.2);
    const h = b.lines.length * b.size * b.lead + 18;
    end -= h;
    panel(c, x, end, w, h, { fill: opts.fill, stroke: opts.stroke, line: 1.6, radius: 6 });
    write(c, b, x + w / 2, end + 7, { weight: opts.weight, font, color: opts.color });
    end -= 12;
  };
  if (slide.note) strip(slide.note, { size: 27, weight: 600, fill: t.card, stroke: t.ink, color: t.ink });
  if (slide.formula) {
    c.save();
    strip(slide.formula, { size: 32, weight: 600, fill: t.soft, stroke: t.accent, color: t.accent });
    c.restore();
  }
  const v = slide.visual,
    box = { x, y, w, h: Math.max(end - y, 60) };
  const hasItems = v?.items?.length;
  if (v?.type === 'tree' && hasItems) drawTree(c, v, box, t, font, scale);
  else if (v?.type === 'flow' && hasItems) drawFlow(c, v, box, t, font, scale, rtl);
  else if (v?.type === 'table' && v.rows?.length) drawTable(c, v, box, t, font, scale);
  else if (v?.type === 'labels' && hasItems && image) drawLabels(c, v, box, t, font, scale, image);
  else if (['cards', 'compare', 'labels'].includes(v?.type) && hasItems) drawCards(c, v, box, t, font, scale);
  else if (image) {
    const half = slide.bullets.length ? w * 0.42 : w;
    const r = Math.min(half / image.width, box.h / image.height);
    const ix = rtl ? x : x + w - half;
    panel(c, ix - 3, y - 3, half + 6, box.h + 6, { fill: '#ffffff', stroke: t.ink, line: 1.5, radius: 4 });
    c.drawImage(image, ix + (half - image.width * r) / 2, y + (box.h - image.height * r) / 2, image.width * r, image.height * r);
    if (slide.bullets.length) drawBullets(c, slide.bullets, { x: rtl ? x + half + 24 : x, y, w: w - half - 24, h: box.h }, t, font, scale);
  } else drawBullets(c, slide.bullets, box, t, font, scale, l.layout === 'center');
  footer(c, W, H, t, l, font, page);
}
