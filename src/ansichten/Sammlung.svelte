<script lang="ts">
  import { meldungFuer } from "../meldungen";
  import {
    geaendertText,
    quizKopieren,
    sammlungLaden,
    type SammlungEintrag,
  } from "../quizSammlung";
  import { raumEroeffnen, raumMitQuizEroeffnen } from "../raumEroeffnen";
  import { QUIZ_GRENZEN } from "../regeln/quizpruefung";

  interface Props {
    angemeldet: boolean;
    onEintritt: (raumcode: string, token: string, rueckkehr: boolean) => void;
    /** Öffnet die neue Kopie im Editor. */
    onBearbeiten: (id: string) => void;
    onSitzungAbgelaufen: () => void;
  }

  let { angemeldet, onEintritt, onBearbeiten, onSitzungAbgelaufen }: Props =
    $props();

  const SICHTBARE_KATEGORIEN = 5;

  let quizze = $state<SammlungEintrag[] | null>(null);
  let weiter = $state<string | null>(null);
  let fehler = $state<string | null>(null);
  // Die Meldung beim Kopieren steht in der Karte, weil sie weit unten liegen kann.
  let kartenMeldung = $state<{ id: string; text: string } | null>(null);
  let arbeitet = $state(false);
  const jetzt = new Date();

  /** Ohne Zeiger lädt die erste Seite neu, sonst kommt die nächste Seite dazu. */
  async function laden(zeiger: string | null) {
    arbeitet = true;
    const ergebnis = await sammlungLaden(zeiger);
    arbeitet = false;
    if (ergebnis.ok) {
      quizze =
        zeiger === null
          ? ergebnis.wert.quizze
          : [...(quizze ?? []), ...ergebnis.wert.quizze];
      weiter = ergebnis.wert.weiter;
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }
  void laden(null);

  /** Ein Quiz wurde inzwischen privat gestellt oder gelöscht: Meldung und erste Seite neu. */
  async function verschwunden() {
    fehler = meldungFuer("quiz-unbekannt");
    await laden(null);
  }

  async function spielen(id: string) {
    fehler = null;
    kartenMeldung = null;
    arbeitet = true;
    const raum = await raumMitQuizEroeffnen(id);
    arbeitet = false;
    if (raum.ok) {
      onEintritt(raum.raumcode, raum.token, false);
    } else if (raum.code === "quiz-unbekannt") {
      await verschwunden();
    } else {
      fehler = meldungFuer(raum.code);
    }
  }

  async function beispielSpielen() {
    fehler = null;
    arbeitet = true;
    const raum = await raumEroeffnen();
    arbeitet = false;
    if (raum.ok) {
      onEintritt(raum.raumcode, raum.token, false);
    } else {
      fehler = meldungFuer(raum.code);
    }
  }

  async function kopieren(id: string) {
    fehler = null;
    kartenMeldung = null;
    arbeitet = true;
    const ergebnis = await quizKopieren(id);
    arbeitet = false;
    if (ergebnis.ok) {
      onBearbeiten(ergebnis.wert);
    } else if (ergebnis.code === "quiz-unbekannt") {
      await verschwunden();
    } else if (ergebnis.code === "sitzung-abgelaufen") {
      onSitzungAbgelaufen();
    } else if (ergebnis.code === "zu-viele-quizze") {
      kartenMeldung = {
        id,
        text: `Du hast schon ${QUIZ_GRENZEN.quizzeJeKonto} Quizze gespeichert. Lösche eines in „Meine Quizze“, um Platz für die Kopie zu schaffen.`,
      };
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }
</script>

<main class="seite stapel">
  <section class="spielidee">
    <h1>Öffentliche Quizze</h1>
    <p class="matt">
      Fertige Quizze, die Quiz-Master mit allen teilen. „Spielen“ eröffnet
      sofort einen Spielraum, du leitest ihn als Quiz-Master.
      {angemeldet
        ? "„Kopieren“ legt eine private Kopie in deinen Quizzen an, die du ändern kannst."
        : "Mit einem Konto kannst du ein Quiz auch kopieren und anpassen."}
    </p>
  </section>
  <p class="notiz">
    Öffentliche Quizze kann jeder lesen, auch deine Mitspieler. Wer möchte, kann
    die Lösungen also vorher nachsehen. Für einen fairen Abend eignet sich ein
    eigenes Quiz besser.
  </p>
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}

  {#if quizze === null}
    {#if !fehler}
      <p class="matt">Einen Moment …</p>
    {:else}
      <div>
        <button onclick={() => laden(null)}>Noch einmal versuchen</button>
      </div>
    {/if}
  {:else if quizze.length === 0}
    <section class="karte stapel leer-karte">
      <div class="chip"></div>
      <h2>Noch keine öffentlichen Quizze</h2>
      <p class="matt" style="max-width: 520px">
        Sobald ein Quiz-Master ein fertiges Quiz veröffentlicht, steht es hier.
        Bis dahin kannst du das Beispiel-Quiz spielen.
      </p>
      <button class="haupt" disabled={arbeitet} onclick={beispielSpielen}
        >Beispiel-Quiz spielen</button
      >
    </section>
  {:else}
    <div class="kachel-raster">
      {#each quizze as eintrag (eintrag.id)}
        {@const rest = eintrag.kategorien.length - SICHTBARE_KATEGORIEN}
        <article class="kachel">
          <span class="matt klein"
            >veröffentlicht {geaendertText(
              eintrag.veroeffentlichtAm,
              jetzt,
            )}</span
          >
          <h2>{eintrag.titel}</h2>
          <div class="marken">
            {#each eintrag.kategorien.slice(0, SICHTBARE_KATEGORIEN) as name, index (index)}
              <span class="marke">{name}</span>
            {/each}
            {#if rest > 0}
              <span class="marke mehr">+{rest} weitere</span>
            {/if}
          </div>
          {#if kartenMeldung?.id === eintrag.id}
            <p class="karten-meldung" role="alert">{kartenMeldung.text}</p>
          {/if}
          <div class="unten">
            <button
              class="klein-knopf spielen"
              disabled={arbeitet}
              onclick={() => spielen(eintrag.id)}>Spielen</button
            >
            {#if angemeldet}
              <button
                class="klein-knopf"
                disabled={arbeitet}
                onclick={() => kopieren(eintrag.id)}>Kopieren</button
              >
            {/if}
          </div>
        </article>
      {/each}
    </div>
    <div class="sammlung-fuss">
      {#if weiter}
        <button disabled={arbeitet} onclick={() => laden(weiter)}
          >Mehr laden</button
        >
        <span class="matt klein">{quizze.length} angezeigt</span>
      {:else}
        <span class="matt klein">Das sind alle öffentlichen Quizze.</span>
      {/if}
    </div>
  {/if}
</main>
