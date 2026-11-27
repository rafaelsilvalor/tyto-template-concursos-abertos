import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, SAUDE_COLOR_DEFAULTS, build, buildSaude } from '../src/template.js';

import type { Frame, SceneNode, SuppliedValues, TextNode } from '@tyto/core';

/**
 * The highlights of an exam slide, read through the kit (TYTO-554), as the scene draws them:
 *
 * - in a fact's value, `**…**` is Bold in `destaque`; a label, and a line with no label, keep
 *   their own colour and weight, and a `{cor:…}` mark changes nothing there;
 * - in the title and the subtitle, `**…**` paints `destaque` and `{cor:destaque}`,
 *   `{cor:destaque-2}` or `{cor:destaque-3}` its colour, the heading's weight kept;
 * - the cover and the back cover take none.
 *
 * `destaque`, `destaque-2` and `destaque-3` default to each template's label colour.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

const BUILDS = { 'concursos-abertos': build, 'concursos-abertos-saude': buildSaude } as const;
type Name = keyof typeof BUILDS;

function templateOf(name: Name) {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  return defineTemplate(manifest.value, BUILDS[name]);
}

interface Given {
  readonly template?: Name;
  /** Lines of frontmatter, as a brief sets a highlight: `destaque: '#e30613'`. */
  readonly frontmatter?: readonly string[];
  /** Values a configuration supplies. */
  readonly values?: SuppliedValues;
}

