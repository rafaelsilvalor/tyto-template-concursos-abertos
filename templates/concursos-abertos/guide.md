# How to write a `concursos-abertos` brief

`concursos-abertos` is the week's open exams as a 1080×1350 carousel: a **cover**, **one slide
per exam** (title, subtitle and a card of facts: board, registration, places, pay…) and a
**back cover** with an invitation to follow and the contact lines.

Recognise it by the request ("concursos abertos", "inscrições abertas") or by a list of exams
where each brings lines such as `Banca: …`, `Vagas: …`, `Remuneração: …`, `Inscrições: …`.

## Slots

| Slot         | Where               | Rule                                                                                                                                                                        |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lamina`     | directive, repeated | 1 to 20 slides; see Normalisation.                                                                                                                                          |
| `abertura`   | directive           | Optional, at most 30 characters: the cover's title, one word per line. Without it, the template's default.                                                                  |
| `chamada`    | directive           | Optional, at most 60 characters: the three lines beside the cover's title. Without it, the template's default.                                                              |
| `fechamento` | directive           | Optional, at most 160 characters: the back cover's paragraph.                                                                                                               |
| `contatos`   | directive           | Optional, at most 120 characters: one contact per line; the icon comes from the text (an Instagram handle, a YouTube address, or a link).                                   |
| `selo`       | frontmatter         | Optional, 1080×140: `selo: ./selo.png`. At the foot of the **last** slide (the back cover); its signature moves up 140 to stay above the band. Only when the person has it. |

**`fechamento` and `contatos` have placeholder defaults.** The template's own text is invented,
so a published piece needs the person's real paragraph and contacts: take them from the copy,
from the project's configuration or from the person. Never invent them; if none is given, ask.

Format: `formats: [grid]` only; there is no story.

## Normalisation

The order of the slides is fixed:

1. **`::lamina {capa}`**, empty, first.
2. **One `::lamina` per exam**:
   - 1st line: the **title** (the body's or the exam's name), with no `:`. The template sets it
     in capitals and breaks it into lines of **at most 16 characters**, spaces included, in the
     fewest balanced lines; a line never ends on a connective (`de`, `do`, `e`) and a dash
     stays with the word before it. Write it on one line.
   - 2nd line, optional: the **subtitle** (the post or the area: `Professor`, `Técnico`), with
     no `:`.
   - Every following line: one **fact** `Label: value`, in the copy's order: `Banca: Banca
Alfa`, `Inscrições: até 14/11`, `Vagas: 300`, `Remuneração: R$ 5.181,41`, `Cargos: …`,
     `Nível: Superior`, `Prova: a confirmar`. The label is what comes before the **first**
     colon, and the colon of a time (`14:00`) or of a link does not count. So `Prova às 14:00`
     has no label and comes out whole in the label's colour: write `Prova: 14/12, às 14:00`.
     The template keeps `R$` with its value, `9,8 mil`, a number with its `%`, and a number
     with its unit; no special space is needed.
3. **`::lamina {contracapa}`**, empty, last.

A marked slide (`{capa}`, `{contracapa}`) holds no text: the cover's words go in
`abertura`/`chamada`, the back cover's in `fechamento`/`contatos`.

## How to split into slides

One exam per slide, always. With the cover and the back cover, **up to 18 exams** fit (the limit
is 20 slides). The card grows to the right up to 780 px, then wraps the fact and grows down.
Nothing shrinks: what passes the arrow is cut, and Tyto warns `W_TEMPLATE_OVERFLOW` on that
`::lamina`. How many facts fit, with a subtitle and one-line facts:

| Title lines (16 characters each) | Facts that fit |
| -------------------------------- | -------------- |
| 1                                | 15             |
| 2                                | 13             |
| 3                                | 12             |
| 4                                | 10             |
| 5                                | 9              |

A long fact that wraps counts as two. Without a subtitle there is room for about one more fact.
If an exam does not fit, **do not drop facts on your own**: tell the person and ask what goes.
Never end the brief on an exam slide when there is a `selo:`: the seal goes on the last slide,
which must be the back cover.

## Example

Copy (invented):

```
Inscrições abertas desta semana
SEDUC QX — Professor
Banca Alfa, inscrições abertas, 300 vagas, R$ 5.181,41, nível superior, prova a confirmar
IFX Norte — Técnico: banca Beta, 85 vagas, nível médio
Rodapé: Siga a nossa página para não perder nenhum edital.
Contatos: Instagram: @perfil.exemplo / Youtube.com/canalexemplo / exemplo.com.br
```

Brief:

```brief
---
template: concursos-abertos
formats: [grid]
---
::fechamento
  Siga a nossa página para não perder nenhum edital.

::contatos
  Instagram: @perfil.exemplo
  Youtube.com/canalexemplo
  exemplo.com.br

::lamina {capa}

::lamina
  SEDUC QX
  Professor
  Banca: Banca Alfa
  Inscrições: abertas
  Vagas: 300
  Remuneração: R$ 5.181,41
  Nível: Superior
  Prova: a confirmar

::lamina
  IFX Norte
  Técnico
  Banca: Banca Beta
  Vagas: 85
  Nível: Médio

::lamina {contracapa}
```

## Known traps

- **"Unknown template"**: the plugin is not installed on the machine, or the Tyto is older than
  the plugin API the manifest's `engine` asks for.
- **`W_TEMPLATE_OVERFLOW`**: an exam's card passed the arrow; see the table above.
- **Placeholder logo and signature** while the brand's kit is not installed: not a brief
  error.
