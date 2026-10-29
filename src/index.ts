/**
 * The plugin's entry: one template pack whose only template, `concursos-abertos`, is a code
 * template.
 *
 * Tyto reads the manifests from `templates/` itself (Tyto ADR 0046), so the pack lists none.
 * The folder holds no `template.ts`: the code is this bundle's, and Tyto calls `build` in the
 * plugin's own process by the template's manifest name (Tyto ADR 0048).
 */

import { build as buildOpenExams } from './template.js';

import type { TemplateContext } from '@tyto/core';
import type { PluginHost } from '@tyto/plugin-api';

const BUILDS = { 'concursos-abertos': buildOpenExams } as const;

export function activate(host: PluginHost): void {
  host.registerTemplatePack({
    id: 'concursos-abertos',
    templates: [],
    directory: 'templates',
    build: (template: string, context: TemplateContext) => {
      const build = BUILDS[template as keyof typeof BUILDS];
      if (build === undefined) {
        throw new Error(`concursos-abertos draws no template named '${template}'.`);
      }
      return build(context);
    },
  });
}
