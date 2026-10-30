# StudyHall · design for første version

Dato: 30. oktober 2026. Status: godkendt til implementering; senere brugerfeedback om samlingsnavne, frontmatter og custom domain er indarbejdet nedenfor.

## Formål

StudyHall gør en almindelig mappe eller zipfil med Markdown til en lokal dokumentationslæser. Brugeren åbner kilden og får formateret indhold, fungerende interne links og billeder samt navigation efter mappestrukturen. Der kræves ingen konfigurationsfil eller generering af et dokumentationssite.

Appen hostes som statiske filer på GitHub Pages og kan installeres som PWA. Dokumentationen læses på brugerens computer og uploades ikke.

## Besluttede rammer

- Navn: StudyHall.
- Appikon: Lucides `library-big`, https://lucide.dev/icons/library-big. Brug samme motiv til brandikon, favicon og PWA-ikoner; bevar nødvendige licensoplysninger. Ikonet pakkes med appen og kræver ikke netværk under brug.
- Repository: https://github.com/skttl/studyhall. Det offentlige repository var tomt ved kontrollen 30. oktober 2026.
- Hosting: GitHub Pages med custom domain https://studyhall.skttl.dev/. Den faktiske Pages-opsætning, DNS og HTTPS skal verificeres før udgivelse. Base-stien er `/`.
- Målgruppe for første version: Chrome og Edge på desktop. Ingen kompatibilitetsomveje for andre browsere eller mobil.
- Kilder: lokale mapper og lokale zipfiler, inklusive undermapper.
- Flere samlinger kan huskes og vælges i samme app.
- Kilderne ændres ikke af StudyHall. Kun læseadgang efterspørges.
- Gem adgangsreferencer, ikke kopier af mapper, zipfiler eller dokumentation.
- Kontrollér kilden igen, når brugeren vender tilbage til fanen eller appvinduet. Tilbyd desuden Opdater. Ingen løbende filovervågning.
- Markdown, Mermaid, billeder og relative links. MDX er uden for scope. Wikilinks er udskudt.
- Bogmærker til både dokumenter og overskrifter.
- Brugbar visning uden konfiguration.
- GitBook-inspireret layout og automatisk lyst/mørkt tema efter systemets præference.
- Offlinebrug efter at appens nødvendige filer er hentet og cachet. Eksterne billeder og websites må kræve netværk.

## Overvejede tilgange

1. **Installeret desktopapp.** Kunne give tættere integration med filsystemet, men kræver separat distribution og opdatering. Fravalgt til fordel for browserløsningen.
2. **Almindelig statisk webapp.** Kan læse valgte lokale kilder i de aftalte browsere. Opfylder læserens grundfunktioner, men uden det aftalte arbejde med installation og offlineopstart.
3. **Statisk webapp med PWA fra starten.** Valgt af brugeren. Samme læser fungerer i en browserfane og et installeret appvindue. Service worker cacher appens egne filer; brugerens dokumenter læses fortsat fra disken.

Der er ikke behov for en server, database på nettet, login eller en konto i StudyHall.

## Samlinger og adgang

Ved første åbning vælger brugeren en mappe eller zipfil gennem browserens filvælger, eller trækker den ind i appen. Drag-and-drop skal føre til samme samlingsmodel med genbrugelig filsystemreference. Hvis et drop ikke giver en sådan reference, forklares det og brugeren henvises til Vælg mappe eller Vælg zipfil. Ingen skjult overgang til lagrede dokumentkopier.

Browseren giver en `FileSystemDirectoryHandle` eller `FileSystemFileHandle`. Denne gemmes i IndexedDB sammen med et stabilt, lokalt samlings-ID, navn og kildetype. En tekststi alene kan ikke bruges til at genåbne en vilkårlig fil i browseren.

Ved genåbning kontrolleres læsetilladelsen. Hvis den mangler, vises en konkret Genoptag adgang-handling. En tilladelsesdialog udløses ved brugerens handling, ikke automatisk under sideindlæsning.

En manglende eller flyttet kilde giver mulighed for at vælge kilden igen til det eksisterende samlings-ID. Bogmærkerne bevares derved. Automatisk søgning på resten af disken er ikke en del af løsningen. En zipfil, som et andet program erstatter med en ny fil, kan også kræve dette; problemfri håndtering af alle erstatningsmetoder er ikke lovet.

