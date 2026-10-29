import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CALL, DEFAULT_CLOSING, DEFAULT_OPENING, build } from './template.js';

import type { Frame, SceneNode, TextNode } from '@tyto/core';

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

async function slides(brief: string): Promise<Frame[]> {
  const result = await compileTemplate({
    brief: `---\ntemplate: concursos-abertos\nformats: [grid]\n---\n${brief}`,
    template,
    formats,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
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
    expect(named(exam!, 'titulo')).toBe('PREFEITURA DE VALE ALTO\nPROFESSOR');
    expect(named(exam!, 'fatos')).toBe('Banca: Quintex\nVagas: 1.200');
    expect(named(back!, 'fechamento')).toBe(DEFAULT_CLOSING);
  });

  it('reads a line with a colon as a fact, not as the subtitle', async () => {
    const [exam] = await slides('::lamina\n  SEDUC QX\n  Banca: Ômegas\n  Vagas: 3.000');

    expect(named(exam!, 'titulo')).toBe('SEDUC QX');
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
});
