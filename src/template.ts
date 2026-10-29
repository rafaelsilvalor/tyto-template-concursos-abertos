/**
 * `concursos-abertos` — the week's open exams as a carousel: a cover, one slide per exam and a
 * back cover, every slide 1080×1350.
 *
 * ## The three slides
 *
 * | slide      | the brief writes            | drawn                                              |
 * | ---------- | --------------------------- | -------------------------------------------------- |
 * | cover      | `::lamina {capa}`           | the kicker, the two-line title, the call beside it |
 * | exam       | `::lamina` with its lines   | the exam's title and subtitle over a card of facts |
 * | back cover | `::lamina {contracapa}`     | a paragraph and the contact lines; the seal        |
 *
 * One `::lamina` is one slide in Tyto, and a template cannot add slides of its own, so the
 * cover and the back cover are slides the brief marks. Their words are the template's defaults
 * below, and the brief's `abertura`, `chamada`, `fechamento` and `contatos` replace them.
 *
 * Every position is the reference art's, in the slide's pixels: a text is placed by the top of
 * its capitals, as the reference's layer bounds give it. The logo and the signature are the
 * brand kit's (Tyto ADR 0063), placeholders without one; every colour is a declared value
 * (Tyto ADR 0153) whose default is the reference's.
 */

import {
  colorValue,
  numberValue,
  frame,
  lineBreak,
  linearGradient,
  rect,
  run,
  solid,
  stop,
  text,
  vector,
} from '@tyto/core/template';
import { drawLogo, oneInk, sealOf, signatureOf } from '@tyto/house-style';
import { at, lines, plain, sealed } from '@tyto/template-kit';

import type { TemplateBuild, TemplateContext } from '@tyto/core';
import type { NodeDraft } from '@tyto/core/template';

/* ------------------------------------------------------------------------- the words -- */

/** The cover's title, one line each, when the brief writes no `abertura`. */
export const DEFAULT_OPENING = 'CONCURSOS\nABERTOS';

/** The call beside the title's second line, when the brief writes no `chamada`. */
export const DEFAULT_CALL = 'PARA VOCÊ\nSE INSCREVER\nNESTA SEMANA!';

/** The back cover's paragraph, when the brief writes no `fechamento`. Invented copy. */
export const DEFAULT_CLOSING =
  'Quer saber mais sobre os próximos concursos? Então siga a gente nas redes.';

/** The back cover's contact lines, when the brief writes no `contatos`. Invented copy. */
export const DEFAULT_CONTACTS = 'Instagram: @perfil\nYoutube.com/canal\nsite.com.br';

/* ------------------------------------------------------------------------- the tokens -- */

/** The colours, by declared value name, each default the reference's. */
export const COLOR_DEFAULTS = {
  deep: '#00153d',
  shallow: '#00599a',
  accent: '#00b2f3',
  paper: '#ffffff',
  card: '#fafafa',
  'title-ink': '#11588b',
  'subtitle-ink': '#4d4d4d',
  'label-ink': '#00578e',
  'value-ink': '#646464',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;

/** The numbers a configuration may change, by declared value name, each default the reference's. */
export const NUMBER_DEFAULTS = {
  /** An exam's title breaks between words into lines of at most this many characters. */
  'title-line-max': 16,
  /** From the card's edges to its facts, on every side. */
  'card-padding': 64,
  /**
   * The card's widest, edges included: the title's widest, a 16-character line in the title's
   * face (`CONCURSOS ABERTO`, 777 px). Past it a fact wraps and the card grows taller.
   */
  'card-max-width': 780,
} as const;

const FACE = { family: 'CircularXX', source: 'system' } as const;
const LIGHT = 300;
const REGULAR = 400;
const MEDIUM = 500;
const BOLD = 700;
const BLACK = 900;

/**
 * CircularXX's vertical metrics, in em: the ascender and the capital height. A line of
 * height `lineHeight` puts the content area in its middle, so the capitals start this far
 * below the line's top. The face's typographic metrics (`OS/2`), the same in every weight:
 * the render lays lines out by these, measured against the reference art — the `hhea` pair
 * (0.953, 0.277) put every title 2 to 15 px high.
 */
const ASCENT = 0.75;
const DESCENT = 0.25;
const CAP_HEIGHT = 0.709;

function capOffset(size: number, lineHeight: number): number {
  return size * ((lineHeight - (ASCENT + DESCENT)) / 2 + (ASCENT - CAP_HEIGHT));
}

const SLIDE_WIDTH = 1080;
const MARGIN = 80;

/* -------------------------------------------------------------------------- the build -- */

export const build: TemplateBuild = (context: TemplateContext) => {
  const ink = (name: ColorName) => colorValue(context, name, COLOR_DEFAULTS[name]);
  const page = sealed(context.size, sealOf(context));

  const role = roleOf(context);
  const body =
    role === 'capa'
      ? cover(context, ink)
      : role === 'contracapa'
        ? backCover(context, ink)
        : exam(context, ink);

  const dark = role !== 'lamina';
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: dark
      ? linearGradient(180, [stop(0, ink('deep')), stop(1, ink('shallow'))])
      : solid(ink('paper')),
    children: [
      at(
        MARGIN,
        dark ? 74 : 67,
        drawLogo(context.brand, dark ? 60 : 68, oneInk(dark ? ink('accent') : ink('title-ink'))),
      ),
      ...body,
      signature(context, dark ? ink('accent') : ink('title-ink'), dark ? 1215 : 1218),
      ...page.seal,
    ],
  });
};