Bogmærker afhænger af den lokale registrering i samme browserprofil. De er ikke delbare dokumentadresser og giver ikke adgang på en anden computer. Ved et ukendt samlings-ID skal appen forklare dette og tilbyde at forbinde en kilde til ID'et.

IndexedDB er knyttet til origin, ikke til en URL-sti. Appens egne databasenavne og cache-navne skal derfor have StudyHall-præfiks, og service worker begrænses til appens base-sti. Et skift til et andet origin mister adgang til den gamle registrering. En ændring af base-stien kan bryde eksisterende bogmærker og installationer.

## Navigation og startside

- Navigationen omfatter Markdownfiler og de mapper, der indeholder Markdownfiler. Billedmapper og øvrige bilagsmapper vises ikke alene for deres bilag.
- Bevar mappestrukturen. Opfind ikke kategorier ud fra indholdet. Kategorierne i skitsen er eksempler, ikke regler, der skal genkendes i brugernes materiale.
- Brug dokumentets første H1 som sidetitel. Hvis den mangler, brug filnavnet uden endelse. Et dokument med samme titel som et andet skelnes via stien.
- Sortér mapper før dokumenter, alfabetisk med naturlig talsortering. README eller index er indgang til en mappe, når de findes.
- På samlingens rod bruges README.md først, dernæst index.md. Genkend disse navne uden hensyn til store/små bogstaver; vælg deterministisk, hvis flere matcher. Ellers vises en automatisk oversigt med dokumentlinks. Oversigten gemmes ikke på disken.
- Mapper kan foldes sammen. Stien til det aktive dokument skal være foldet ud.
- Vis en indholdsfortegnelse ud fra dokumentets H2/H3 med fungerende ankre. Den aktuelle sektion markeres diskret.
- Browserens Tilbage/Frem skal virke mellem dokumenter og ankre.

## Rendering og links

Understøt almindelig Markdown og relevante GFM-elementer: tabeller, opgavelister, gennemstregning, kodeblokke og automatisk genkendelse af almindelige webadresser. Kodeblokke må have syntaksfarver, hvis det kan tilføjes med en lille eksisterende løsning, men korrekt tekstvisning er vigtigere end sprogudvalg.

Mermaid-kodeblokke gengives som diagrammer. Fejl i et diagram må ikke forhindre resten af siden i at vises; vis en forståelig fejl og diagrammets kildetekst. Mermaid og dens nødvendige ressourcer skal være en del af appens offlinefiler.

Relative dokumentlinks og billedstier fortolkes fra den aktuelle Markdownfils mappe. Håndtér procentkodning, mellemrum, Unicode, `.` og `..` uden at tillade opslag uden for samlingens rod. Match almindelige filstier præcist; løs ikke tvetydigheder ved at vælge en tilfældig fil. URL'er begyndende med `/` fortolkes som samlingsrelative filstier i denne læser.

Overskriftsankre skal følge en dokumenteret GitHub-lignende slugregel, inklusive gentagne overskrifter. Markdownbilleder skal bruge lokale filer fra kilden. Objekt-URL'er frigives ved samlingsskift og genindlæsning.

Eksterne HTTP(S)-links åbnes i en ny fane med passende isolation. Understøt almindelige mailto-links. Blokér aktive og ukendte URL-skemaer som javascript:. Beskriv manglende lokale mål og mål uden for roden med den relevante sti. Appen beder ikke om bredere filadgang for at følge et link.

Andre lokale filtyper, eksempelvis JSON eller kildekode, gengives ikke som dokumentationssider i første version. Vis en forklaring med filstien ved sådanne links. Downloads og ekstern editorintegration er udskudt.

## Søgning

Søg i titel, sti og dokumenternes tekst inden for den aktuelle samling. Resultater viser titel, sti og et kort tekstudsnit. En enkel tekstsøgning er nok; AI-søgning, semantiske indeks og søgning på tværs af samlinger er uden for scope.

