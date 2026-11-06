<script lang="ts">
  import { meldungFuer } from "../meldungen";
  import {
    geaendertText,
    quizAnlegen,
    quizLaden,
    quizLoeschen,
    quizzeLaden,
    type QuizEintrag,
  } from "../quizSammlung";
  import { raumEroeffnen } from "../raumEroeffnen";
  import { leererEntwurf } from "../regeln/quizEntwurf";
  import { QUIZ_GRENZEN } from "../regeln/quizpruefung";

  interface Props {
    onBearbeiten: (id: string) => void;
    onEintritt: (raumcode: string, token: string, rueckkehr: boolean) => void;
    onSitzungAbgelaufen: () => void;
  }

  let { onBearbeiten, onEintritt, onSitzungAbgelaufen }: Props = $props();

  const HOECHSTENS = QUIZ_GRENZEN.quizzeJeKonto;

  let quizze = $state<QuizEintrag[] | null>(null);
  let fehler = $state<string | null>(null);
  let arbeitet = $state(false);
  const jetzt = new Date();

  const voll = $derived((quizze?.length ?? 0) >= HOECHSTENS);

  function fehlschlag(code: string) {
    if (code === "sitzung-abgelaufen") {
      onSitzungAbgelaufen();
    } else {
      fehler = meldungFuer(code);
    }
  }

  async function laden() {
    fehler = null;
    const ergebnis = await quizzeLaden();
    if (ergebnis.ok) {
      quizze = ergebnis.wert;
    } else {
      fehlschlag(ergebnis.code);
    }
  }
  void laden();

  async function neu() {
    fehler = null;
    arbeitet = true;
    const ergebnis = await quizAnlegen(leererEntwurf());
    arbeitet = false;
    if (ergebnis.ok) {
      onBearbeiten(ergebnis.wert);
    } else {
      fehlschlag(ergebnis.code);
    }
  }

  async function spielen(id: string) {
    fehler = null;
    arbeitet = true;
    const geladen = await quizLaden(id);
    if (!geladen.ok) {
      arbeitet = false;
      fehlschlag(geladen.code);
      return;
    }
    const raum = await raumEroeffnen(geladen.wert);
    arbeitet = false;
    if (raum.ok) {
      onEintritt(raum.raumcode, raum.token, false);
    } else {
      fehler = meldungFuer(raum.code);
    }
  }

  async function loeschen(eintrag: QuizEintrag) {
    const titel = eintrag.titel.trim() || "Ohne Titel";
    if (
      !confirm(
        `„${titel}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`,
      )
    ) {
      return;
    }
    fehler = null;
    arbeitet = true;
    const ergebnis = await quizLoeschen(eintrag.id);
    arbeitet = false;
    if (ergebnis.ok || ergebnis.code === "quiz-unbekannt") {
      quizze = quizze?.filter((quiz) => quiz.id !== eintrag.id) ?? null;
    } else {
      fehlschlag(ergebnis.code);
    }
  }
</script>

<main class="seite stapel">
  <section class="spielidee">
    <h1>Meine Quizze</h1>
    <p class="matt">
      Nur du siehst deine Quizze. Unfertige darfst du speichern, spielen lässt
      sich ein Quiz, sobald es mindestens eine Kategorie mit einer Frage hat und
      kein Feld leer ist.
    </p>
  </section>
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}

  {#if quizze === null}
    {#if !fehler}
      <p class="matt">Einen Moment …</p>
    {:else}
      <div><button onclick={laden}>Noch einmal versuchen</button></div>
    {/if}
  {:else if quizze.length === 0}
    <div class="listenkopf">
      <span class="zaehler"><b>0</b> von {HOECHSTENS} Quizzen</span>
    </div>
    <section class="karte stapel leer-karte">
      <div class="chip"></div>
      <h2>Noch kein Quiz gespeichert</h2>
      <p class="matt" style="max-width: 520px">
        Leg dein erstes Quiz an. Es darf unfertig bleiben, bis du es spielen
        willst. Höchstens {HOECHSTENS} Quizze passen in dein Konto.
      </p>
      <button class="haupt" disabled={arbeitet} onclick={neu}
        >Erstes Quiz anlegen</button
      >
    </section>
  {:else}
    <div class="listenkopf">
      <span class="zaehler"
        ><b>{quizze.length}</b> von {HOECHSTENS} Quizzen</span
      >
    </div>
    <div class="kachel-raster" class:dicht={quizze.length > 10}>
      {#if voll}
        <div class="kachel neu gesperrt">
          <div class="plus-zeichen">+</div>
          <b class="matt">Neues Quiz</b>
          <p class="matt klein">
            {HOECHSTENS} von {HOECHSTENS} belegt. Lösche ein Quiz, um Platz zu schaffen.
          </p>
        </div>
      {:else}
        <button class="kachel neu" disabled={arbeitet} onclick={neu}>
          <div class="plus-zeichen">+</div>
          <b>Neues Quiz</b>
          <span class="matt klein">noch {HOECHSTENS - quizze.length} frei</span>
        </button>
      {/if}
      {#each quizze as eintrag (eintrag.id)}
        <article class="kachel">
          <div class="reihe zwischen">
            {#if eintrag.spielbar}
              <span class="zustand spielbar">spielbar</span>
            {:else}
              <span class="zustand unfertig">unfertig</span>
            {/if}
            <span class="matt klein"
              >geändert {geaendertText(eintrag.geaendertAm, jetzt)}</span
            >
          </div>
          <h2>
            {#if eintrag.titel.trim()}
              {eintrag.titel}
            {:else}
              <span class="ohne-titel">Ohne Titel</span>
            {/if}
          </h2>
          {#if !eintrag.spielbar && quizze.length <= 10}
            <p class="matt klein">Zum Spielen fehlen noch Inhalte.</p>
          {/if}
          <div class="unten">
            {#if eintrag.spielbar}
              <button
                class="klein-knopf spielen"
                disabled={arbeitet}
                onclick={() => spielen(eintrag.id)}>Spielen</button
              >
            {/if}
            <button
              class="klein-knopf"
              disabled={arbeitet}
              onclick={() => onBearbeiten(eintrag.id)}>Bearbeiten</button
            >
            <button
              class="text"
              disabled={arbeitet}
              onclick={() => loeschen(eintrag)}>Löschen</button
            >
          </div>
        </article>
      {/each}
    </div>
  {/if}
</main>
