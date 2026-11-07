<script lang="ts">
  import { meldungFuer } from "../meldungen";
  import {
    geaendertText,
    quizAnlegen,
    quizLoeschen,
    quizzeLaden,
    sichtbarkeitSetzen,
    type QuizEintrag,
  } from "../quizSammlung";
  import { raumMitQuizEroeffnen } from "../raumEroeffnen";
  import { BEISPIEL_QUIZ } from "../regeln/beispielQuiz";
  import type { Quiz } from "../regeln/partie";
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

  /** Legt ein Quiz an und öffnet es im Editor: leer oder als Kopie des Beispiel-Quiz. */
  async function anlegen(quiz: Quiz) {
    fehler = null;
    arbeitet = true;
    const ergebnis = await quizAnlegen(quiz);
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
    const raum = await raumMitQuizEroeffnen(id);
    arbeitet = false;
    if (raum.ok) {
      onEintritt(raum.raumcode, raum.token, false);
    } else {
      fehlschlag(raum.code);
    }
  }

  async function umschalten(eintrag: QuizEintrag) {
    fehler = null;
    arbeitet = true;
    const ergebnis = await sichtbarkeitSetzen(eintrag.id, !eintrag.oeffentlich);
    arbeitet = false;
    if (ergebnis.ok) {
      eintrag.oeffentlich = ergebnis.wert !== null;
    } else {
      fehlschlag(ergebnis.code);
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
      Deine Quizze sind privat, bis du sie veröffentlichst. Ein öffentliches
      Quiz sieht jeder unter „Öffentliche Quizze“, ohne deinen Namen. Spielen
      und veröffentlichen lässt sich ein Quiz, sobald es mindestens eine
      Kategorie mit einer Frage hat und kein Feld leer ist.
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
      <button disabled={arbeitet} onclick={() => anlegen(BEISPIEL_QUIZ)}
        >Beispiel-Quiz als Vorlage</button
      >
    </div>
    <section class="karte stapel leer-karte">
      <div class="chip"></div>
      <h2>Noch kein Quiz gespeichert</h2>
      <p class="matt" style="max-width: 560px">
        Leg dein erstes Quiz an oder beginne mit einer Kopie des Beispiel-Quiz
        und ändere es nach deinen Wünschen. Höchstens {HOECHSTENS} Quizze passen in
        dein Konto.
      </p>
      <div class="reihe" style="flex-wrap: wrap; justify-content: center">
        <button
          class="haupt"
          disabled={arbeitet}
          onclick={() => anlegen(leererEntwurf())}>Erstes Quiz anlegen</button
        >
        <button disabled={arbeitet} onclick={() => anlegen(BEISPIEL_QUIZ)}
          >Beispiel-Quiz als Vorlage</button
        >
      </div>
    </section>
  {:else}
    <div class="listenkopf">
      <span class="zaehler"
        ><b>{quizze.length}</b> von {HOECHSTENS} Quizzen</span
      >
      <button disabled={arbeitet || voll} onclick={() => anlegen(BEISPIEL_QUIZ)}
        >Beispiel-Quiz als Vorlage</button
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
        <button
          class="kachel neu"
          disabled={arbeitet}
          onclick={() => anlegen(leererEntwurf())}
        >
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
            <!-- Ein unfertiges Quiz kann nicht öffentlich werden, ein öffentliches ist immer spielbar. -->
            <button
              class="schalter"
              class:an={eintrag.oeffentlich}
              role="switch"
              aria-checked={eintrag.oeffentlich}
              aria-label="Öffentlich"
              title={eintrag.spielbar
                ? undefined
                : "Nur ein fertiges Quiz kann öffentlich werden."}
              disabled={arbeitet || (!eintrag.spielbar && !eintrag.oeffentlich)}
              onclick={() => umschalten(eintrag)}
            >
              <span>{eintrag.oeffentlich ? "öffentlich" : "privat"}</span>
              <span class="bahn"></span>
            </button>
          </div>
          <h2>
            {#if eintrag.titel.trim()}
              {eintrag.titel}
            {:else}
              <span class="ohne-titel">Ohne Titel</span>
            {/if}
          </h2>
          <span class="matt klein"
            >geändert {geaendertText(
              eintrag.geaendertAm,
              jetzt,
            )}{eintrag.oeffentlich ? " · steht in der Sammlung" : ""}</span
          >
          {#if !eintrag.spielbar && quizze.length <= 10}
            <p class="matt klein">
              Zum Spielen und Veröffentlichen fehlen noch Inhalte.
            </p>
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