Åbn søgning via en synlig knap og Ctrl/Cmd+K. Dialogen skal fungere med tastatur, Escape og fokusretur. Vis konkrete nulresultater. Søgeindekset holdes i hukommelsen og opdateres med kilden; der gemmes ikke et skjult dokumentarkiv i browserlageret.

## Opdatering fra disk

Ved tilbagevenden til fanen eller appvinduet kontrolleres kilden for ændringer. Samtidige focus/visibility-hændelser samles, og en igangværende scanning startes ikke igen. Opdater-knappen bruger samme forløb.

For mapper opdateres fillisten og ændrede dokumenter/billeder. For zipfiler genlæses arkivet, når filmetadata viser en ændring. Hvis arkivet er under skrivning eller midlertidigt ugyldigt, bevares den sidst fungerende visning i hukommelsen, og brugeren får mulighed for at prøve igen.

Bevar det aktuelle dokument og så vidt muligt samme afsnit/læseposition. Hvis dokumentet er slettet, vises en forklaring og adgang til oversigten. Hvis kun ankeret er væk, vises dokumentet fra toppen. Der kræves ikke byte-for-byte ændringsdetektion af filer, hvis skriveværktøjet hverken ændrer størrelse eller ændringstid.

## PWA og GitHub Pages

Appen skal kunne bygges til statiske filer med en base-sti på `/` til custom domain studyhall.skttl.dev. Brug dokumentadresser med query-parametre på appens eksisterende indgangsside og URL-fragment til overskrifter. Det giver genindlæsning og bogmærker uden serverbaseret SPA-routing eller 404-omveje.

Manifestets navn er StudyHall. Ikoner, startadresse og scope skal passe til den faktiske base-sti. Cache kun appens egne filer, inklusive renderere, skrifter og andre nødvendige ressourcer. Ingen runtimeafhængighed af CDN'er, eksterne skrifter eller en backend.

Offlineberedskab kræver, at den første indlæsning og caching er gennemført. Installation er valgfri og er ikke en forudsætning for offlinebrug i en browserfane.

En ny appversion må ikke tvinge en genindlæsning under læsning. Vis en besked med mulighed for at aktivere opdateringen. Ryd gamle StudyHall-cacheversioner efter skift. Slet ikke brugerens gemte samlingsreferencer.

Deploy bygges gennem GitHub Actions efter relevante checks. Pages-indstillingen og den endelige adresse verificeres ved opsætning. Opdateret kode og workflow gøres reviewbare før første offentlige udgivelse.

## Sikkerhed og ressourcegrænser

Behandl Markdown, HTML, SVG, links og zipindhold som utroværdigt input. Sanitér rendererens HTML med en vedligeholdt løsning. Understøt kun et sikkert formateringsudvalg; scripts, hændelsesattributter, iframes og aktivt indhold må ikke udføres. Brug Mermaids restriktive sikkerhedstilstand. SVG fra kilden må ikke indsættes som vilkårlig aktiv HTML.

Zipopslag skal afvise stier uden for roden, absolutte arkivstier, traversal, symbolske links og tvetydige dubletstier. Der må ikke udtrækkes filer på brugerens disk. En fælles ydermappe i en zip kan foldes væk som visningsrod, når alle brugbare filer ligger under den og der ikke er dokumenter i arkivets rod.

Implementer håndhævede grænser for komprimeret størrelse, faktisk udpakket størrelse og antal filer. Vis en forståelig fejl med grænsen; stop arbejdet, før browseren bruger ubundet hukommelse. De konkrete konservative standardværdier og valg af bibliotek overlades til implementøren og dokumenteres. Et arkivs deklarerede størrelse alene er ikke tilstrækkelig kontrol.

Ingen analytics, dokumentupload eller fjernbehandling i første version. Eksterne billeder er en udtrykkelig undtagelse: indlæsning kan kontakte billedets vært. De behøver ikke fungere offline.

## Visuelt design

Brug det senest gennemgåede design som reference, ikke skitsens hårdkodede indhold som produktimplementering:

Den lokale klikbare skitse fra brainstormingfasen. Den publiceres ikke som produktkode.

