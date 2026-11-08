# Marcel

Spelletjes en hulpmiddelen die Marcel (9 jaar) zelf bedacht heeft.

- `index.html`: startpagina met de keuze
- `kampbouwer.html` + `animatie.js`: knopen leren (met animaties) en een kamp ontwerpen
- `race.html`: racespel met 7 circuits; camera "van boven" (2D) of "achter de auto" (3D)
  Besturing: pijltjes, Z Q S D (azerty) of W A S D (qwerty); Esc, P of de ⏸-knop zet het spel op pauze (verder, opnieuw, ander circuit, terug).
- `stad-acacia.js`: het stadscircuit rond het Acaciapark (Brugse Poort, Gent) met echte straten, huizen (= muren, met zadeldak en voordeur),
  geparkeerde auto's (ook muren), straatnaambordjes, de straatnaam onderaan in beeld, en bomen (in het park aangevuld).
  Gemaakt met `node tools/maak-stad.mjs [cache.json]` uit OpenStreetMap. Kaartgegevens © OpenStreetMap-bijdragers (ODbL); de vermelding staat ook op de circuitkaart in het menu.
- `race3d.js`: de 3D-weergave (Three.js 0.170 van jsDelivr), pas geladen als je die camera kiest.
  Werkt enkel via http(s) (online of een lokale server), niet door `race.html` te dubbelklikken: dan valt het spel terug op "van boven".

Gewone HTML-bestanden, zonder server of bouwstap. Online via GitHub Pages: https://shaggy72.github.io/marcel/
Bijwerken: commit en push naar `main`, Pages zet het binnen een minuut online.

Records en ontwerpen worden bewaard in de browser (localStorage), dus per toestel.

Testen zonder browser-klikken:
- `race.html#zelftest`: alle circuits worden gecontroleerd (weg niet te dicht bij zichzelf, alle auto's rijden 3 rondes uit; in de stad ook: vol gas tegen de huizen rijden mag nooit in een huis eindigen); de uitslag staat in de paginatitel.
- `race.html#camera=achter&start=acacia&plek=330`: start meteen, met je auto op punt 330 van de weg.
- `kampbouwer.html#knoop=plat&stap=4`: opent een knoop meteen bij een stap.
