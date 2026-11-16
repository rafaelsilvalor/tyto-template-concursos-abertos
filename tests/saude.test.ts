import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import {
  COLOR_DEFAULTS,
  NUMBER_DEFAULTS,
  SAUDE_COLOR_DEFAULTS,
  buildSaude,
} from '../src/template.js';

/**
 * `concursos-abertos-saude`: the education slides in the health vertical's colours. Its
 * manifest pins its own colour defaults to `SAUDE_COLOR_DEFAULTS`, and its example is drawn
 * against the HTML reviewed last time, as `examples.test.ts` does for the education one.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/concursos-abertos-saude/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, buildSaude);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });
const brief = read('../templates/concursos-abertos-saude/examples/semana.brief');

describe('concursos-abertos-saude', () => {
  it('declares each default equal to the one the code falls back to, and no other', () => {
    const defaults = Object.fromEntries(
      Object.entries(manifest.value.values ?? {}).map(([name, value]) => [name, value.default]),
    );
    expect(defaults).toEqual({ ...SAUDE_COLOR_DEFAULTS, ...NUMBER_DEFAULTS });
  });

  it('declares the same colours as the education template, only their values differ', () => {
    expect(Object.keys(SAUDE_COLOR_DEFAULTS).sort()).toEqual(Object.keys(COLOR_DEFAULTS).sort());
  });

  it('compiles its example to five grid frames, each as drawn last time', async () => {
    const result = await compileTemplate({ brief, template, formats });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));

    expect(result.value.frames).toHaveLength(5);
    for (const [index, frame] of result.value.frames.entries()) {
      await expect(frame.html).toMatchFileSnapshot(
        `./__snapshots__/saude-semana-${index + 1}.html`,
      );
    }
  });
});