- Venstre kolonne til samlingsvalg og mappestruktur, midterkolonne til dokumentet og højre kolonne til indholdsfortegnelsen.
- Neutral aktiv menurække med halvfed tekst. Ingen dekorativ farvet sidestreg eller skygge på aktiv navigation.
- Rolige grå flader og begrænset indramning. Blå bruges primært til indholdslinks og fokusmarkeringer.
- Læsebredden begrænses til omtrent 65 tegn. Dokumentteksten har en læsbar størrelse og luftig linjeafstand.
- Systemstyret lyst/mørkt tema, inklusive native kontroller. Ingen separat temaindstilling i første version.
- Tastaturnavigation, synligt fokus, korrekt current-markering og tilstrækkelig tekstkontrast. Ingen farve som eneste signal.
- Skitsens foreløbige navn Læsested erstattes med StudyHall overalt i produktet.

## Brugerfladesprog

Engelsk er standardsprog. Første version leveres med komplette oversættelser til dansk og tysk. Brugeren kan vælge English, Dansk eller Deutsch i en diskret sprogindstilling, og valget huskes lokalt. Der skiftes ikke automatisk væk fra engelsk alene på grund af browserens sprog. Placeringen af sprogvalget overlades til implementøren.

Alle appens brugerrettede tekster skal ligge i separate sprogordbøger med stabile nøgler. Det gælder også fejl, tomme tilstande, hjælpetekster, søgning, PWA-opdateringer, tilgængelige navne og statusmeddelelser. Engelsk definerer nøglesættet. Typekontrol eller en lille kontroltest skal opdage manglende nøgler i dansk og tysk; engelsk er defensivt fallback under kørsel.

Brug parametre i oversatte sætninger frem for at sammenkæde tekstfragmenter. Formatér eventuelle tal, datoer og flertal efter valgt sprog. Opdatér dokumentets `lang`-attribut. Nye sprog skal kunne tilføjes med en ordbog og en registrering, uden ændringer i de enkelte komponenter. Et stort oversættelsesframework er ikke et mål i sig selv.

Sprogvalget oversætter kun StudyHalls brugerflade. Markdownindhold, dokumenttitler, filnavne og tekst inde i Mermaid-diagrammer bevares som i kilden. Dokumentadresser og bogmærker er uafhængige af brugerfladesproget.

Den nuværende skitse er stadig på dansk og bruger det foreløbige navn Læsested. Den er en layoutreference, ikke en færdig implementering af sprogvalget eller brandet.

## GitBook som teknisk reference

Repositoryet https://github.com/gitbookio/gitbook er undersøgt ved commit `1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52`. Det er en Next.js/React-frontend til GitBooks publicerede indhold, med GitBook API-datamodeller og serverintegration. Det er ikke en færdig statisk læser til lokale Markdownmapper.

Anbefalingen er at beholde StudyHall som selvstændig statisk PWA og bruge GitBook som reference for læseoplevelse, mappenavigation, indholdsfortegnelse, typed oversættelsesordbøger samt sikker Markdown/Mermaid-rendering. Direkte fork eller integration af GitBooks renderer fravælges som implementørens anbefaling: tilpasningen til lokale filer, offlinebrug og GitHub Pages ville medføre mere arbejde og flere afhængigheder.

GitBook-koden er GPLv3. Der er ikke kopieret kildekode eller oversættelser til StudyHall. Eventuelt senere direkte kodegenbrug kræver en særskilt vurdering af licenskompatibilitet og bevarelse af licensoplysninger. Inspirationen forudsætter ikke, at StudyHall kopierer GitBooks kode. Noter og konkrete referencefiler findes i `studyhall-gitbook-review.md` ved siden af dette dokument.

## Teknisk udgangspunkt og implementørens råderum

TypeScript og Vite blev foreslået, og brugeren accepterede forslagene. Brug almindelig HTML/CSS og TypeScript uden et UI-framework som mindste udgangspunkt. Det sidste er implementørens valg og kan ændres under planlægningen, hvis en konkret grund taler for det.

Brug vedligeholdte biblioteker til Markdown, HTML-sanitéring, Mermaid og zip. Vælg aktuelle kompatible versioner under implementeringen. Opfind ikke egne parsere eller sikkerhedssanitéring. Brug platformens filsystem-API'er og IndexedDB.

Modulgrænser, præcise bibliotekvalg, numeriske ressourcegrænser og ændringsregistreringens interne mekanik overlades til implementøren. Løsningen skal være lille og testbar uden arkitektur til senere udvidelser.

