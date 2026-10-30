import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import type { CompileTemplateOptions } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CALL,
  DEFAULT_CLOSING,
  DEFAULT_OPENING,
  NUMBER_DEFAULTS,
  build,
  hug,
  keepTogether,
  wrapAt,
} from './template.js';

import type {
  AssetResolver,
  Frame,
  RectNode,
  SceneNode,
  TextMeasurement,
  TextNode,
  TextRun,
} from '@tyto/core';

/**
 * The carousel's rules, asserted on the scene: which slide the brief's marks make, what each
 * slide draws, the words the brief replaces, and that every text starts inside the slide.
 * Never a pixel size: CI has no CircularXX, and positions are the reference's, checked against
 * the reference art outside this repository.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/concursos-abertos/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

/** A seal the brief's `selo:` finds whatever it names; no file is read. */
const anySeal: AssetResolver = {
  base: '.',
  resolve: (reference) =>
    Promise.resolve({ id: reference, source: 'file', path: reference, hash: 'selo' }),
};

async function compiled(
  brief: string,
  options: Pick<CompileTemplateOptions, 'assets' | 'values'> = {},
) {
  const result = await compileTemplate({
    brief: brief.startsWith('---')
      ? brief
      : `---\ntemplate: concursos-abertos\nformats: [grid]\n---\n${brief}`,
    template,
    formats,
    ...options,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result;
}

async function slides(brief: string): Promise<Frame[]> {
  const result = await compiled(brief);
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
}

/** The `W_TEMPLATE_OVERFLOW` warnings a brief compiles with, their messages. */
async function overflows(
  brief: string,
  options: Pick<CompileTemplateOptions, 'assets' | 'values'> = {},
): Promise<string[]> {
  const result = await compiled(brief, options);
  return result.diagnostics
    .filter((item) => item.code === 'W_TEMPLATE_OVERFLOW')
    .map((item) => item.message);
}

function nodes(parent: { readonly children: readonly SceneNode[] }): SceneNode[] {
  return parent.children.flatMap((node) => [node, ...('children' in node ? nodes(node) : [])]);
}

const texts = (frame: Frame): TextNode[] =>
  nodes(frame).filter((node): node is TextNode => node.kind === 'text');

const named = (frame: Frame, name: string): string | undefined => {
  const node = texts(frame).find((item) => item.name === name);
  return node?.runs.map((part) => (part.kind === 'text' ? part.text : '\n')).join('');
};

const CAROUSEL = [
  '::lamina {capa}',
  '',
  '::lamina',
  '  Prefeitura de Vale Alto',
  '  Professor',
  '  Banca: Quintex',
  '  Vagas: 1.200',
  '',
  '::lamina {contracapa}',
].join('\n');

describe('the three slides', () => {
  it('draws the cover, the exam and the back cover from the marks on each lamina', async () => {
    const [cover, exam, back] = await slides(CAROUSEL);

    expect(named(cover!, 'abertura-1')).toBe('CONCURSOS');
    expect(named(cover!, 'abertura-2')).toBe('ABERTOS');
    expect(named(cover!, 'chamada')).toBe(DEFAULT_CALL);
    expect(named(exam!, 'titulo')).toBe('PREFEITURA\nDE VALE ALTO');
    expect(named(exam!, 'subtitulo')).toBe('PROFESSOR');
    expect(named(exam!, 'fatos')).toBe('Banca: Quintex\nVagas: 1.200');
    expect(named(back!, 'fechamento')).toBe(DEFAULT_CLOSING);
  });

  it('reads a line with a colon as a fact, not as the subtitle', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Banca: Ômegas\n  Vagas: 3.000');

    expect(named(exam!, 'titulo')).toBe('SEDUC QX');
    expect(named(exam!, 'subtitulo')).toBeUndefined();
    expect(named(exam!, 'fatos')).toBe('Banca: Ômegas\nVagas: 3.000');
  });

  it("replaces the cover's and the back cover's words with the brief's", async () => {
    const [cover, back] = await slides(
      [
        '::abertura',
        '  CONCURSOS',
        '  PREVISTOS',
        '::chamada',
        '  FIQUE DE OLHO!',
        '::fechamento',
        '  Siga para mais.',
        '::lamina {capa}',
        '::lamina {contracapa}',
      ].join('\n'),
    );

    expect(named(cover!, 'abertura-2')).toBe('PREVISTOS');
    expect(named(cover!, 'chamada')).toBe('FIQUE DE OLHO!');
    expect(named(cover!, 'rubrica')).toBe('CONCURSOS PREVISTOS');
    expect(named(back!, 'fechamento')).toBe('Siga para mais.');
    expect(DEFAULT_OPENING).toBe('CONCURSOS\nABERTOS');
  });

  it('starts every text inside its slide', async () => {
    for (const frame of await slides(CAROUSEL)) {
      for (const node of texts(frame)) {
        expect(node.transform.x, node.name).toBeGreaterThanOrEqual(0);
        expect(node.transform.y, node.name).toBeGreaterThanOrEqual(0);
        expect(node.transform.x + (node.box.w ?? 0), node.name).toBeLessThanOrEqual(1080);
        expect(node.transform.y, node.name).toBeLessThan(1350);
      }
    }
  });

  it("sets the signature on the reference's baseline, centred where its letters are", async () => {
    // Measured against the reference art (TYTO-474, TYTO-492): the box centres on the
    // reference's paragraph centre, 539.55, and its top puts the baseline on the reference's,
    // 1232.8 on the cover and the back cover and 1235.8 on an exam.
    const [cover, exam, back] = await slides(CAROUSEL);

    for (const [frame, top] of [
      [cover!, 1214.5],
      [exam!, 1217.5],
      [back!, 1214.5],
    ] as const) {
      const signature = texts(frame).find((node) => node.name === 'assinatura')!;
      expect(signature.transform.x).toBeCloseTo(0, 6);
      expect(signature.box.w).toBeCloseTo(1079.1, 6);
      expect(signature.transform.y).toBeCloseTo(top, 6);
    }
  });
});

describe('the limits of an exam slide', () => {
  const card = (frame: Frame): RectNode =>
    nodes(frame).find((node): node is RectNode => node.kind === 'rect' && node.name === 'card')!;

  it('breaks a title between words into lines of at most 16 characters, spaces counted', async () => {
    const [exam] = await slides(
      '::lamina\n  Tribunal Regional do Trabalho da 2a Regiao\n  Banca: FCC',
    );
    const lines = named(exam!, 'titulo')!.split('\n');

    expect(lines).toEqual(['TRIBUNAL', 'REGIONAL', 'DO TRABALHO', 'DA 2A REGIAO']);
    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(16);
  });

  it('balances the lines, so a short last word never stands alone under a full line', () => {
    expect(wrapAt('FRANCISCO MACEDO (PI)', 16)).toEqual(['FRANCISCO', 'MACEDO (PI)']);
  });

  it('never ends a line on a connector nor starts one with a dash', () => {
    expect(wrapAt('UNIVERSIDADE FEDERAL DO CEARÁ — UFC (CE)', 16)).toEqual([
      'UNIVERSIDADE',
      'FEDERAL',
      'DO CEARÁ —',
      'UFC (CE)',
    ]);
  });

  it('glues what must not break on the card with no-break spaces', () => {
    expect(keepTogether(' Fundamental, Médio e Superior')).toBe(
      ' Fundamental, Médio e\u00a0Superior',
    );
    expect(keepTogether(' até R$ 4.318,00 - mais auxílio')).toBe(
      ' até R$\u00a04.318,00\u00a0- mais auxílio',
    );
  });

  it("glues the card's facts, so the renderer never leaves a lone `e` at a line's end", async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Nível: Fundamental, Médio e Superior');

    expect(named(exam!, 'fatos')).toBe('Nível: Fundamental, Médio e\u00a0Superior');
  });

  it('keeps a word longer than the limit whole, on a line of its own', () => {
    expect(wrapAt('DESEMBARGADORIAS DO RS', 16)).toEqual(['DESEMBARGADORIAS', 'DO RS']);
  });

  it('hugs short facts, and never grows wider than the title can be', async () => {
    const [short, long] = await slides(
      [
        '::lamina',
        '  SEDUC QX',
        '  Vagas: 85',
        '::lamina',
        '  SEDUC QX',
        '  Remuneração: R$ 7.181,41 mais auxílio alimentação de R$ 1.200,00',
      ].join('\n'),
    );

    expect(card(short!).size.w).toBeLessThan(card(long!).size.w);
    expect(card(long!).size.w).toBeLessThanOrEqual(NUMBER_DEFAULTS['card-max-width']);
  });

  /** A measurement as the app's would give it: `width` the widest laid-out line. */
  const measured = (width: number, lines: number): TextMeasurement => ({
    runs: [{ kind: 'text', text: 'Cargos: Professor Assistente', style: {} } as TextRun],
    lines,
    width,
    height: lines * 48,
    scale: 1,
    overflow: 0,
  });

  it('hugs the widest line a wrap leaves, not the box it wrapped in', () => {
    // UNIFESP: 'Cargos: Professor Assistente Substituto' is 760 px on one line, past the
    // 652 px the card may hold; wrapped, its widest line is 'Remuneração: até R$ 5.037,78'.
    const widths: (number | undefined)[] = [];
    const fit = hug((w) => {
      widths.push(w);
      return w === undefined ? measured(760.4, 6) : measured(538.2, 7);
    }, 652);

    expect(widths).toEqual([undefined, 652]);
    expect(fit?.width).toBe(539);
    expect(fit?.lines).toBe(7);
    expect(fit?.wrappedRuns).toHaveLength(1);
  });

  it('leaves facts that fit on one line each as they were', () => {
    const fit = hug((w) => (w === undefined ? measured(420.3, 4) : measured(0, 0)), 652);

    expect(fit).toEqual({ width: 421, lines: 4 });
  });

  it('puts the same gap on the left and the right of the widest line', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Banca: Ômegas\n  Vagas: 3.000');
    const box = card(exam!);
    const facts = nodes(exam!).find((node) => node.name === 'fatos')!;
    const left = facts.transform.x - box.transform.x;
    const inner = (facts as TextNode).box!.w! - 1;

    expect(box.size.w - left - inner).toBe(left);
    expect(left).toBe(NUMBER_DEFAULTS['card-padding']);
  });

  const tall = (titleLines: number, factCount: number): string =>
    [
      '::lamina',
      `  ${Array.from({ length: titleLines }, () => 'Concurso Vale').join(' ')}`,
      '  Professor',
      ...Array.from({ length: factCount }, (_, index) => `  Fato ${index + 1}: valor`),
    ].join('\n');

  it('keeps the block centred, so three more title lines move the card down by half', async () => {
    const [one, four] = await slides(
      '::lamina\n  SEDUC QX\n  Vagas: 85\n::lamina\n  Tribunal Regional do Trabalho da 2a Regiao\n  Vagas: 85',
    );

    expect(card(four!).transform.y - card(one!).transform.y).toBe((3 * 72) / 2);
  });

  it('centres the block between the foot of the logo, at 135, and the arrow', async () => {
    const [exam] = await slides(tall(1, 7));
    const title = nodes(exam!).find((node) => node.name === 'titulo')!;
    const box = card(exam!);
    const foot = box.transform.y + box.size.h;
    const titleTop = foot - blockHeight(1, 7);

    expect(Math.abs((titleTop + foot) / 2 - (135 + 1217) / 2)).toBeLessThanOrEqual(0.5);
    expect(title.transform.y).toBeLessThan(titleTop);
  });

  // Measured on a render (TYTO-469): with a subtitle the block, from the title's capitals to the
  // card's foot, is 514.7 px for one title line and five facts, plus 72 a title line and 48 a
  // fact. It centres between 135 and the arrow at 1217, and a block taller than that room
  // starts at 201, a card gap under the logo.
  const blockHeight = (titleLines: number, factCount: number): number =>
    514.7 + 72 * (titleLines - 1) + 48 * (factCount - 5);

  it('reports a card that runs into the arrow and the signature, by how far', async () => {
    const reports = await overflows(
      ['::lamina', '  SEDUC QX', '  Vagas: 85', tall(4, 12)].join('\n'),
    );

    expect(reports).toHaveLength(1);
    // 201 + 1066.7 = 1267.7, 51 px past 1217.
    expect(reports[0]).toMatch(/lamina-2.*runs 51px past/);
  });

  it('says nothing when the card stops above the arrow', async () => {
    expect(await overflows(tall(4, 10))).toEqual([]);
    expect(await overflows(tall(1, 15))).toEqual([]);
    expect(await overflows(read('../templates/concursos-abertos/examples/semana.brief'))).toEqual(
      [],
    );
  });

  it('stops the card above the lifted arrow on an exam that is the last slide', async () => {
    const sealed = (exam: string) =>
      `---\ntemplate: concursos-abertos\nformats: [grid]\nselo: ./selo.png\n---\n${exam}`;

    // 922.7 tall from 201 ends at 1123.7: under the arrow at 1217, 47 px past it at 1077.
    expect(await overflows(sealed(tall(4, 9)), { assets: anySeal })).toEqual([
      expect.stringMatching(/runs 47px past/),
    ]);
    expect(await overflows(sealed(tall(1, 5)), { assets: anySeal })).toEqual([]);
  });
});