async function slides(body: string, given: Given = {}): Promise<Frame[]> {
  const name = given.template ?? 'concursos-abertos';
  const result = await compileTemplate({
    brief: [
      `---\ntemplate: ${name}\nformats: [grid]`,
      ...(given.frontmatter ?? []),
      '---',
      body,
    ].join('\n'),
    template: templateOf(name),
    formats,
    ...(given.values === undefined ? {} : { values: given.values }),
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
}

const texts = (parent: Frame | SceneNode): TextNode[] =>
  'children' in parent
    ? parent.children.flatMap((node) => [...(node.kind === 'text' ? [node] : []), ...texts(node)])
    : [];

const hex = (paint: unknown): string => {
  const { color } = paint as { color: { r: number; g: number; b: number } };
  return `#${[color.r, color.g, color.b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
};

/** A text's runs as `[words, weight, colour]`, a line break as `'/'`. */
type Look = readonly [string, number, string] | '/';
const looksOf = (node: TextNode): Look[] =>
  node.runs.map((part) =>
    part.kind === 'text' ? ([part.text, part.weight, hex(part.color)] as const) : '/',
  );
const looks = (frame: Frame, name: string): Look[] =>
  looksOf(texts(frame).find((node) => node.name === name)!);

const RED = '#e30613';
const { 'label-ink': LABEL, 'value-ink': VALUE, 'title-ink': TITLE } = COLOR_DEFAULTS;
const SUBTITLE = COLOR_DEFAULTS['subtitle-ink'];

describe("the highlights of a fact's value", () => {
  it("paints `**…**` Bold in `destaque`, whose default is the label's colour", async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Vagas: **300** imediatas');

    expect(looks(exam!, 'fatos')).toEqual([
      ['Vagas:', 500, LABEL],
      [' ', 300, VALUE],
      ['300', 700, LABEL],
      [' imediatas', 300, VALUE],
    ]);
  });

  it("paints it in the `destaque` a brief's frontmatter sets, the label left its own", async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Vagas: **300**', {
      frontmatter: [`destaque: '${RED}'`],
    });

    expect(looks(exam!, 'fatos')).toEqual([
      ['Vagas:', 500, LABEL],
      [' ', 300, VALUE],
      ['300', 700, RED],
    ]);
  });

  it('paints it in the `destaque` a configuration supplies', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Vagas: **300**', {
      values: { destaque: { value: RED } },
    });

    expect(looks(exam!, 'fatos')).toContainEqual(['300', 700, RED]);
  });

  it('leaves a label, and a line with no label, as they are whatever they mark', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  **Banca:** Alfa\n  **Prova** às 14:00', {
      frontmatter: [`destaque: '${RED}'`],
    });

    expect(looks(exam!, 'fatos')).toEqual([
      ['Banca:', 500, LABEL],
      [' Alfa', 300, VALUE],
      '/',
      ['Prova às 14:00', 500, LABEL],
    ]);
  });

  it('keeps the highlight on its words where the card glues them with no-break spaces', async () => {
    const [exam] = await slides(
      '::lamina\n  SEDUC QX\n  Nível: Fundamental, **Médio e Superior**\n  Salário: até **R$ 4.318,00**',
    );

    expect(looks(exam!, 'fatos')).toEqual([
      ['Nível:', 500, LABEL],
      [' Fundamental, ', 300, VALUE],
      ['Médio e Superior', 700, LABEL],
      '/',
      ['Salário:', 500, LABEL],
      [' até ', 300, VALUE],
      ['R$ 4.318,00', 700, LABEL],
    ]);
  });

  it('takes no `{cor:…}` mark: the value stays one run in its own ink', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Vagas: {cor:destaque-2}300{/}', {
      frontmatter: [`destaque-2: '${RED}'`],
    });

    expect(looks(exam!, 'fatos')).toEqual([
      ['Vagas:', 500, LABEL],
      [' 300', 300, VALUE],
    ]);
  });

  it("defaults to the health template's own label colour there", async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Vagas: **300**', {
      template: 'concursos-abertos-saude',
    });

    expect(looks(exam!, 'fatos')).toContainEqual(['300', 700, SAUDE_COLOR_DEFAULTS['label-ink']]);
  });
});

describe("the highlights of an exam's title and subtitle", () => {
  it('paints `**…**` in `destaque` at the heading weight, on the line its word wraps to', async () => {
    const marked = '::lamina\n  Tribunal **Regional** do Trabalho da 2a Regiao\n  Vagas: 85';
    const [exam] = await slides(marked);
    const [plain] = await slides(marked.replaceAll('**', ''));

    expect(looks(exam!, 'titulo')).toEqual([
      ['TRIBUNAL', 900, TITLE],
      '/',
      ['REGIONAL', 900, LABEL],
      '/',
      ['DO TRABALHO', 900, TITLE],
      '/',
      ['DA 2A REGIAO', 900, TITLE],
    ]);
    // The same lines as the title with no mark: a highlight never moves a break.
    expect(looks(exam!, 'titulo').map((look) => look[0])).toEqual(
      looks(plain!, 'titulo').map((look) => look[0]),
    );
  });

  it('paints `**…**` in a subtitle in the `destaque` a brief sets, its weight kept', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Professor de **Artes**\n  Vagas: 85', {
      frontmatter: [`destaque: '${RED}'`],
    });

    expect(looks(exam!, 'subtitulo')).toEqual([
      ['PROFESSOR DE ', 900, SUBTITLE],
      ['ARTES', 900, RED],
    ]);
  });

  it.each(['destaque', 'destaque-2', 'destaque-3'] as const)(
    'paints a `{cor:%s}` span of both in the colour the brief sets, colour only',
    async (name) => {
      const [exam] = await slides(
        `::lamina\n  SEDUC {cor:${name}}QX{/}\n  Professor de {cor:${name}}Artes{/}\n  Vagas: 85`,
        { frontmatter: [`${name}: '${RED}'`] },
      );

      expect(looks(exam!, 'titulo')).toEqual([
        ['SEDUC ', 900, TITLE],
        ['QX', 900, RED],
      ]);
      expect(looks(exam!, 'subtitulo')).toEqual([
        ['PROFESSOR DE ', 900, SUBTITLE],
        ['ARTES', 900, RED],
      ]);
    },
  );

  it('keeps words that look the same in one run, though the brief marks them apart', async () => {
    // An italic the template does not draw, and a `**…**` beside a `{cor:destaque}` of its colour.
    const [exam] = await slides(
      '::lamina\n  SEDUC **Q**{cor:destaque}X{/}\n  Professor *de* Artes\n  Vagas: *300* imediatas',
    );

    expect(looks(exam!, 'titulo')).toEqual([
      ['SEDUC ', 900, TITLE],
      ['QX', 900, LABEL],
    ]);
    expect(looks(exam!, 'subtitulo')).toEqual([['PROFESSOR DE ARTES', 900, SUBTITLE]]);
    expect(looks(exam!, 'fatos')).toEqual([
      ['Vagas:', 500, LABEL],
      [' 300 imediatas', 300, VALUE],
    ]);
  });

  it('leaves words under a mark the template does not declare as they are, in one run', async () => {
    const [exam] = await slides('::lamina\n  SEDUC {cor:azul}QX{/}\n  Vagas: 85');

    expect(looks(exam!, 'titulo')).toEqual([['SEDUC QX', 900, TITLE]]);
  });
});

describe('the highlights elsewhere', () => {
  it('are none on the cover and the back cover: every word stays in the accent', async () => {
    const [cover, back] = await slides(
      [
        '::abertura\n  **CONCURSOS**\n  ABERTOS',
        '::chamada\n  **FIQUE** DE {cor:destaque-2}OLHO{/}!',
        '::fechamento\n  Siga **agora**.',
        '::lamina {capa}',
        '::lamina {contracapa}',
      ].join('\n'),
      { frontmatter: [`destaque: '${RED}'`, `destaque-2: '${RED}'`] },
    );

    for (const frame of [cover!, back!]) {
      const colours = texts(frame)
        .filter((node) => node.name !== 'assinatura')
        .flatMap((node) => looksOf(node).flatMap((look) => (look === '/' ? [] : [look[2]])));
      expect(new Set(colours)).toEqual(new Set([COLOR_DEFAULTS.accent]));
    }
  });

  it("default to each template's label colour, all three", () => {
    for (const defaults of [COLOR_DEFAULTS, SAUDE_COLOR_DEFAULTS]) {
      for (const name of ['destaque', 'destaque-2', 'destaque-3'] as const) {
        expect(defaults[name], name).toBe(defaults['label-ink']);
      }
    }
  });
});