## Verificering før første udgivelse

- Åbn en mappe og en zipfil med undermapper, Unicode, mellemrum, billeder og relative links. Vis sider uden README og med README/index.
- Kontrollér links til dokumenter, gentagne overskrifter, manglende mål og mål uden for roden. Test Tilbage/Frem og bogmærke efter genstart.
- Genåbn gemte samlinger med og uden bevaret tilladelse. Forbind flyttet kilde til samme ID. Test også ukendt ID.
- Redigér, tilføj og slet filer uden for appen, og vend tilbage. Kontrollér opdatering og læseposition. Udskift zipfilen med mindst én almindelig erstatningsmetode og dokumentér resultatet.
- Afprøv almindelig Markdown, gyldig/ugyldig Mermaid, farligt HTML/SVG og aktive linkskemaer.
- Afprøv zip-traversal, dubletstier og overskridelse af ressourcegrænser.
- Kontrollér installation, offlineopstart via direkte dokumentbogmærke og opdatering af appen på den rigtige Pages-base-sti.
- Kontrollér tastatur, søgning, synligt fokus og begge temaer i Chrome/Edge desktop. Ingen krav om fuld browsermatrix.
- Kontrollér komplette engelsk/dansk/tysk-ordbøger, sprogskift og bevaret sprogvalg. Lange tyske tekster må ikke bryde layoutet; dokumenternes sprog og bogmærker må ikke ændres.
- Kontrollér Lucide `library-big` i brand, favicon og installeret PWA, inklusive korrekt ikonstørrelse, frirum og licensoplysninger.
- Brug syntetiske testfiler i det offentlige repository. Upload ikke den private GI-dokumentation eller dens billeder som demo eller fixtures.

Brugeren har angivet en privat dokumentationsmappe til lokal manuel kontrol. Den er læseinput og må ikke publiceres i repositoryet.

## Uden for første version

Redigering, cloudsynkronisering, login, serverbehandling, deling af selve dokumenterne, MDX, wikilinks, publicering af dokumentationssamlinger, egne konfigurationsfiler, temaeditor, filovervågning, ekstern editorintegration og særlige browserfallbacks.

## Status og næste skridt

Den klikbare designskitse er gennemgået af brugeren og ændret efter feedback. Produktimplementeringen er nu i gang. Se implementeringsplan og verificeringsrapport for aktuel status; DNS og deployment må ikke erklæres færdige uden konkret kontrol.

Næste skridt efter godkendelse af dette dokument er en implementeringsplan, hvorefter produktet kan bygges i repositoryet. Designdokumentet flyttes til `docs/superpowers/specs/2026-10-30-studyhall-design.md` i det fremtidige checkout og bevares i Git. Ingen ændringer i GI-checkout er nødvendige.

## Supplerende brugerfeedback under implementering

- Samlingsvælgeren placeres i toppen og viser navnet på den aktuelle samling i stedet for overskriften StudyHall.
- Samlinger kan omdøbes lokalt uden at ændre kilden eller deres ID. Navnet bevares ved genåbning og reconnection.
- YAML-frontmatter vises ikke som dokumenttekst. Brug `title` til sidetitel/navigation og `description` til indledning. Øvrige felter læses som metadata. Ugyldig frontmatter giver en forståelig besked, mens dokumentets body stadig kan læses.
- Dokumentlinks uden filendelse understøttes, når målet entydigt matcher en Markdownfil; der vælges ikke mellem tvetydige filer.
- Brugeren har oprettet DNS-recorden til studyhall.skttl.dev. GitHub Pages-opsætning og certifikat skal fortsat kontrolleres.

## Kilder

- Repositorykontrol: https://github.com/skttl/studyhall
- GitHub Pages og projektadresser: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Filsystemreferencer og IndexedDB: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- PWA-caching: https://web.dev/learn/pwa/caching
- GitBook-reference: https://github.com/gitbookio/gitbook/tree/1383a798cbc12c40f2b3aa797cc8b9fbcbe48a52
- Lucide-ikon: https://lucide.dev/icons/library-big
- Lucide-licens: https://lucide.dev/license