describe('the seal', () => {
  const sealedSlides = async (brief: string): Promise<Frame[]> => {
    const result = await compiled(
      `---\ntemplate: concursos-abertos\nformats: [grid]\nselo: ./selo.png\n---\n${brief}`,
      { assets: anySeal },
    );
    return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
  };
  const top = (frame: Frame, name: string): number =>
    nodes(frame).find((node) => node.name === name)!.transform.y;
  const exam = '::lamina\n  SEDUC QX\n  Vagas: 85';

  it("lifts the back cover's signature by the band, clear of it", async () => {
    const [open] = await slides('::lamina {contracapa}');
    const [closed] = await sealedSlides('::lamina {contracapa}');

    expect(nodes(closed!).some((node) => node.name === 'seal')).toBe(true);
    expect(top(open!, 'assinatura') - top(closed!, 'assinatura')).toBe(140);
    expect(top(closed!, 'assinatura') + 24.4).toBeLessThan(1350 - 140);
  });

  it("lifts an exam's arrow and signature when the exam is the last slide", async () => {
    const [open] = await slides(exam);
    const [closed] = await sealedSlides(exam);

    expect(top(open!, 'seta') - top(closed!, 'seta')).toBe(140);
    expect(top(open!, 'assinatura') - top(closed!, 'assinatura')).toBe(140);
  });

  it('leaves every slide but the last where the reference has it', async () => {
    const [cover, sealedExam] = await sealedSlides(
      `::lamina {capa}\n\n${exam}\n\n::lamina {contracapa}`,
    );
    const [openCover, openExam] = await slides(`::lamina {capa}\n\n${exam}`);

    expect(top(cover!, 'assinatura')).toBe(top(openCover!, 'assinatura'));
    expect(top(sealedExam!, 'seta')).toBe(top(openExam!, 'seta'));
    expect(top(sealedExam!, 'seta')).toBe(1217);
  });
});

