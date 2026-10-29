import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, build } from '../src/template.js';

import type { SuppliedValues } from '@tyto/core';

/**
 * What a configuration may change in `concursos-abertos` (Tyto ADR 0153): the colours.
 *
 * The code reads each one through `@tyto/core`'s `colorValue` and falls back to
 * `COLOR_DEFAULTS`, so the pin is between the manifest and that record, and a value set here
 * must reach the HTML.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/concursos-abertos/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

const html = async (values?: SuppliedValues): Promise<string> => {
  const result = await compileTemplate({
    brief: read('../templates/concursos-abertos/examples/semana.brief'),
    template,
    formats,
    ...(values === undefined ? {} : { values }),
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.frames.map((frame) => frame.html).join('\n');
};

describe('declared values', () => {
  const declared = manifest.value.values ?? {};

  it('declares each default equal to the one the code falls back to, and no other', () => {
    const defaults = Object.fromEntries(
      Object.entries(declared).map(([name, value]) => [name, value.default]),
    );
    expect(defaults).toEqual(COLOR_DEFAULTS);
  });

  it('draws the same HTML with every default supplied as with no values at all', async () => {
    const supplied = Object.fromEntries(
      Object.entries(COLOR_DEFAULTS).map(([name, value]) => [name, { value }]),
    );
    expect(await html(supplied)).toBe(await html());
  });

  it('paints the card a configured colour, found in the HTML', async () => {
    const painted = await html({ card: { value: '#123456' } });

    expect(painted).toContain('#123456');
    expect(await html()).not.toContain('#123456');
  });
});