type Ink = (name: ColorName) => string;

/** Which of the three slides this `::lamina` is: the brief marks the cover and the back cover. */
export function roleOf(context: TemplateContext): 'capa' | 'contracapa' | 'lamina' {
  if (context.adjustments['capa'] === true) return 'capa';
  if (context.adjustments['contracapa'] === true) return 'contracapa';
  return 'lamina';
}

/* -------------------------------------------------------------------------- the cover -- */

function cover(context: TemplateContext, ink: Ink): NodeDraft[] {
  const [first = '', second = ''] = slotText(context, 'abertura', DEFAULT_OPENING).split('\n');
  return [
    kicker(context, ink),
    rect({
      name: 'rule',
      size: { w: 919, h: 8 },
      fill: solid(ink('accent')),
      transform: { x: MARGIN, y: 438 },
    }),
    // The two title lines sit 3 px and the call 5 px under their layers' bounds: measured
    // against the reference art, at these sizes the face's capitals render that much higher.
    textAt('abertura-1', first, {
      x: 84,
      capTop: 508,
      size: 140.9,
      weight: BOLD,
      color: ink('accent'),
    }),
    textAt('abertura-2', second, {
      x: 79,
      capTop: 695,
      size: 137.2,
      weight: BOLD,
      color: ink('accent'),
    }),
    textAt('chamada', slotText(context, 'chamada', DEFAULT_CALL), {
      x: 729,
      capTop: 686,
      size: 33.1,
      weight: BOLD,
      color: ink('accent'),
      lineHeight: 1.24,
    }),
    ...linkMark(971, 687, 1, ink('accent')),
    arrow('seta', { x: 729, y: 846, w: 270, h: 34, shaft: 10 }, ink('accent')),
    ...corners(ink('accent')),
  ];
}

/* --------------------------------------------------------------------- the back cover -- */

function backCover(context: TemplateContext, ink: Ink): NodeDraft[] {
  const contacts = slotText(context, 'contatos', DEFAULT_CONTACTS).split('\n');
  return [
    ...contacts.map((line, index) =>
      contactIcon(line, CONTACT.iconCentreX, CONTACT.firstCentreY + index * CONTACT.pitch, ink),
    ),
    kicker(context, ink),
    textAt('fechamento', slotText(context, 'fechamento', DEFAULT_CLOSING), {
      // The reference's lines are 685 px at the widest, centred on the slide; 700 leaves the
      // same breaks room under a face a few pixels wider.
      x: 190,
      capTop: 395,
      size: 43.6,
      weight: BOLD,
      color: ink('accent'),
      lineHeight: 1.19,
      width: 700,
      align: 'center',
    }),
    textAt('contatos', slotText(context, 'contatos', DEFAULT_CONTACTS), {
      x: 350,
      capTop: 693,
      size: 33.1,
      weight: REGULAR,
      color: ink('accent'),
      lineHeight: 2,
    }),
    ...linkMark(906, 617, 0.87, ink('accent')),
    ...corners(ink('accent')),
  ];
}

/**
 * The contact lines' icons, the reference's: centred 45 px left of the words, each on its
 * line's capitals, a line every 66 px.
 */
const CONTACT = { iconCentreX: 305, firstCentreY: 711, pitch: 66 } as const;

/**
 * The icon a contact line gets from its words: Instagram's or YouTube's when it names them,
 * a chain link for anything else. Drawn as geometry in the accent, as the reference draws them.
 */
