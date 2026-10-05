const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const roots = ['src/pages/espace', 'src/components/profile', 'src/components/settings', 'src/components/messagerie', 'src/components/chatbot'];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = [...roots.flatMap(walk), 'src/components/PaiementModals.tsx'].filter((file) => file.endsWith('.tsx'));
const tokenPattern = /(?<![\w:-])(?:[\w-]+:)*(?:bg|text|border(?:-[trblxy])?|divide|ring|from|via|to)-[\w\[\]#./%-]+/g;

function darkClass(token, raw, file) {
  const parts = token.split(':');
  const utility = parts.pop();
  if (parts.includes('dark')) return;
  const prefix = parts.length ? parts.join(':') + ':' : '';
  const match = utility.match(/^(bg|text|border(?:-[trblxy])?|divide|ring|from|via|to)-(.+)$/);
  if (!match) return;
  const [, kind, value] = match;
  const [color, opacity] = value.split('/');
  const alpha = opacity ? '/' + opacity : '';
  const greenSurface = /(?<![\w:-])bg-brand-green(?![\w/-])/.test(raw);
  let target;

  if (kind === 'bg') {
    if (color === 'white' && (!opacity || Number(opacity) >= 50)) {
      const decorative = file.endsWith('AudioPlayer.tsx') || raw.includes('pointer-events-none inline-block h-5 w-5') || raw.includes('h-1.5 w-1.5 rounded-full bg-white');
      if (!decorative) target = 'bg-card' + alpha;
    } else if (color === 'brand-canvas') target = 'bg-background' + alpha;
    else if (color === 'brand-sand' || color === '[#eeeae3]') target = 'bg-muted' + alpha;
    else if (color === 'brand-peach') target = 'bg-brand-peach/' + (parts.includes('hover') ? '20' : '10');
    else if (color === 'brand-ink' && opacity && Number(opacity) <= 30) target = 'bg-foreground' + alpha;
    else if (color === 'brand-ink' && opacity && Number(opacity) >= 50) target = 'bg-black/65';
    else if (color === 'brand-violet' && opacity) target = 'bg-violet-400/15';
    else if (/^(neutral|gray|slate|zinc|stone)-(50|100|200|300)$/.test(color)) target = 'bg-muted' + alpha;
    else if (/^(red|emerald|blue)-(50|100)$/.test(color)) target = 'bg-' + color.split('-')[0] + '-500/10';
  } else if (kind === 'text') {
    if (color === 'brand-ink') target = (greenSurface ? 'text-primary-foreground' : 'text-foreground') + alpha;
    else if (color === 'brand-violet') target = 'text-violet-300' + alpha;
    else if (/^(neutral|gray|slate|zinc|stone)-(300|400|500|600)$/.test(color)) target = 'text-muted-foreground' + alpha;
    else if (/^(neutral|gray|slate|zinc|stone)-(700|800|900|950)$/.test(color) || /^\[#(20252a|252525)\]$/.test(color)) target = 'text-foreground' + alpha;
    else if (/^(red|emerald|amber|orange)-(500|600|700|800)$/.test(color)) target = 'text-' + color.split('-')[0] + '-300' + alpha;
  } else if (kind.startsWith('border') || kind === 'divide' || kind === 'ring') {
    if (color === 'brand-ink' || color === 'brand-sand' || color === '[#111118]' || color === '[#f3f0eb]' || /^(neutral|gray|slate|zinc|stone)-(100|200|300|400)$/.test(color)) target = kind + '-border';
    else if (color === 'white' && !opacity) target = kind + '-card';
    else if (color === 'brand-violet') target = kind + '-violet-300' + (opacity ? '/40' : '');
    else if (/^(red|emerald)-(200|300)$/.test(color)) target = kind + '-' + color.split('-')[0] + '-500/30';
  } else if (['from', 'via', 'to'].includes(kind) && color === 'brand-violet' && opacity) {
    target = kind + '-violet-400/' + (Number(opacity) <= 5 ? '5' : '10');
  }
  return target && 'dark:' + prefix + target;
}

let changed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const visit = (node) => {
    if (ts.isStringLiteralLike(node) || [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) {
      const start = node.getStart(tree), end = node.getEnd();
      const raw = source.slice(start, end);
      const seen = new Set(raw.match(tokenPattern) || []);
      const updated = raw.replace(tokenPattern, (token) => {
        const dark = darkClass(token, raw, file);
        if (!dark || seen.has(dark)) return token;
        seen.add(dark);
        return token + ' ' + dark;
      });
      if (updated !== raw) edits.push({ start, end, updated });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!edits.length) continue;
  let result = source;
  for (const { start, end, updated } of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, start) + updated + result.slice(end);
  fs.writeFileSync(file, result);
  console.log(`${file}: ${edits.length} color declarations`);
  changed++;
}
console.log(`${changed} files adapted`);
