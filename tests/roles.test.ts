import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build } from '../src/template.js';

import type { Frame, SceneNode } from '@tyto/core';

/**
 * A slide's role, read by the kit's `roleOf` (TYTO-552) from the flags its `::lamina` writes:
 * `capa` is the cover, `contracapa` the back cover, and a slide that writes neither is an exam.
 * The template honours no other flag and no enum. Each role is told here by a text only its
 * slide draws.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/concursos-abertos/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

/** The names of every node the one slide of `lamina` draws. */
async function drawn(lamina: string): Promise<string[]> {
  const result = await compileTemplate({
    brief: `---\ntemplate: concursos-abertos\nformats: [grid]\n---\n${lamina}`,
    template,
    formats,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  const [frame] = result.value.scene.artworks.flatMap((artwork) => artwork.frames);
  const names = (parent: Frame | SceneNode): string[] =>
    'children' in parent
      ? parent.children.flatMap((node) => [...(node.name ? [node.name] : []), ...names(node)])
      : [];
  return names(frame!);
}

/** The text only one role draws: the cover's title, an exam's title, the back cover's paragraph. */
const ONLY = { capa: 'abertura-1', lamina: 'titulo', contracapa: 'fechamento' } as const;

describe('the role of a slide', () => {
  it.each([
    ['the cover, from `{capa}`', '::lamina {capa}', 'capa'],
    ['the back cover, from `{contracapa}`', '::lamina {contracapa}', 'contracapa'],
    ['an exam, from no flag at all', '::lamina\n  SEDUC QX\n  Vagas: 85', 'lamina'],
    ['the cover, from both flags written together', '::lamina {capa, contracapa}', 'capa'],
    [
      'the cover still, with the two flags the other way round',
      '::lamina {contracapa, capa}',
      'capa',
    ],
  ] as const)('is %s', async (_, lamina, role) => {
    const names = await drawn(lamina);

    for (const [other, name] of Object.entries(ONLY)) {
      expect(names.includes(name), `${name} on ${role}`).toBe(other === role);
    }
  });

  it('draws the arrow to the next slide on an exam alone', async () => {
    expect(await drawn('::lamina\n  SEDUC QX')).toContain('seta');
    // The cover's arrow is its own, under the call; the back cover has none.
    expect(await drawn('::lamina {contracapa}')).not.toContain('seta');
  });
});
