# Ljuset i rymden

Svensk scrollytelling om hur ljus når ögat och vad observationer kan berätta om rymden.

## Lokal preview

```sh
python3 build.py
python3 -m http.server 4173 --bind 127.0.0.1
```

Öppna <http://127.0.0.1:4173/>. Ingen paketinstallation behövs. `build.py` bygger `index.html` från de aktiva fragmenten i `parts/` och `chapters/`.

## Pages-preview

GitHub Actions bygger och publicerar vid push till `main`. Workflowen kan också startas manuellt. Endast `index.html`, stilmallar, skript och webbassets ingår i Pages-artefakten.

Preview: <https://kpclick12.github.io/scrolly-space/>

Pages är ett första publiceringssteg. Slutlig canonical-URL och sociala delningsbilder läggs till vid publicering på plainx.dev.

## Bilder och tillgänglighet

Källor, bildkrediter och förklaringar finns längst ned på sidan. Hero är en AI-genererad illustration. Avslutets stjärnsystem och spektrum är illustrerade exempel, inte mätresultat. Teleskopet använder lokalt inkluderad Three.js r180 (MIT) och planeten är skapad i Blender.

Sidan respekterar `prefers-reduced-motion`. Länken `?motion=reduce` visar mindre rörelse och en statisk illustration i avslutet. Källorna använder HTML-elementet `details` och kan öppnas med tangentbord.
