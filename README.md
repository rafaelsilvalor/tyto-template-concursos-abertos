# tyto-template-concursos-abertos

`concursos-abertos`, a [Tyto](https://github.com/rafaelsilvalor/tyto) code template in its own
repository: the week's open exams as a 1080×1350 carousel — a cover, one slide per exam with its
facts on a card, and a back cover that may close with the house's seal.

**This repository holds the composition only.** The logo and the signature are not here: Tyto
hands them to the template from the brand kit installed on the machine, under the manifest's
brand `marinho`, and without one it draws placeholders (Tyto ADR 0063, ADR 0065). The default
words on the back cover and the example brief are invented copy.

## Install into Tyto

```
tyto plugin install git+https://github.com/rafaelsilvalor/tyto-template-concursos-abertos.git
```

Tyto clones the default branch and never builds it, so `dist/index.js` is committed on `main`
and every release is a tag of it. To take a change pushed here, run the same command again:
installing a name that is already installed replaces it.

A pack brings templates and no formats. Copy `templates/formats.yaml` into the project that
renders `concursos-abertos`, or merge its `grid` line into the project's own. A brief marks its
first slide as the cover and its last as the back cover, because one `::lamina` is one slide in
Tyto and a template cannot add slides of its own:

```
---
template: concursos-abertos
formats: [grid]
---

::lamina {capa}

::lamina
  Prefeitura de Vale Alto
  Professor
  Banca: Quintex
  Vagas: 1.200

::lamina {contracapa}
```

An exam's first line is its title, a second line with no `:` its subtitle, and every
`Label: value` line one line of the card. The title breaks between words into lines of at
most 16 characters; the card hugs its widest fact and wraps a longer one at 780 px, growing
taller. A contact line gets Instagram's or YouTube's icon when it names them, a link otherwise.
`abertura`, `chamada`, `fechamento` and `contatos`
replace the cover's and the back cover's words; `selo: ./selo.png` glues the seal to the foot of
the back cover.

## What it may reach

| Permission        | Why                                                               |
| ----------------- | ----------------------------------------------------------------- |
| `font:CircularXX` | Every word is set in CircularXX, a licensed face (Tyto ADR 0048). |

**The install asks for it once.** Faces Tyto ships cross to a plugin freely; a face installed
on the machine crosses only under this permission.

## What a configuration may change

`templates/concursos-abertos/manifest.yaml` declares twelve `values` (Tyto ADR 0153): nine
colours — the dark slides' gradient and accent, an exam slide's paper and card, and the inks of
an exam's title, subtitle, labels and values — and three numbers: `card-padding` (64), the gap
between the card's edges and its facts; `card-max-width` (780), the card's widest, a 16-character
title line; and `title-line-max` (16), the characters a title line holds, spaces counted. Each
default is the reference art's or the maintainer's, so with nothing configured the carousel
draws as the reference does. A configuration changes a value, never which pieces are drawn
(Tyto ADR 0151). A manifest with `values` needs a Tyto whose plugin API is 0.8 or newer, which
is why `engine` is `>=0.8`.

## Development

`pnpm check` runs Prettier, the type checker, ESLint and the tests; `pnpm build` writes
`dist/index.js`, one ES module with every `@tyto` import inlined, which is committed and which
CI rebuilds and compares.

The template depends on Tyto's published contract, held by GitHub Packages under the owner's
scope (Tyto ADR 0149) and aliased in `package.json`: `@tyto/house-style` draws the logo, the
signature and the seal, `@tyto/template-kit` and `@tyto/core` are what it is drawn with, and
`@tyto/plugin-api` is what loads it. The committed `.npmrc` names the scope only. GitHub asks
for a token with `read:packages` even for public packages, and it goes in your user-level
`~/.npmrc`:

```sh
gh auth refresh -s read:packages
echo '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' >> ~/.npmrc
NODE_AUTH_TOKEN=$(gh auth token) pnpm install
```

The tests, all without Tyto:

- `src/template.test.ts`: the carousel's rules on the scene — which slide the brief's marks
  make, a colon line read as a fact and not as the subtitle, the words the brief replaces, and
  every text starting inside its slide.
- `tests/examples.test.ts`: the example brief compiled as Tyto compiles it, through
  `@tyto/template-kit/testing` (Tyto ADR 0152), against the HTML of each slide in
  `tests/__snapshots__/`. Nothing is measured and faces are placeholders, so the snapshot moves
  when the composition does and not when a machine has another font.
- `tests/values.test.ts`: the declared values — each default pinned to the one the code falls
  back to, and a colour set in a test found in the HTML.
- `tests/plugin.test.ts`: the built `dist/index.js`, loaded through
  `@tyto/plugin-api/testing` (Tyto ADR 0150), drawing the cover across the isolation protocol.

The `contract` workflow runs every day against the newest published contract, past the ranges
`package.json` asks for, so a Tyto release that breaks this template turns it red before
somebody installs it.
