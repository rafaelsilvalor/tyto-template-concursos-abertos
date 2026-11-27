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

import { colorValue, numberValue, frame, linearGradient, solid, stop } from '@tyto/core/template';
import { drawLogo, oneInk, sealOf, signatureOf } from '@tyto/house-style';
import {
  anchorOf,
  arrowShape,
  at,
  capsulePath,
  carouselFooter,
  capText,
  circlePath,
  cornerBracket,
  huggedText,
  icon,
  inset,
  keepTogetherText,
  labelOfText,
  labelValueRuns,
  NO_BREAK_SPACE,
  paddedCard,
  plain,
  plainRuns,
  reportOverflow,
  roundedRectPath,
  rule,
  sealed,
  shape,
  signatureLine,
  slideRichLines,
  slotText,
  stackIn,
} from '@tyto/template-kit';

import type { TemplateBuild, TemplateContext } from '@tyto/core';
import type { NodeDraft } from '@tyto/core/template';
import type { Area, Block, Icon } from '@tyto/template-kit';

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

/**
 * `concursos-abertos-saude`'s colours: the same slides in the health vertical's reference
 * (`concursos-abertos-saude.psd`), which changes only the colours and the brand's signature.
 * The gradient is the composited background's top and foot rows; the inks are the type layers'
 * fills. The reference shows no subtitle, so the subtitle keeps the education one.
 */
export const SAUDE_COLOR_DEFAULTS: Readonly<Record<ColorName, string>> = {
  deep: '#00eff6',
  shallow: '#00a4e9',
  accent: '#ffffff',
  paper: '#ffffff',
  card: '#fafafa',
  'title-ink': '#1e9fdc',
  'subtitle-ink': '#4d4d4d',
  'label-ink': '#00a0df',
  'value-ink': '#646464',
};

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
 * CircularXX's capital height, in em. Its vertical metrics are the kit's `DEFAULT_METRICS`
 * (ascent 0.75, descent 0.25, this cap height): the face's typographic metrics (`OS/2`), the
 * same in every weight. The render lays lines out by these, measured against the reference
 * art — the `hhea` pair (0.953, 0.277) put every title 2 to 15 px high.
 */
const CAP_HEIGHT = 0.709;

const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;
const MARGIN = 80;

/* -------------------------------------------------------------------------- the build -- */

export const build: TemplateBuild = (context: TemplateContext) => buildIn(COLOR_DEFAULTS, context);

/** `concursos-abertos-saude`: the same slides, falling back to the health vertical's colours. */
export const buildSaude: TemplateBuild = (context: TemplateContext) =>
  buildIn(SAUDE_COLOR_DEFAULTS, context);

function buildIn(defaults: Readonly<Record<ColorName, string>>, context: TemplateContext) {
  const ink = (name: ColorName) => colorValue(context, name, defaults[name]);
  // The seal's band, glued to the last slide's foot, leaves a shorter page: the footer stands on
  // that page's foot, so the signature and an exam's arrow rise by the band and keep their
  // distance to the page's foot (the maintainer, 2026-10-29, TYTO-469).
  const page = sealed(context.size, sealOf(context));
  const area = { width: page.size.w, height: page.size.h };

  const role = roleOf(context);
  const dark = role !== 'lamina';
  const body =
    role === 'capa'
      ? cover(context, ink)
      : role === 'contracapa'
        ? backCover(context, ink)
        : exam(context, ink, area.height - FOOTER.arrowFromFoot - FOOTER.arrow.h);

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
      footer(context, area, dark ? ink('accent') : ink('title-ink'), dark),
      ...page.seal,
    ],
  });
}

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
    at(MARGIN, 438, rule(919, solid(ink('accent')), { thickness: 8 }, { name: 'rule' })),
    // The two title lines sit 3 px and the call 5 px under their layers' bounds: measured
    // against the reference art, at these sizes the face's capitals render that much higher.
    capitalsAt('abertura-1', first, {
      x: 84,
      capTop: 508,
      size: 140.9,
      weight: BOLD,
      color: ink('accent'),
    }),
    capitalsAt('abertura-2', second, {
      x: 79,
      capTop: 695,
      size: 137.2,
      weight: BOLD,
      color: ink('accent'),
    }),
    capitalsAt('chamada', slotText(context, 'chamada', DEFAULT_CALL), {
      x: 729,
      capTop: 686,
      size: 33.1,
      weight: BOLD,
      color: ink('accent'),
      lineHeight: 1.24,
    }),
    ...linkMark(971, 687, 1, ink('accent')),
    at(COVER_ARROW.x, COVER_ARROW.y, arrow(COVER_ARROW, ink('accent'))),
    ...corners(ink('accent')),
  ];
}

