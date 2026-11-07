# Marcel

Spelletjes en hulpmiddelen die Marcel (9 jaar) zelf bedacht heeft.

- `index.html`: startpagina met de keuze
- `kampbouwer.html` + `animatie.js`: knopen leren (met animaties) en een kamp ontwerpen
- `race.html`: racespel met 6 circuits

Gewone HTML-bestanden, zonder server of bouwstap. Online via GitHub Pages: https://shaggy72.github.io/marcel/
Bijwerken: commit en push naar `main`, Pages zet het binnen een minuut online.

Records en ontwerpen worden bewaard in de browser (localStorage), dus per toestel.

Testen zonder browser-klikken:
- `race.html#zelftest`: alle circuits worden gecontroleerd (weg niet te dicht bij zichzelf, alle auto's rijden 3 rondes uit); de uitslag staat in de paginatitel.
- `kampbouwer.html#knoop=plat&stap=4`: opent een knoop meteen bij een stap.
