<script lang="ts">
  import { untrack } from "svelte";
  import {
    entwurfLesen,
    entwurfLoeschen,
    entwurfSpeichern,
  } from "../entwurfSpeicher";
  import { meldungFuer } from "../meldungen";
  import { quizSpeichern, sichtbarkeitSetzen } from "../quizSammlung";
  import { raumEroeffnen, raumMitQuizEroeffnen } from "../raumEroeffnen";
  import type { Kategorie, Quiz } from "../regeln/partie";
  import { bearbeitbar, verschieben } from "../regeln/quizEntwurf";
  import { QUIZ_GRENZEN, quizPruefen } from "../regeln/quizpruefung";
  import EditorFeld from "./EditorFeld.svelte";

  interface Props {
    /** null: Einmal-Quiz, der Entwurf liegt nur im Browser. Sonst ein Quiz aus dem Konto. */
    gespeichert: { id: string; quiz: Quiz; oeffentlich: boolean } | null;
    onEintritt: (raumcode: string, token: string, rueckkehr: boolean) => void;
    onZurueck: () => void;
    /** Meldet, ob es ungespeicherte Änderungen gibt, damit die Kopfzeile vor dem Verlassen fragen kann. */
    onUngespeichert?: (ungespeichert: boolean) => void;
  }

  let { gespeichert, onEintritt, onZurueck, onUngespeichert }: Props = $props();

  // Nur der Anfangswert zählt: Der Editor arbeitet danach mit seiner eigenen Kopie.
  const anfang = untrack(() => gespeichert);
  let entwurf = $state(
    anfang ? bearbeitbar($state.snapshot(anfang.quiz)) : entwurfLesen(),
  );
  let gespeicherterStand = $state(anfang ? JSON.stringify(entwurf) : "");
  let oeffentlich = $state(anfang?.oeffentlich ?? false);
  let speichertGerade = $state(false);
  let speichernFehlgeschlagen = $state(false);
  let abgelaufen = $state(false);
  const ungespeichert = $derived(
    anfang !== null && JSON.stringify(entwurf) !== gespeicherterStand,
  );
  let gewaehlt = $state(0);
  let leereZeigen = $state(false);
  let fehler = $state<string | null>(null);
  let eroeffnetGerade = $state(false);

  const kategorie = $derived(entwurf.kategorien[gewaehlt]);

  function leereFelder(k: Kategorie): number {
    const felder = [
      k.name,
      ...k.fragen.flatMap((frage) => [frage.text, frage.musterloesung]),
    ];
    return felder.filter((feld) => feld.trim() === "").length;
  }

  const titelLeer = $derived(entwurf.titel.trim() === "");
  const hatLeereFelder = $derived(
    titelLeer || entwurf.kategorien.some((k) => leereFelder(k) > 0),
  );

  $effect(() => {
    if (!anfang) {
      entwurfSpeichern($state.snapshot(entwurf));
    }
  });

  $effect(() => {
    onUngespeichert?.(ungespeichert);
  });

  function vorDemSchliessen(ereignis: BeforeUnloadEvent) {
    if (ungespeichert) {
      ereignis.preventDefault();
    }
  }

  /** Speichert das Quiz im Konto. true, wenn danach nichts Ungespeichertes übrig ist. */
  async function speichern(): Promise<boolean> {
    if (!anfang || !ungespeichert) {
      return true;
    }
    fehler = null;
    abgelaufen = false;
    speichertGerade = true;
    const stand = $state.snapshot(entwurf);
    const ergebnis = await quizSpeichern(anfang.id, stand);
    speichertGerade = false;
    speichernFehlgeschlagen = !ergebnis.ok;
    if (ergebnis.ok) {
      gespeicherterStand = JSON.stringify(stand);
      return true;
    }
    if (ergebnis.code === "sitzung-abgelaufen") {
      abgelaufen = true;
    } else {
      fehler = meldungFuer(ergebnis.code);
      // Ein öffentliches Quiz muss spielbar bleiben: Die leeren Felder zeigen, was fehlt.
      leereZeigen = ergebnis.code === "oeffentlich-unfertig";
    }
    return false;
  }

  async function privatStellen() {
    if (!anfang) {
      return;
    }
    fehler = null;
    abgelaufen = false;
    speichertGerade = true;
    const ergebnis = await sichtbarkeitSetzen(anfang.id, false);
    speichertGerade = false;
    if (ergebnis.ok) {
      oeffentlich = false;
    } else if (ergebnis.code === "sitzung-abgelaufen") {
      abgelaufen = true;
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }

  /** Neue leere Felder sollen nicht sofort rot sein. */
  function neuBeginnen() {
    leereZeigen = false;
    fehler = null;
  }

  function kategorieHinzufuegen() {
    neuBeginnen();
    entwurf.kategorien.push({
      name: "",
      fragen: [{ text: "", musterloesung: "" }],
    });
    gewaehlt = entwurf.kategorien.length - 1;
  }

  function kategorieLoeschen() {
    const leer = leereFelder(kategorie) === 1 + 2 * kategorie.fragen.length;
    if (!leer && !confirm("Kategorie mit ihren Fragen wirklich löschen?")) {
      return;
    }
    entwurf.kategorien.splice(gewaehlt, 1);
    gewaehlt = Math.min(gewaehlt, entwurf.kategorien.length - 1);
  }

  function kategorieVerschieben(index: number, richtung: -1 | 1) {
    const auswahl = entwurf.kategorien[gewaehlt];
    entwurf.kategorien = verschieben(entwurf.kategorien, index, richtung);
    gewaehlt = entwurf.kategorien.indexOf(auswahl);
  }

  function frageHinzufuegen() {
    neuBeginnen();
    kategorie.fragen.push({ text: "", musterloesung: "" });
  }

  async function eroeffnen() {
    fehler = null;
    // Gespielt wird, was gespeichert ist. Auch ein unfertiges Quiz wird vorher gespeichert.
    if (!(await speichern())) {
      return;
    }
    const pruefung = quizPruefen($state.snapshot(entwurf));
    if (!pruefung.ok) {
      if (pruefung.code === "leeres-feld") {
        leereZeigen = true;
        const erste = entwurf.kategorien.findIndex((k) => leereFelder(k) > 0);
        if (erste >= 0) {
          gewaehlt = erste;
        }
      } else {
        fehler = meldungFuer(pruefung.code);
      }
      return;
    }

    eroeffnetGerade = true;
    // Ein gespeichertes Quiz liest der Server selbst, das Einmal-Quiz geht mit.
    const ergebnis = anfang
      ? await raumMitQuizEroeffnen(anfang.id)
      : await raumEroeffnen(pruefung.quiz);
    eroeffnetGerade = false;
    if (ergebnis.ok) {
      if (!anfang) {
        entwurfLoeschen();
      }
      onEintritt(ergebnis.raumcode, ergebnis.token, false);
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }
</script>

<svelte:window onbeforeunload={vorDemSchliessen} />

<!-- Gesperrt, solange eine Anfrage läuft: Ihr Ergebnis führt in den Raum oder ändert den gespeicherten Stand. -->
<fieldset class="editor-sperre" disabled={eroeffnetGerade || speichertGerade}>
  <div class="editor-raster">
    <aside class="editor-leiste">
      <div class="reihe zwischen">
        <h1 class="editor-titel">
          {anfang ? "Quiz bearbeiten" : "Einmal-Quiz erstellen"}
        </h1>
        {#if oeffentlich}
          <span class="sicht oeffentlich">öffentlich</span>
        {/if}
      </div>
      <EditorFeld
        id="quiz-titel"
        label="Titel des Quiz"
        max={QUIZ_GRENZEN.titel}
        {leereZeigen}
        bind:wert={entwurf.titel}
      />

      <div class="reihe zwischen">
        <span class="ueberschrift">Kategorien</span>
        <span class="zaehler"
          ><b>{entwurf.kategorien.length}</b> von {QUIZ_GRENZEN.kategorien}</span
        >
      </div>
      <div class="editor-liste">
        {#each entwurf.kategorien as k, index (k)}
          <div class="editor-zeile" class:an={index === gewaehlt}>
            <button
              class="editor-wahl"
              aria-current={index === gewaehlt}
              onclick={() => (gewaehlt = index)}
            >
              <b class:leer={k.name.trim() === ""}
                >{k.name.trim() || `Kategorie ${index + 1}`}</b
              >
              <small
                >{k.fragen.length} von {QUIZ_GRENZEN.fragenJeKategorie} Fragen</small
              >
              {#if leereZeigen && leereFelder(k) > 0}
                <span class="leer-tag">
                  {leereFelder(k)}
                  {leereFelder(k) === 1 ? "leeres Feld" : "leere Felder"}
                </span>
              {/if}
            </button>
            <div class="editor-pfeile">
              <button
                class="sym"
                aria-label="Kategorie {index + 1} nach oben"
                disabled={index === 0}
                onclick={() => kategorieVerschieben(index, -1)}>↑</button
              >
              <button
                class="sym"
                aria-label="Kategorie {index + 1} nach unten"
                disabled={index === entwurf.kategorien.length - 1}
                onclick={() => kategorieVerschieben(index, 1)}>↓</button
              >
            </div>
          </div>
        {/each}
      </div>
      <div>
        <button
          disabled={entwurf.kategorien.length >= QUIZ_GRENZEN.kategorien}
          onclick={kategorieHinzufuegen}>Kategorie hinzufügen</button
        >
      </div>
      {#if anfang && oeffentlich}
        <div class="notiz">
          Dieses Quiz ist öffentlich: Jeder sieht es in der Sammlung, ohne
          deinen Namen. Es muss spielbar bleiben, gespeicherte Änderungen gelten
          dort sofort.<br />
          <button class="text" onclick={privatStellen}
            >Auf privat stellen</button
          >
        </div>
      {:else}
        <p class="notiz">
          {#if anfang}
            Dieses Quiz liegt in deinem Konto, nur du siehst es. Ein Spielraum
            spielt eine Kopie: Was du danach änderst, gilt erst im nächsten
            Spielraum.
          {:else}
            Dein Entwurf liegt nur in diesem Browser und wird gelöscht, sobald
            du den Spielraum eröffnest. Das Einmal-Quiz besteht nur so lange wie
            sein Spielraum.
          {/if}
        </p>
      {/if}
    </aside>

    <main class="editor-haupt">
      <div class="editor-katkopf">
        <EditorFeld
          id="kategorie-name"
          label="Name der Kategorie {gewaehlt + 1}"
          max={QUIZ_GRENZEN.kategorieName}
          {leereZeigen}
          bind:wert={kategorie.name}
        />
        <button
          class="text"
          disabled={entwurf.kategorien.length === 1}
          onclick={kategorieLoeschen}>Kategorie löschen</button
        >
      </div>

      <div class="reihe zwischen">
        <span class="ueberschrift">Fragen</span>
        <span class="zaehler"
          ><b>{kategorie.fragen.length}</b> von {QUIZ_GRENZEN.fragenJeKategorie} Fragen</span
        >
      </div>

      {#each kategorie.fragen as frage, index (frage)}
        <section class="frage-block">
          <div class="frage-kopf">
            <b>Frage {index + 1}</b>
            <div class="knoepfe">
              <button
                class="sym"
                aria-label="Frage {index + 1} nach oben"
                disabled={index === 0}
                onclick={() =>
                  (kategorie.fragen = verschieben(kategorie.fragen, index, -1))}
                >↑</button
              >
              <button
                class="sym"
                aria-label="Frage {index + 1} nach unten"
                disabled={index === kategorie.fragen.length - 1}
                onclick={() =>
                  (kategorie.fragen = verschieben(kategorie.fragen, index, 1))}
                >↓</button
              >
              <button
                class="text"
                disabled={kategorie.fragen.length === 1}
                onclick={() => kategorie.fragen.splice(index, 1)}
                >Frage löschen</button
              >
            </div>
          </div>
          <EditorFeld
            id="frage-{gewaehlt}-{index}"
            label="Fragetext"
            max={QUIZ_GRENZEN.frage}
            lang
            {leereZeigen}
            bind:wert={frage.text}
          />
          <EditorFeld
            id="loesung-{gewaehlt}-{index}"
            label="Musterlösung"
            max={QUIZ_GRENZEN.musterloesung}
            {leereZeigen}
            bind:wert={frage.musterloesung}
          />
        </section>
      {/each}

      <div>
        <button
          disabled={kategorie.fragen.length >= QUIZ_GRENZEN.fragenJeKategorie}
          onclick={frageHinzufuegen}>Frage hinzufügen</button
        >
      </div>
    </main>
  </div>

  <div class="editor-fuss">
    <!-- Die Rückfrage bei ungespeicherten Änderungen stellt App.svelte, für alle Wege aus dem Editor. -->
    <button class="text" onclick={onZurueck}>
      {anfang ? "Zurück zu Meine Quizze" : "Zurück zum Start"}
    </button>
    {#if anfang}
      {#if ungespeichert && speichernFehlgeschlagen}
        <span class="stand fehlt">Nicht gespeichert</span>
      {:else if ungespeichert}
        <span class="stand offen">Ungespeicherte Änderungen</span>
      {:else}
        <span class="stand ok">Gespeichert</span>
      {/if}
    {/if}
    {#if abgelaufen}
      <div class="hinweis fehler abgelaufen" role="alert">
        <p>
          Deine Anmeldung gilt nicht mehr, das Quiz ist nicht gespeichert. Dein
          Text bleibt hier stehen.
        </p>
        <p>
          Melde dich in einem <a href="/anmelden" target="_blank" rel="noopener"
            >neuen Tab</a
          > an und klicke dann hier noch einmal auf „Speichern“.
        </p>
      </div>
    {:else if fehler}
      <p class="hinweis fehler" role="alert">{fehler}</p>
    {:else if leereZeigen && hatLeereFelder}
      <p class="hinweis fehler" role="alert">
        {anfang && !ungespeichert
          ? "Gespeichert. Zum Spielen fülle bitte alle markierten Felder aus."
          : meldungFuer("leeres-feld")}
      </p>
    {/if}
    {#if anfang}
      <button
        class="speichern"
        disabled={!ungespeichert}
        onclick={() => void speichern()}>Speichern</button
      >
    {/if}
    <button class="haupt" onclick={eroeffnen}>Spielraum eröffnen</button>
  </div>
</fieldset>