describe('the slide count', () => {
  /** A carousel of `count` slides: a cover, exams, a back cover. */
  const carousel = (count: number): string =>
    [
      '---\ntemplate: concursos-abertos\nformats: [grid]\n---\n::lamina {capa}',
      ...Array.from(
        { length: count - 2 },
        (_, index) => `::lamina\n  Exam ${index + 1}\n  Vagas: 1`,
      ),
      '::lamina {contracapa}',
    ].join('\n\n');

  it("compiles twenty slides, Instagram's carousel limit, cover and back cover counted", async () => {
    const result = await compiled(carousel(20));

    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(result.value.scene.artworks.flatMap((artwork) => artwork.frames)).toHaveLength(20);
  });

  it('refuses a twenty-first slide, pointing at its `::lamina`', async () => {
    const brief = carousel(21);
    const result = await compileTemplate({ brief, template, formats });
    const errors = result.ok
      ? result.diagnostics.filter((item) => item.severity === 'error')
      : result.error;

    expect(errors).toHaveLength(1);
    const [refusal] = errors;
    expect(refusal?.code).toBe('E_BAD_SLOT_VALUE');
    expect(refusal?.message).toContain('allows 20');
    const twentyFirst = brief.lastIndexOf('::lamina {contracapa}');
    expect(refusal?.range?.start).toBe(twentyFirst);
  });
});
