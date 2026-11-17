<script lang="ts">
  import { meldungFuer } from "../meldungen";
  import { fehlercodeLesen, raumEroeffnen } from "../raumEroeffnen";
  import { istGueltigerRaumcode } from "../regeln/raumcode";
  import { rueckkehrOffen, tokenLesen } from "../verbindung.svelte";

  interface Props {
    raumcode: string | null;
    angemeldet: boolean;
    meldung: string | null;
    onEintritt: (raumcode: string, token: string, rueckkehr: boolean) => void;
    onEditor: () => void;
    onMeineQuizze: () => void;
    onSammlung: () => void;
  }

  let {
    raumcode,
    angemeldet,
    meldung,
    onEintritt,
    onEditor,
    onMeineQuizze,
    onSammlung,
  }: Props = $props();

  let eingabeCode = $state("");
  let name = $state("");
  let fehler = $state<string | null>(null);
  let rueckkehrAnbieten = $state(false);
  let eroeffnetGerade = $state(false);

  const code = $derived((raumcode ?? eingabeCode).trim().toUpperCase());

  // Deko auf dem Spieltisch: Chip-Stapel von der Seite (Mock 2026-11-17-startseite.html, Variante D).
  const GOLD = "#e8bb4f";
  const ROT = "#ff5c6c";
  const GRUEN = "#2fd98c";
  const WEISS = "#dfe3ea";
  const DUNKEL: Record<string, string> = {
    [GOLD]: "#a9822b",
    [ROT]: "#b23443",
    [GRUEN]: "#1c8f5b",
    [WEISS]: "#9096a3",
  };
  const DICKE = 8;

  function chipStapel(farbe: string, anzahl: number, breite: number) {
    const rx = breite / 2 - 2;
    const ry = rx * 0.34;
    const hoehe = ry * 2 + DICKE * anzahl + 4;
    const kante = farbe === WEISS ? "#3b4252" : "#fff6df";
    const lagen = Array.from({ length: anzahl }, (_, i) => {
      const cx = breite / 2 + [0, 1.5, -1, 2, -1.5, 0.5, -2][i % 7];
      const y = hoehe - ry - 2 - DICKE * (i + 1);
      const streifen = [-0.62, 0, 0.62].map((p) => ({
        x: cx + p * rx - rx * 0.09,
        y: y + ry * Math.sqrt(1 - p * p) - 0.5,
      }));
      return { cx, y, streifen };
    });
    return {
      breite,
      hoehe,
      rx,
      ry,
      farbe,
      dunkel: DUNKEL[farbe],
      kante,
      lagen,
    };
  }

  const stapelLinks = [chipStapel(GOLD, 7, 64), chipStapel(ROT, 4, 54)];
  const stapelRechts = [chipStapel(GRUEN, 3, 54), chipStapel(WEISS, 6, 64)];

  async function eroeffnen() {
    fehler = null;
    eroeffnetGerade = true;
    const ergebnis = await raumEroeffnen();
    eroeffnetGerade = false;
    if (ergebnis.ok) {
      onEintritt(ergebnis.raumcode, ergebnis.token, false);
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }

  async function namensAnfrage(weg: "spieler" | "rueckkehr") {
    fehler = null;
    if (!istGueltigerRaumcode(code)) {
      fehler = meldungFuer("raum-unbekannt");
      return;
    }
    // Wer hier schon einen Platz hat, kehrt zurück und überschreibt sein Token nicht.
    const vorhanden = tokenLesen(code);
    if (vorhanden) {
      onEintritt(code, vorhanden, rueckkehrOffen(code));
      return;
    }

    try {
      const antwort = await fetch(`/api/raeume/${code}/${weg}`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (antwort.ok) {
        const daten = (await antwort.json()) as { token: string };
        onEintritt(code, daten.token, weg === "rueckkehr");
        return;
      }

      const fehlercode = await fehlercodeLesen(antwort);
      rueckkehrAnbieten = fehlercode === "name-vergeben";
      fehler = meldungFuer(fehlercode);
    } catch {
      fehler = meldungFuer("keine-verbindung");
    }
  }
</script>

{#snippet stapelBild(s: ReturnType<typeof chipStapel>)}
  <svg
    width={s.breite + 6}
    height={s.hoehe}
    viewBox="-3 0 {s.breite + 6} {s.hoehe}"
  >
    {#each s.lagen as lage, i (i)}
      <path
        d="M{lage.cx - s.rx},{lage.y} v{DICKE} a{s.rx},{s.ry} 0 0 0 {2 *
          s.rx},0 v-{DICKE} z"
        fill={s.dunkel}
      />
      {#each lage.streifen as streifen, j (j)}
        <rect
          x={streifen.x}
          y={streifen.y}
          width={s.rx * 0.18}
          height={DICKE}
          fill={s.kante}
          opacity="0.85"
        />
      {/each}
      <ellipse cx={lage.cx} cy={lage.y} rx={s.rx} ry={s.ry} fill={s.farbe} />
      {#if i === s.lagen.length - 1}
        <ellipse
          cx={lage.cx}
          cy={lage.y}
          rx={s.rx * 0.62}
          ry={s.ry * 0.62}
          fill="none"
          stroke={s.kante}
          stroke-width="1.6"
          stroke-dasharray="4 3"
          opacity="0.8"
        />
      {/if}
    {/each}
  </svg>
{/snippet}

<main class="seite stapel">
  {#if !raumcode}
    <section class="spielidee tisch">
      <h1>Setze deine Chips auf dein Wissen.</h1>
      <p>
        Alle starten mit 100 Chips und setzen, sobald die Kategorie feststeht.
        Erst danach kommt die Frage. Richtig bringt den Einsatz dazu, falsch
        kostet ihn. Am Ende gewinnt, wer die meisten Chips hat.
      </p>
      <span class="deko links" aria-hidden="true">
        {#each stapelLinks as s, i (i)}{@render stapelBild(s)}{/each}
      </span>
      <span class="deko rechts" aria-hidden="true">
        {#each stapelRechts as s, i (i)}{@render stapelBild(s)}{/each}
      </span>
    </section>
  {/if}
  {#if meldung}
    <p class="hinweis">{meldung}</p>
  {/if}
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}

  <div class={raumcode ? "stapel" : "zwei-spalten"}>
    {#if !raumcode}
      <section class="karte stapel">
        <h2>Spielraum eröffnen</h2>
        <p class="matt">
          Du leitest die Partie als Quiz-Master und spielst nicht mit.
        </p>
        <!-- Ohne Konto drei Wege nebeneinander, mit Konto vier im Raster 2×2: oben fertige Quizze, unten eigene. -->
        <div class="wege chip-wege" class:drei={!angemeldet}>
          <div class="weg erster">
            <span class="chip" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <button class="haupt" disabled={eroeffnetGerade} onclick={eroeffnen}
              >Beispiel-Quiz spielen</button
            >
            <p class="matt klein">Sofort los mit dem fest eingebauten Quiz.</p>
          </div>
          <div class="weg">
            <span class="chip gruen" aria-hidden="true">
              <svg viewBox="0 0 24 24"
                ><path
                  d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.2 6.6L12 17.4l-5.8 3.2 1.2-6.6L2.5 9.4l6.6-.8z"
                /></svg
              >
            </span>
            <button disabled={eroeffnetGerade} onclick={onSammlung}
              >Öffentliche Quizze</button
            >
            <p class="matt klein">
              Fertige Quizze anderer Quiz-Master spielen, ohne Konto.
            </p>
          </div>
          {#if angemeldet}
            <div class="weg">
              <span class="chip weiss" aria-hidden="true">
                <svg viewBox="0 0 24 24"
                  ><path d="M6 3h12v18l-6-4.2L6 21z" /></svg
                >
              </span>
              <button disabled={eroeffnetGerade} onclick={onMeineQuizze}
                >Meine Quizze</button
              >
              <p class="matt klein">
                Gespeicherte Quizze spielen oder weiterschreiben.
              </p>
            </div>
          {/if}
          <div class="weg">
            <span class="chip rot" aria-hidden="true">
              <svg viewBox="0 0 24 24"
                ><path
                  d="M4 17.3V20h2.7L17.6 9.1l-2.7-2.7zM19.7 7a1 1 0 000-1.4l-1.3-1.3a1 1 0 00-1.4 0l-1.1 1.1 2.7 2.7z"
                /></svg
              >
            </span>
            <button disabled={eroeffnetGerade} onclick={onEditor}
              >{angemeldet
                ? "Einmal-Quiz erstellen"
                : "Eigenes Quiz erstellen"}</button
            >
            <p class="matt klein">
              Kategorien und Fragen selbst schreiben, ohne Konto. Das
              Einmal-Quiz gilt nur für diesen Spielraum.
            </p>
          </div>
        </div>
      </section>
    {/if}

    <form
      class="karte stapel beitreten"
      onsubmit={(ereignis) => {
        ereignis.preventDefault();
        void namensAnfrage("spieler");
      }}
    >
      <h2>
        {raumcode ? `Spielraum ${raumcode} beitreten` : "Spielraum beitreten"}
      </h2>
      {#if !raumcode}
        <div>
          <label for="code">Raumcode</label>
          <input
            id="code"
            class="code-feld"
            bind:value={eingabeCode}
            oninput={() => (rueckkehrAnbieten = false)}
            maxlength="4"
            autocomplete="off"
          />
        </div>
      {/if}
      <div>
        <label for="name">Dein Name</label>
        <input
          id="name"
          bind:value={name}
          oninput={() => (rueckkehrAnbieten = false)}
          maxlength="20"
          autocomplete="off"
        />
      </div>
      <div class="reihe">
        <button class="haupt" type="submit">Beitreten</button>
        {#if rueckkehrAnbieten}
          <button type="button" onclick={() => namensAnfrage("rueckkehr")}>
            Das bin ich, zurückkehren
          </button>
        {/if}
      </div>
    </form>
  </div>
</main>
