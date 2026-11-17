<script lang="ts">
  import ChipStapel from "./ChipStapel.svelte";
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

<main class="seite stapel">
  {#if !raumcode}
    <section class="spielidee tisch">
      <h1>Setze deine Chips auf dein Wissen.</h1>
      <p>
        Alle starten mit 100 Chips und setzen, sobald die Kategorie feststeht.
        Erst danach kommt die Frage. Richtig bringt den Einsatz dazu, falsch
        kostet ihn. Am Ende gewinnt, wer die meisten Chips hat.
      </p>
      <!-- Chip-Stapel als Deko (Mock 2026-11-17-startseite.html, Variante D) -->
      <span class="deko links">
        <ChipStapel farbe="gold" anzahl={7} breite={64} />
        <ChipStapel farbe="rot" anzahl={4} breite={54} />
      </span>
      <span class="deko rechts">
        <ChipStapel farbe="gruen" anzahl={3} breite={54} />
        <ChipStapel farbe="weiss" anzahl={6} breite={64} />
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
            <span class="weg-chip" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <button class="haupt" disabled={eroeffnetGerade} onclick={eroeffnen}
              >Beispiel-Quiz spielen</button
            >
            <p class="matt klein">Sofort los mit dem fest eingebauten Quiz.</p>
          </div>
          <div class="weg">
            <span class="weg-chip gruen" aria-hidden="true">
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
              <span class="weg-chip weiss" aria-hidden="true">
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
            <span class="weg-chip rot" aria-hidden="true">
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
