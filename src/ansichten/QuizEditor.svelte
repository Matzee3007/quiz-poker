<script lang="ts">
  import {
    entwurfLesen,
    entwurfLoeschen,
    entwurfSpeichern,
  } from "../entwurfSpeicher";
  import { meldungFuer } from "../meldungen";
  import { raumEroeffnen } from "../raumEroeffnen";
  import type { Kategorie } from "../regeln/partie";
  import { verschieben } from "../regeln/quizEntwurf";
  import { QUIZ_GRENZEN, quizPruefen } from "../regeln/quizpruefung";
  import EditorFeld from "./EditorFeld.svelte";

  interface Props {
    onEintritt: (raumcode: string, token: string, rueckkehr: boolean) => void;
    onZurueck: () => void;
  }

  let { onEintritt, onZurueck }: Props = $props();

  let entwurf = $state(entwurfLesen());
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
    entwurfSpeichern($state.snapshot(entwurf));
  });

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
    const ergebnis = await raumEroeffnen(pruefung.quiz);
    eroeffnetGerade = false;
    if (ergebnis.ok) {
      entwurfLoeschen();
      onEintritt(ergebnis.raumcode, ergebnis.token, false);
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }
</script>

<!-- Gesperrt, solange die Anfrage läuft: Ihr Ergebnis führt in den Raum und löscht den Entwurf. -->
<fieldset class="editor-sperre" disabled={eroeffnetGerade}>
  <div class="editor-raster">
    <aside class="editor-leiste">
      <h1 class="editor-titel">Einmal-Quiz erstellen</h1>
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
      <p class="notiz">
        Dein Entwurf liegt nur in diesem Browser und wird gelöscht, sobald du
        den Spielraum eröffnest. Das Einmal-Quiz besteht nur so lange wie sein
        Spielraum.
      </p>
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
    <button class="text" onclick={onZurueck}>Zurück zum Start</button>
    {#if fehler}
      <p class="hinweis fehler" role="alert">{fehler}</p>
    {:else if leereZeigen && hatLeereFelder}
      <p class="hinweis fehler" role="alert">{meldungFuer("leeres-feld")}</p>
    {/if}
    <button class="haupt" onclick={eroeffnen}>Spielraum eröffnen</button>
  </div>
</fieldset>
