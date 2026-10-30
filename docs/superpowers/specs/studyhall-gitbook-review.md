# GitBook som reference for StudyHall

Undersøgt 30. oktober 2026. Kilde: https://github.com/gitbookio/gitbook ved commit `1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52`.

## Konklusion

Brug repositoryet som reference for læserens adfærd og udvalgte tekniske mønstre. En fork er ikke den korteste vej til StudyHalls statiske, lokale PWA. Der er ikke kopieret kode, kørt projektkode eller installeret GitBooks afhængigheder.

## Hvad repositoryet indeholder

README beskriver det som rendereren for GitBooks publicerede indhold. Hovedappen bruger Next.js og React. Den indgår i et Bun/Turbo-monorepo med flere GitBook-pakker. Datalaget bruger GitBook API og Next.js-cache, og dokumentrendereren accepterer GitBooks `JSONDocument` frem for en mappe med Markdownfiler.

Det betyder, at en fork stadig skulle have nyt lokalt datalag, håndtering af filsystemreferencer og zipfiler, offlineadfærd og en tilpasset statisk buildmodel til GitHub Pages. GitBooks indbyggede dokumentmodel og komponentkæde ville også følge med. Det er en teknisk vurdering af de læste filer, ikke resultatet af en afprøvet portering.

## Nyttige mønstre

| Område | Observation | Brug i StudyHall |
| --- | --- | --- |
| Oversættelser | Engelsk definerer nøglerne; øvrige sprog er typet mod samme nøglesæt. Der findes allerede en/da/de i GitBook. | Samme enkle princip med egne tekster og ordbøger. Ingen kopiering af oversættelser. |
| Navigation | Særskilte komponenter til dokumenttræ og til højre sides afsnitsnavigation. | Hold de to navigationsopgaver adskilt, bevar aktive sider og afsnit. |
| Markdown | En pipeline med remark/GFM og rehype-sanitéring. | Vælg en vedligeholdt parser og sanitéring frem for en egen parser. Biblioteksvalget er endnu åbent. |
| Mermaid | Separat runtime, restriktiv sikkerhedstilstand, tematilpasning og oprydning af midlertidig rendercontainer. | Load renderer efter behov, men cache dens filer til offlinebrug; håndtér tema og fejl eksplicit. |

## Referencefiler

Alle links er bundet til det undersøgte commit.

- [Appens pakker og buildkommandoer](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/package.json)
- [GitBook API-datalag](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/lib/data/api.ts)
- [Dokumentrendererens model](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/components/DocumentView/DocumentView.tsx)
- [Typede oversættelsesnøgler](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/intl/translations/types.ts)
- [Afsnitsnavigation](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/components/PageAside/ScrollSectionsList.tsx)
- [Markdownpipeline](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/lib/markdown.ts)
- [Mermaidrenderer](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/packages/gitbook/src/components/DocumentView/CodeBlock/MermaidCodeBlock.tsx)
- [Licens](https://github.com/gitbookio/gitbook/blob/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52/LICENSE)

## Licens og omfang

GitBooks repository bruger GPLv3. Direkte genbrug skal vurderes på de vilkår; et offentligt repository er ikke i sig selv hele licensafklaringen. Undersøgelsen anbefaler design- og mønsterinspiration uden kopiering af projektkode eller oversættelser. StudyHalls egen licens er endnu ikke valgt.

Brugerens valgte appikon er [Lucide library-big](https://lucide.dev/icons/library-big). [Lucides ISC-licens](https://lucide.dev/license) kræver bevarelse af copyright- og tilladelsesteksten. Selve ikonet kan medtages som en lokal SVG uden at hente et helt ikonbibliotek.

Gennemgangen er afgrænset til README, licens, pakkefiler, Next-konfiguration, oversættelser og relevante renderer-/navigationsfiler. Der er ikke lavet fuld kodeaudit eller bygget en GitBook-fork.
