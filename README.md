# Marcel

Spelletjes en hulpmiddelen die Marcel (9 jaar) zelf bedacht heeft.

- `index.html`: startpagina met de keuze
- `kampbouwer.html` + `animatie.js`: knopen leren (met animaties) en een kamp ontwerpen
- `race.html`: racespel met 6 circuits; camera "van boven" (2D) of "achter de auto" (3D)
- `race3d.js`: de 3D-weergave (Three.js 0.170 van jsDelivr), pas geladen als je die camera kiest.
  Werkt enkel via http(s) (online of een lokale server), niet door `race.html` te dubbelklikken: dan valt het spel terug op "van boven".

Gewone HTML-bestanden, zonder server of bouwstap. Online via GitHub Pages: https://shaggy72.github.io/marcel/
Bijwerken: commit en push naar `main`, Pages zet het binnen een minuut online.

Records en ontwerpen worden bewaard in de browser (localStorage), dus per toestel.

Testen zonder browser-klikken:
- `race.html#zelftest`: alle circuits worden gecontroleerd (weg niet te dicht bij zichzelf, alle auto's rijden 3 rondes uit); de uitslag staat in de paginatitel.
- `kampbouwer.html#knoop=plat&stap=4`: opent een knoop meteen bij een stap.