/** The cover's arrow under the call, the reference's. */
const COVER_ARROW = { x: 729, y: 846, w: 270, h: 34, shaft: 10 } as const;

/* --------------------------------------------------------------------- the back cover -- */

function backCover(context: TemplateContext, ink: Ink): NodeDraft[] {
  const contacts = slotText(context, 'contatos', DEFAULT_CONTACTS).split('\n');
  return [
    ...contacts.map((line, index) =>
      contactIcon(line, CONTACT.iconCentreX, CONTACT.firstCentreY + index * CONTACT.pitch, ink),
    ),
    kicker(context, ink),
    capitalsAt('fechamento', slotText(context, 'fechamento', DEFAULT_CLOSING), {
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
    capitalsAt('contatos', slotText(context, 'contatos', DEFAULT_CONTACTS), {
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
  const mark = words.includes('instagram') ? INSTAGRAM : words.includes('youtube') ? YOUTUBE : LINK;
  // Drawn at its own box's height: the geometry is in the reference's pixels.
  return at(
    centreX - mark.box.w / 2,
    centreY - mark.box.h / 2,
    icon(mark, mark.box.h, ink('accent'), `icone-${mark.name}`),
  );
}

/** A contact line's mark: third-party geometry held as data, drawn by the kit's `icon`. */
interface ContactMark extends Icon {
  readonly name: string;
}

/** Filled, a subpath inside another left as a hole: every contact mark is an outline cut out. */
const CUT_OUT = { paint: { kind: 'fill' }, fillRule: 'evenodd' } as const;

/** The link's capsules lie on a 45° rise. */
const RISING = { angle: 45 } as const;

/** A rounded square outline, a ring and a dot, 31 px, as the reference's. */
const INSTAGRAM: ContactMark = {
  name: 'instagram',
  box: { w: 31, h: 31 },
  d:
    roundedRectPath(0, 0, 31, 31, 9) +
    roundedRectPath(3, 3, 25, 25, 6.5) +
    circlePath(15.5, 15.5, 7.5) +
    circlePath(15.5, 15.5, 4.7) +
    circlePath(23.8, 7.2, 2),
  ...CUT_OUT,
};

/** A rounded rectangle with a play triangle cut out, 34 × 23 px, as the reference's. */
const YOUTUBE: ContactMark = {
  name: 'youtube',
  box: { w: 34, h: 23 },
  d: roundedRectPath(0, 0, 34, 23, 6) + 'M13.5 6.5L22.5 11.5L13.5 16.5Z',
  ...CUT_OUT,
};

/** Two interlocked capsule outlines on a 45° rise, 24 px, as the reference's. */
const LINK: ContactMark = {
  name: 'link',
  box: { w: 24, h: 24 },
  d:
    capsulePath(7.8, 16.2, 3.6, 4.6, RISING) +
    capsulePath(7.8, 16.2, 3.6, 2.2, RISING) +
    capsulePath(16.2, 7.8, 3.6, 4.6, RISING) +
    capsulePath(16.2, 7.8, 3.6, 2.2, RISING),
  ...CUT_OUT,
};

/* ---------------------------------------------------------------------- an exam slide -- */

/**
 * An exam: its first line is the title, a second line with no `:` the subtitle, and every
 * `Label: value` line after them one line of the card.
 *
 * Top to bottom, each piece below the one before: the title in lines of at most
 * `title-line-max` characters, the subtitle, and the card, which wraps its facts with
 * `card-padding` on every side and is centred on the slide. The three are one block, centred
 * up and down between the logo's foot and `footerTop`, whatever its height (the maintainer,
 * 2026-10-30); a block too tall for that starts as high as `highestTitleTop` allows. A title
 * line, a subtitle and seven facts put the block within 3 px of where the reference art has it.
 *
 * The arrow stands at `footerTop`: the reference's, or as much higher as the seal's band on the
 * last slide. Nothing shrinks to fit. A card whose foot passes it, the top of the arrow and the
 * signature, is reported as `W_TEMPLATE_OVERFLOW` on its `::lamina` (Tyto ADR 0058).
 */
function exam(context: TemplateContext, ink: Ink, footerTop: number): NodeDraft[] {
  const written = slideRichLines(context).map((line) => plain(line).trim());
  const [title = '', ...rest] = written;
  const subtitle =
    rest[0] !== undefined && labelOfText(rest[0]).label === undefined ? rest.shift() : undefined;
  const titleLines = wrapAt(
    keepTogetherText(title).toUpperCase(),
    numberValue(context, 'title-line-max', NUMBER_DEFAULTS['title-line-max']),
  );
  const block = examBlock(context, ink, titleLines, subtitle, rest);

  // Measured before it is placed: its height does not depend on where it starts.
  const middle = (EXAM.logoFoot + footerTop) / 2;
  const titleTop = Math.max(EXAM.highestTitleTop, Math.round(middle - block.height / 2));
  if (block.card) reportOverflow(context.report, titleTop + block.height, footerTop);
  return [at(0, titleTop - anchorOf(block.column).capTop, block.column)];
}

/**
 * The title, the subtitle and the card as one column, each below the one before and every gap
 * measured between capitals. `height` runs from the title's first capitals to the card's foot,
 * or to the last baseline when the exam writes no fact.
 */
function examBlock(
  context: TemplateContext,
  ink: Ink,
  titleLines: readonly string[],
  subtitle: string | undefined,
  facts: readonly string[],
): { readonly column: Block; readonly height: number; readonly card: boolean } {
  const slide = { width: SLIDE_WIDTH, height: Infinity };
  const heading = (name: string, words: string, size: number, color: string): Block =>
    capText(
      plainRuns(words, { font: FACE, size, weight: BLACK, color }),
      slide,
      { size, align: 'center' },
      // Never cut at the box: an accented capital on the first line rises above the line's box.
      { name, text: { overflow: 'grow' } },
    );
  const laid = card(context, ink, facts);
  const column = stackIn(
    slide,
    [
      heading('titulo', titleLines.join('\n'), EXAM.titleSize, ink('title-ink')),
      ...(subtitle === undefined
        ? []
        : [
            {
              item: heading(
                'subtitulo',
                subtitle.toUpperCase(),
                EXAM.subtitleSize,
                ink('subtitle-ink'),
              ),
              gapAbove: EXAM.subtitleGap,
            },
          ]),
      // The card's anchor is its facts' capitals, `card-padding` under its top edge.
      ...(laid === undefined ? [] : [{ item: laid.block, gapAbove: EXAM.cardGap + laid.padding }]),
    ],
    { measureFrom: 'capitals' },
    { name: 'concurso' },
  );
  const anchor = anchorOf(column);
  return {
    column,
    height: (laid === undefined ? anchor.baseline : column.height) - anchor.capTop,
    card: laid !== undefined,
  };
}

/** An exam slide's numbers, the reference art's: sizes, where the title starts, the gaps. */
const EXAM = {
  /** The foot of the logo, drawn 68 px tall from 67: the top of the band the block centres in. */
  logoFoot: 67 + 68,
  /** The highest a tall block's title may start: a card gap below the logo. */
  highestTitleTop: 67 + 68 + 66,
  titleSize: 72,
  subtitleSize: 40,
  /**
   * From the title's last baseline to the subtitle's capitals: the subtitle's capitals start one
   * title line's pitch below the last title line's.
   */
  subtitleGap: 72 * (1 - CAP_HEIGHT),
  /** From the foot of the subtitle's capitals to the card's top edge. */
  cardGap: 66,
  cardRadius: 32,
  factSize: 40,
  factLineHeight: 1.2,
  /** A glyph's advance, in em, for when nothing can be measured (a test, CI without the face). */
  estimatedAdvance: 0.55,
} as const;

/**
 * The card and its facts, or nothing when the exam writes no fact. The kit hugs the facts'
 * widest line (`huggedText`) and pads the card from their first capitals, from the foot of the
 * last line's capitals and from the widest line's sides (`paddedCard`), each by `card-padding`.
 */
function card(
  context: TemplateContext,
  ink: Ink,
  facts: readonly string[],
): { readonly block: Block; readonly padding: number } | undefined {
  const fact = { font: FACE, size: EXAM.factSize } as const;
  // The kit glues a currency sign to its amount (TYTO-593) and finds the label at the first
  // colon (TYTO-594); a line without a label is drawn whole in the label's ink. The glue between
  // a connector and the word after it is this template's own vocabulary, handed in.
  const [first, ...others] = labelValueRuns(
    facts,
    {
      label: { ...fact, weight: MEDIUM, color: ink('label-ink') },
      value: { ...fact, weight: LIGHT, color: ink('value-ink') },
    },
    { unlabelled: 'label', labelGap: 'as-written', keepTogether: 'yes' },
    { value: glueConnectors },
  );
  if (first === undefined) return undefined;

  const padding = numberValue(context, 'card-padding', NUMBER_DEFAULTS['card-padding']);
  const widest =
    numberValue(context, 'card-max-width', NUMBER_DEFAULTS['card-max-width']) - padding * 2;
  const words = huggedText(
    [first, ...others],
    widest,
    {
      size: EXAM.factSize,
      lineHeight: EXAM.factLineHeight,
      estimatedAdvance: EXAM.estimatedAdvance,
    },
    { measure: context.measure, name: 'fatos', text: { overflow: 'grow' } },
  );
  const surface = paddedCard(
    words,
    { fill: solid(ink('card')), shadow: SHADOW.color },
    {
      paddingTop: padding,
      paddingRight: padding,
      paddingBottom: padding,
      paddingLeft: padding,
      radius: EXAM.cardRadius,
      measureFrom: 'capitals',
      shadowX: SHADOW.x,
      shadowY: SHADOW.y,
      shadowBlur: SHADOW.blur,
    },
    { name: 'cartao' },
  );
  // Centred on the slide on a whole pixel, as the reference's: a centred stack would leave a
  // card of odd width on a half pixel.
  const left = Math.round((SLIDE_WIDTH - surface.width) / 2);
  return { block: inset({ item: surface, padding: [0, 0, 0, left] }), padding };
}

/**
 * The card's drop shadow, the reference's: black at 35 %, 8 px away at 120° (so 4 px right and
 * 6.9 px down). Photoshop's 16 px size fades out within 18 px of the edge; a blur of 8
 * does the same here, measured beside and below the card (10 still reached 25 px).
 */
const SHADOW = { x: 4, y: 6.9, blur: 8, color: { r: 0, g: 0, b: 0, a: 0.35 } } as const;

/**
 * Short words that read as the start of what follows them: a line never ends on one, in the
 * title or on the card (the maintainer, 2026-10-30). A one-character word counts too.
 */
const CONNECTORS = new Set([
  'a',
  'à',
  'ao',
  'as',
  'às',
  'aos',
  'o',
  'os',
  'e',
  'ou',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'na',
  'no',
  'nas',
  'nos',
  'com',
  'para',
  'por',
]);

const isConnector = (word: string): boolean =>
  [...word].length === 1 || CONNECTORS.has(word.toLowerCase());

/** A dash standing between spaces: it stays at the end of the word before it. */
const isDash = (word: string): boolean => /^[-–—]$/.test(word);

/**
 * Words split at the spaces a line may break at. A no-break space is not one: the kit's
 * `keepTogetherText` wrote it between a currency sign and its amount (TYTO-593), and the
 * two halves stay one word.
 */
const wordsOf = (text: string): string[] =>
  text.split(/[^\S\u00a0]+/).filter((piece) => piece !== '');

/**
 * The words in the pieces a line may break between: a connector (or a lone character) travels
 * with the word after it, and a dash with the word before it.
 */
function unbreakable(words: readonly string[]): string[][] {
  const pieces: string[][] = [];
  let pending: string[] = [];
  for (const word of words) {
    const last = pieces[pieces.length - 1];
    if (isDash(word) && pending.length === 0 && last !== undefined) {
      last.push(word);
      continue;
    }
    pending.push(word);
    if (!isConnector(word) || isDash(word)) {
      pieces.push(pending);
      pending = [];
    }
  }
  if (pending.length > 0) {
    const last = pieces[pieces.length - 1];
    if (last === undefined) pieces.push(pending);
    else last.push(...pending);
  }
  return pieces;
}

/**
 * A card fact with no-break spaces where a line must not break, so the renderer's own wrap
 * never leaves a connector, a lone character or a dash at a line's edge.
 */
export function glueConnectors(text: string): string {
  const leading = /^\s/.test(text) ? ' ' : '';
  const words = wordsOf(text);
  return (
    leading +
    unbreakable(words)
      .map((piece) => piece.join(NO_BREAK_SPACE))
      .join(' ')
  );
}

/** Past this many pieces a title is wrapped greedily: trying every break costs 2^pieces. */
const MOST_PIECES_TO_BALANCE = 16;

/**
 * Words in lines of at most `limit` characters, spaces counted: as few lines as greedy filling
 * makes, with the breaks that leave the longest line shortest, so no line holds a lone word like
 * "(PI)" under a full one (the maintainer, 2026-10-30). No line ends on a connector or starts
 * with a dash. A word longer than the limit stands on a line of its own rather than being cut.
 */
export function wrapAt(words: string, limit: number): string[] {
  // The template's own word logic, pending a kit piece (TYTO-906): the kit's `balance` breaks by
  // measured width and answers nothing without faces, where this counts characters.
  const pieces = unbreakable(wordsOf(words)).map((piece) => piece.join(' '));
  if (pieces.length === 0) return [''];
  const greedy = fill(pieces, limit);
  if (pieces.length > MOST_PIECES_TO_BALANCE) return greedy;

  let best = greedy;
  let bestScore = score(greedy);
  // Bit `i` set: a line breaks after piece `i`.
  for (let breaks = 0; breaks < 2 ** (pieces.length - 1); breaks += 1) {
    const lines: string[] = [];
    let line = pieces[0]!;
    for (let index = 1; index < pieces.length; index += 1) {
      if (breaks & (2 ** (index - 1))) {
        lines.push(line);
        line = pieces[index]!;
      } else {
        line = `${line} ${pieces[index]!}`;
      }
    }
    lines.push(line);
    if (lines.length !== greedy.length) continue;
    if (lines.some((text) => text.length > limit && text.includes(' '))) continue;
    const candidate = score(lines);
    if (
      candidate.longest < bestScore.longest ||
      (candidate.longest === bestScore.longest && candidate.ragged < bestScore.ragged)
    ) {
      best = lines;
      bestScore = candidate;
    }
  }
  return best;
}

/** Greedy filling: each piece on the line before it while the line stays within `limit`. */
function fill(pieces: readonly string[], limit: number): string[] {
  const result: string[] = [];
  for (const piece of pieces) {
    const last = result[result.length - 1];
    if (last !== undefined && last.length + 1 + piece.length <= limit) {
      result[result.length - 1] = `${last} ${piece}`;
    } else {
      result.push(piece);
    }
  }
  return result;
}

/** The longest line, then how far the others fall short of it, squared. */
function score(lines: readonly string[]): { longest: number; ragged: number } {
  const longest = Math.max(...lines.map((line) => line.length));
  return {
    longest,
    ragged: lines.reduce((sum, line) => sum + (longest - line.length) ** 2, 0),
  };
}

/* ------------------------------------------------------------------------ the shared -- */

interface ArrowSize {
  readonly w: number;
  /** The head's height; the shaft is centred on it. */
  readonly h: number;
  readonly shaft: number;
}

/** The next-slide arrow's head, as a share of its height: the reference's. */
const ARROW_HEAD_RATIO = 0.62;

/** The arrow pointing to the next slide: a shaft and a triangular head. */
function arrow(size: ArrowSize, color: string): Block {
  return arrowShape(
    { w: size.w, h: size.h },
    solid(color),
    { shaft: size.shaft, headRatio: ARROW_HEAD_RATIO },
    { name: 'seta' },
  );
}

/** The two corner marks of the dark slides, each an L of 5 px arms in a 16 px square. */
const CORNERS = {
  size: 16,
  thickness: 5,
  marks: [
    { name: 'canto-1', corner: 'top-left', x: 78, y: 238 },
    { name: 'canto-2', corner: 'bottom-right', x: 985, y: 1118 },
  ],
} as const;

function corners(color: string): NodeDraft[] {
  return CORNERS.marks.map(({ name, corner, x, y }) =>
    at(
      x,
      y,
      cornerBracket(CORNERS.size, solid(color), { thickness: CORNERS.thickness, corner }, { name }),
    ),
  );
}

/** The small mark of two squares — one filled, one outlined — drawn at a scale of the cover's. */
function linkMark(x: number, y: number, scale: number, color: string): NodeDraft[] {
  const s = (value: number) => Math.round(value * scale * 10) / 10;
  const outline = { paint: solid(color), width: 1, align: 'inside' } as const;
  return [
    at(x + s(12), y, shape({ w: s(11), h: s(11) }, solid(color), {}, { name: 'marca-cheia' })),
    at(
      x,
      y + s(11),
      shape({ w: s(12), h: s(13) }, undefined, {}, { outline, name: 'marca-vazada' }),
    ),
  ];
}

/** The tiny tracked words at the top of the cover and the back cover: the title on one line. */
function kicker(context: TemplateContext, ink: Ink): NodeDraft {
  const words = slotText(context, 'abertura', DEFAULT_OPENING).replace(/\s+/g, ' ').trim();
  return capitalsAt('rubrica', words, {
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

/**
 * The signature's line, the reference's text layer: its size and tracking, the baselines, and
 * the paragraph's centre. It is placed by its baseline, not by a cap top: a handle (`@`, lower
 * case) has no capitals, so the layer's bounds start at whatever glyph is tallest.
 */
export const SIGNATURE = {
  size: 24.4,
  letterSpacing: 4.9,
  /** On the cover and the back cover. */
  baseline: 1232.8,
  /** On an exam slide. */
  examBaseline: 1235.8,
  /**
   * The paragraph's centre in the reference: the exam layer's, 539.55. The cover's layer says
   * 539.75, but measured against the reference art 539.55 differs in fewer pixels on all three
   * slides (126, 864, 126 of 10,323 against 131, 1,072, 131): the letters land on whole pixels.
   */
  centre: 539.55,
} as const;

/**
 * An exam's arrow in the footer, the reference's: its foot 108 px above the page's and its tip
 * 81 px from the right edge, which on a page with no seal is the arrow's top at 1217.
 */
const FOOTER = {
  arrow: { w: 151, h: 25, shaft: 7 },
  arrowFromFoot: 108,
  arrowInset: 81,
} as const;

/**
 * The footer over `page`, the slide less the seal's band: the brand's signature, and on an exam
 * slide the arrow at its right. The kit stands both on the page's foot.
 */
function footer(context: TemplateContext, page: Area, color: string, dark: boolean): NodeDraft {
  const baseline = dark ? SIGNATURE.baseline : SIGNATURE.examBaseline;
  const line = signatureLine(
    signatureOf(context.brand),
    // The area spans the slide's left edge to twice the reference's centre, so the line centres
    // there. Tyto's export centres a tracked line by its ink (TYTO-491): no half tracking added.
    { width: 2 * SIGNATURE.centre, height: Infinity },
    { font: FACE, weight: LIGHT, color },
    { size: SIGNATURE.size, letterSpacing: SIGNATURE.letterSpacing },
    { name: 'assinatura', text: { overflow: 'grow' } },
  );
  return at(
    0,
    0,
    carouselFooter(
      page,
      { signature: line, ...(dark ? {} : { trailing: arrow(FOOTER.arrow, color) }) },
      {
        signatureFromFoot: SLIDE_HEIGHT - (baseline - CAP_HEIGHT * SIGNATURE.size),
        trailingFromFoot: FOOTER.arrowFromFoot,
        trailingInset: FOOTER.arrowInset,
      },
      { name: 'rodape' },
    ),
  );
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

/** A plain text, one run per line, as the kit's block placed by the top of its capitals. */
function capitalsAt(name: string, words: string, placed: Placed): NodeDraft {
  const style = { font: FACE, size: placed.size, weight: placed.weight, color: placed.color };
  const set = capText(
    plainRuns(words, style),
    { width: placed.width ?? Infinity, height: Infinity },
    {
      size: placed.size,
      lineHeight: placed.lineHeight ?? 1,
      letterSpacing: placed.letterSpacing ?? 0,
      align: placed.align ?? 'left',
    },
    // Never cut at the box: at a line height of 1 an accented capital on the first line
    // (the Á of MONGAGUÁ) rises above the line's box, and a clipped box drops the accent.
    { name, text: { overflow: 'grow' } },
  );
  return at(placed.x, placed.capTop - anchorOf(set).capTop, set);
}