function contactIcon(line: string, centreX: number, centreY: number, ink: Ink): NodeDraft {
  const words = line.toLowerCase();
  const icon = words.includes('instagram') ? INSTAGRAM : words.includes('youtube') ? YOUTUBE : LINK;
  return vector({
    name: `icone-${icon.name}`,
    geometry: { kind: 'path', d: icon.d, fillRule: 'evenodd' },
    size: icon.size,
    fill: solid(ink('accent')),
    transform: { x: centreX - icon.size.w / 2, y: centreY - icon.size.h / 2 },
  });
}

interface Icon {
  readonly name: string;
  readonly size: { readonly w: number; readonly h: number };
  readonly d: string;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`;
}

/** A capsule of half-length `length` and radius `r` around (cx, cy), along a 45° rise. */
function capsule(cx: number, cy: number, length: number, r: number): string {
  const along = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
  const across = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  const point = (a: number, b: number) =>
    `${round(cx + along.x * a + across.x * b)} ${round(cy + along.y * a + across.y * b)}`;
  return (
    `M${point(length, -r)}A${r} ${r} 0 0 1 ${point(length, r)}` +
    `L${point(-length, r)}A${r} ${r} 0 0 1 ${point(-length, -r)}Z`
  );
}

const round = (value: number) => Math.round(value * 100) / 100;

/** A rounded square outline, a ring and a dot, 31 px, as the reference's. */
const INSTAGRAM: Icon = {
  name: 'instagram',
  size: { w: 31, h: 31 },
  d:
    roundedRect(0, 0, 31, 31, 9) +
    roundedRect(3, 3, 25, 25, 6.5) +
    circle(15.5, 15.5, 7.5) +
    circle(15.5, 15.5, 4.7) +
    circle(23.8, 7.2, 2),
};

/** A rounded rectangle with a play triangle cut out, 34 × 23 px, as the reference's. */
const YOUTUBE: Icon = {
  name: 'youtube',
  size: { w: 34, h: 23 },
  d: roundedRect(0, 0, 34, 23, 6) + 'M13.5 6.5L22.5 11.5L13.5 16.5Z',
};

/** Two interlocked capsule outlines on a 45° rise, 24 px, as the reference's. */
const LINK: Icon = {
  name: 'link',
  size: { w: 24, h: 24 },
  d:
    capsule(7.8, 16.2, 3.6, 4.6) +
    capsule(7.8, 16.2, 3.6, 2.2) +
    capsule(16.2, 7.8, 3.6, 4.6) +
    capsule(16.2, 7.8, 3.6, 2.2),
};

/* ---------------------------------------------------------------------- an exam slide -- */

/**
 * An exam: its first line is the title, a second line with no `:` the subtitle, and every
 * `Label: value` line after them one line of the card.
 *
 * Top to bottom, each piece below the one before: the title in lines of at most
 * `title-line-max` characters, the subtitle, and the card, which wraps its facts with
 * `card-padding` on every side and is centred on the slide. One title line and a subtitle put
 * every piece where the reference art has it.
 */
function exam(context: TemplateContext, ink: Ink): NodeDraft[] {
  const value = context.slots['lamina']?.value;
  const all =
    value?.kind === 'rich-text' ? lines(value.text).map((line) => plain(line).trim()) : [];
  const written = all.filter((line) => line !== '');
  const [title = '', ...rest] = written;
  const subtitle = rest[0] !== undefined && !rest[0].includes(':') ? rest.shift() : undefined;

  const centred = { x: 0, width: SLIDE_WIDTH, align: 'center' as const };
  const titleLines = wrapAt(
    title.toUpperCase(),
    numberValue(context, 'title-line-max', NUMBER_DEFAULTS['title-line-max']),
  );
  const nodes: NodeDraft[] = [
    textAt('titulo', titleLines.join('\n'), {
      ...centred,
      capTop: EXAM.titleTop,
      size: EXAM.titleSize,
      weight: BLACK,
      color: ink('title-ink'),
    }),
  ];
  // Where the next piece's capitals start: one title line's pitch below the last one.
  const capTop = EXAM.titleTop + titleLines.length * EXAM.titleSize;
  let foot = capTop - EXAM.titleSize + EXAM.titleSize * CAP_HEIGHT;
  if (subtitle !== undefined) {
    nodes.push(
      textAt('subtitulo', subtitle.toUpperCase(), {
        ...centred,
        capTop,
        size: EXAM.subtitleSize,
        weight: BLACK,
        color: ink('subtitle-ink'),
      }),
    );
    foot = capTop + EXAM.subtitleSize * CAP_HEIGHT;
  }

  nodes.push(...card(context, ink, rest, foot + EXAM.cardGap));
  nodes.push(arrow('seta', { x: 848, y: 1217, w: 151, h: 25, shaft: 7 }, ink('title-ink')));
  return nodes;
}

/** An exam slide's numbers, the reference art's: sizes, where the title starts, the gaps. */
const EXAM = {
  titleTop: 368,
  titleSize: 72,
  subtitleSize: 40,
  /** From the foot of the subtitle's capitals to the card's top edge. */
  cardGap: 66,
  factSize: 40,
  factLineHeight: 1.2,
  /** A glyph's advance, in em, for when nothing can be measured (a test, CI without the face). */
  estimatedAdvance: 0.55,
} as const;

/**
 * The card and its facts. Its edges sit `card-padding` from the facts' first capitals, from
 * the foot of the last line's capitals, and from the widest line's sides.
 */
function card(
  context: TemplateContext,
  ink: Ink,
  facts: readonly string[],
  top: number,
): NodeDraft[] {
  const runs = facts.flatMap((line, index) => {
    const split = line.indexOf(':');
    const label = split < 0 ? line : line.slice(0, split + 1);
    const detail = split < 0 ? '' : line.slice(split + 1);
    return [
      ...(index > 0 ? [lineBreak()] : []),
      run(label, { font: FACE, size: EXAM.factSize, weight: MEDIUM, color: ink('label-ink') }),
      ...(detail === ''
        ? []
        : [
            run(detail, {
              font: FACE,
              size: EXAM.factSize,
              weight: LIGHT,
              color: ink('value-ink'),
            }),
          ]),
    ];
  });
  const [first, ...others] = runs;
  if (first === undefined) return [];

  const padding = numberValue(context, 'card-padding', NUMBER_DEFAULTS['card-padding']);
  const widest =
    numberValue(context, 'card-max-width', NUMBER_DEFAULTS['card-max-width']) - padding * 2;
  const pitch = EXAM.factSize * EXAM.factLineHeight;
  const draft = (box: { readonly w?: number }, at = { x: 0, y: 0 }) =>
    text({
      name: 'fatos',
      runs: [first, ...others],
      box,
      lineHeight: EXAM.factLineHeight,
      transform: at,
    });

  const natural = context.measure(draft({}));
  const width = Math.min(widest, Math.ceil(natural?.width ?? estimatedWidth(facts)));
  const laid =
    natural !== undefined && natural.width > widest
      ? context.measure(draft({ w: widest }))
      : natural;
  const lineCount = laid?.lines ?? facts.length;

  const size = {
    w: width + padding * 2,
    h: (lineCount - 1) * pitch + EXAM.factSize * CAP_HEIGHT + padding * 2,
  };
  const left = Math.round((SLIDE_WIDTH - size.w) / 2);
  const capTop = top + padding;
  return [
    rect({
      name: 'card',
      size,
      radius: 32,
      fill: solid(ink('card')),
      effects: [SHADOW],
      transform: { x: left, y: top },
    }),
    // One pixel past the measured width, so the widest line does not wrap on a rounding.
    draft(
      { w: width + 1 },
      { x: left + padding, y: capTop - capOffset(EXAM.factSize, EXAM.factLineHeight) },
    ),
  ];
}

/**
 * The card's drop shadow, the reference's: black at 35 %, 8 px away at 120° (so 4 px right and
 * 6.9 px down). Photoshop's 16 px size fades out within 18 px of the edge; a blur of 8
 * does the same here, measured beside and below the card (10 still reached 25 px).
 */
const SHADOW = {
  kind: 'shadow',
  x: 4,
  y: 6.9,
  blur: 8,
  spread: 0,
  color: { r: 0, g: 0, b: 0, a: 0.35 },
} as const;

function estimatedWidth(facts: readonly string[]): number {
  const longest = Math.max(0, ...facts.map((line) => [...line].length));
  return longest * EXAM.estimatedAdvance * EXAM.factSize;
}

/**
 * Words in lines of at most `limit` characters, spaces counted. A word longer than the limit
 * stands on a line of its own rather than being cut.
 */
export function wrapAt(words: string, limit: number): string[] {
  const result: string[] = [];
  for (const word of words.split(/\s+/).filter((piece) => piece !== '')) {
    const last = result[result.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= limit) {
      result[result.length - 1] = `${last} ${word}`;
    } else {
      result.push(word);
    }
  }
  return result.length === 0 ? [''] : result;
}

/* ------------------------------------------------------------------------ the shared -- */

interface ArrowBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  /** The head's height; the shaft is centred on it. */
  readonly h: number;
  readonly shaft: number;
}

/** The arrow pointing to the next slide: a shaft and a triangular head 0.62 of its height long. */
function arrow(name: string, box: ArrowBox, color: string): NodeDraft {
  const head = Math.round(box.h * 0.62);
  const top = (box.h - box.shaft) / 2;
  const neck = box.w - head;
  const d = `M0 ${top}H${neck}V0L${box.w} ${box.h / 2}L${neck} ${box.h}` + `V${top + box.shaft}H0Z`;
  return vector({
    name,
    geometry: { kind: 'path', d, fillRule: 'nonzero' },
    size: { w: box.w, h: box.h },
    fill: solid(color),
    transform: { x: box.x, y: box.y },
  });
}

/** The two corner marks of the dark slides, each an L of two 5 px bars, at the reference's. */
function corners(color: string): NodeDraft[] {
  const bars = [
    { x: 78, y: 238, w: 5, h: 16 },
    { x: 78, y: 238, w: 16, h: 5 },
    { x: 996, y: 1118, w: 5, h: 16 },
    { x: 985, y: 1129, w: 16, h: 5 },
  ];
  return bars.map((bar, index) =>
    rect({
      name: `canto-${index + 1}`,
      size: { w: bar.w, h: bar.h },
      fill: solid(color),
      transform: { x: bar.x, y: bar.y },
    }),
  );
}

/** The small mark of two squares — one filled, one outlined — drawn at a scale of the cover's. */
function linkMark(x: number, y: number, scale: number, color: string): NodeDraft[] {
  const s = (value: number) => Math.round(value * scale * 10) / 10;
  return [
    rect({
      name: 'marca-cheia',
      size: { w: s(11), h: s(11) },
      fill: solid(color),
      transform: { x: x + s(12), y },
    }),
    rect({
      name: 'marca-vazada',
      size: { w: s(12), h: s(13) },
      stroke: { paint: solid(color), width: 1, align: 'inside' },
      transform: { x, y: y + s(11) },
    }),
  ];
}

/** The tiny tracked words at the top of the cover and the back cover: the title on one line. */
function kicker(context: TemplateContext, ink: Ink): NodeDraft {
  const words = slotText(context, 'abertura', DEFAULT_OPENING).replace(/\s+/g, ' ').trim();
  return textAt('rubrica', words, {
    x: 0,
    capTop: 207,
    size: 10,
    weight: REGULAR,
    color: ink('accent'),
    width: SLIDE_WIDTH,
    align: 'center',
    letterSpacing: 27.6,
  });
}

function signature(context: TemplateContext, color: string, capTop: number): NodeDraft {
  return textAt('assinatura', signatureOf(context.brand), {
    x: 0,
    capTop,
    size: 24.4,
    weight: LIGHT,
    color,
    width: SLIDE_WIDTH,
    align: 'center',
    letterSpacing: 4.9,
  });
}

interface Placed {
  readonly x: number;
  /** Where the capitals start, in the slide's pixels. */
  readonly capTop: number;
  readonly size: number;
  readonly weight: number;
  readonly color: string;
  readonly lineHeight?: number;
  readonly width?: number;
  readonly align?: 'left' | 'center';
  readonly letterSpacing?: number;
}

/** A plain text, one run per line, placed by the top of its capitals. */
function textAt(name: string, words: string, placed: Placed): NodeDraft {
  const lineHeight = placed.lineHeight ?? 1;
  const style = { font: FACE, size: placed.size, weight: placed.weight, color: placed.color };
  const [first = '', ...others] = words.split('\n');
  return text({
    name,
    runs: [run(first, style), ...others.flatMap((line) => [lineBreak(), run(line, style)])],
    ...(placed.width === undefined ? {} : { box: { w: placed.width } }),
    align: placed.align ?? 'left',
    lineHeight,
    letterSpacing: placed.letterSpacing ?? 0,
    transform: { x: placed.x, y: placed.capTop - capOffset(placed.size, lineHeight) },
  });
}

/** A rich-text slot's words as plain text, or the template's default when the brief left it out. */
function slotText(context: TemplateContext, name: string, fallback: string): string {
  const value = context.slots[name]?.value;
  if (value?.kind !== 'rich-text') return fallback;
  const words = plain(value.text).trim();
  return words === '' ? fallback : words;
}
