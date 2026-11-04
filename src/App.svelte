<script lang="ts">
  import { untrack } from "svelte";
  import Aufloesung from "./ansichten/Aufloesung.svelte";
  import Ende from "./ansichten/Ende.svelte";
  import QuizEditor from "./ansichten/QuizEditor.svelte";
  import QuizMasterRunde from "./ansichten/QuizMasterRunde.svelte";
  import RueckkehrHinweise from "./ansichten/RueckkehrHinweise.svelte";
  import SpielerRunde from "./ansichten/SpielerRunde.svelte";
  import Start from "./ansichten/Start.svelte";
  import Warten from "./ansichten/Warten.svelte";
  import { meldungFuer } from "./meldungen";
  import { istGueltigerRaumcode } from "./regeln/raumcode";
  import {
    tokenLesen,
    rueckkehrOffen,
    tokenLoeschen,
    tokenSpeichern,
    Verbindung,
  } from "./verbindung.svelte";

  function raumcodeAusPfad(): string | null {
    const treffer = /^\/raum\/([^/]+)$/.exec(location.pathname);
    const code = treffer?.[1].toUpperCase();
    return code && istGueltigerRaumcode(code) ? code : null;
  }

  const EDITOR_PFAD = "/quiz-erstellen";

  let imEditor = $state(location.pathname === EDITOR_PFAD);
  let raumcode = $state(raumcodeAusPfad());
  let token = $state(raumcodeAusPfad() ? tokenLesen(raumcodeAusPfad()!) : null);
  let verbindung = $state<Verbindung | null>(null);
  let startMeldung = $state<string | null>(null);

  $effect(() => {
    if (!raumcode || !token) {
      return;
    }
    const neu = new Verbindung(raumcode, token);
    untrack(() => {
      verbindung = neu;
    });
    return () => neu.beenden();
  });

  $effect(() => {
    const code = raumcode;
    if (!code) {
      return;
    }
    if (verbindung?.zustand === "unbekannt") {
      // Die Adresse bleibt: Das Namensfeld des Raums führt direkt zurück ins Spiel.
      const warGewartet = rueckkehrOffen(code);
      tokenLoeschen(code);
      untrack(() => {
        startMeldung = warGewartet
          ? "Deine Rückkehr wurde nicht bestätigt oder ist abgelaufen. Du kannst sie neu anfragen."
          : "Dein Platz in diesem Spielraum gilt nicht mehr.";
        verbindung = null;
        token = null;
      });
    } else if (verbindung?.zustand === "geschlossen") {
      tokenLoeschen(code);
    }
  });

  function adresseUebernehmen() {
    const code = raumcodeAusPfad();
    const neuesToken = code ? tokenLesen(code) : null;
    startMeldung = null;
    imEditor = location.pathname === EDITOR_PFAD;
    // Gleicher Raum und gleiches Token: Die offene Verbindung bleibt gültig.
    if (code === raumcode && neuesToken === token) {
      return;
    }
    verbindung = null;
    raumcode = code;
    token = neuesToken;
  }

  function zumStart() {
    history.pushState(null, "", "/");
    adresseUebernehmen();
  }

  function zumEditor() {
    history.pushState(null, "", EDITOR_PFAD);
    adresseUebernehmen();
  }

  function eintreten(
    neuerCode: string,
    neuesToken: string,
    rueckkehr: boolean,
  ) {
    tokenSpeichern(neuerCode, neuesToken, rueckkehr);
    startMeldung = null;
    imEditor = false;
    raumcode = neuerCode;
    token = neuesToken;
    if (raumcodeAusPfad() !== neuerCode) {
      history.pushState(null, "", `/raum/${neuerCode}`);
    }
  }

  const SCHRITTE = [
    ["einsatz", "Einsatz"],
    ["antworten", "Antwort"],
    ["auswertung", "Auswertung"],
    ["aufgeloest", "Auflösung"],
  ] as const;
</script>

<svelte:window onpopstate={adresseUebernehmen} />

<header class="kopf">
  <span class="logo">Quiz-Poker</span>
  {#if imEditor}
    <span class="matt rest">Einmal-Quiz erstellen, ohne Konto</span>
  {/if}
  {#if raumcode && token}
    <span class="matt">Spielraum <strong>{raumcode}</strong></span>
  {/if}
  {#if verbindung?.ansicht?.kategorie}
    <span class="matt">
      Kategorie <strong>{verbindung.ansicht.kategorie}</strong> · Runde
      <strong
        >{verbindung.ansicht.rundeInKategorie} von {verbindung.ansicht
          .rundenInKategorie}</strong
      >
    </span>
  {/if}
  {#if verbindung?.ansicht}
    <div class="rest">
      {#each SCHRITTE as [phase, name] (phase)}
        <span class="schritt" class:an={verbindung.ansicht.phase === phase}
          >{name}</span
        >
      {/each}
      <strong
        >{verbindung.ansicht.rolle === "quiz-master"
          ? "Quiz-Master"
          : "Spieler"}</strong
      >
    </div>
  {/if}
</header>

{#if imEditor}
  <QuizEditor onEintritt={eintreten} onZurueck={zumStart} />
{:else if !raumcode || !token}
  <Start
    {raumcode}
    meldung={startMeldung}
    onEintritt={eintreten}
    onEditor={zumEditor}
  />
{:else if verbindung?.zustand === "geschlossen"}
  <main class="seite stapel">
    <p class="hinweis">Dieser Spielraum wurde geschlossen.</p>
    <div><button onclick={zumStart}>Zum Start</button></div>
  </main>
{:else if verbindung?.zustand === "ersetzt"}
  <main class="seite stapel">
    <p class="hinweis">
      Dieser Platz wurde auf einem anderen Gerät geöffnet, oder du wurdest
      entfernt.
    </p>
    <div><button onclick={zumStart}>Zum Start</button></div>
  </main>
{:else if verbindung?.zustand === "wartet"}
  <main class="seite stapel">
    <p class="hinweis">Warten auf die Bestätigung durch den Quiz-Master …</p>
  </main>
{:else if verbindung?.ansicht}
  {#if verbindung.fehler}
    <div class="seite" style="padding-bottom: 0">
      <p class="hinweis fehler" role="alert">
        {meldungFuer(verbindung.fehler)}
      </p>
    </div>
  {/if}
  {#if verbindung.zustand === "verbinden"}
    <div class="seite" style="padding-bottom: 0">
      <p class="hinweis">Verbindung unterbrochen, wird wiederhergestellt …</p>
    </div>
  {/if}
  {#if verbindung.ansicht.rolle === "quiz-master"}
    <RueckkehrHinweise
      anfragen={verbindung.ansicht.rueckkehrAnfragen}
      senden={(aktion) => verbindung?.senden(aktion)}
    />
  {/if}
  {#if verbindung.ansicht.phase === "warten"}
    <Warten
      ansicht={verbindung.ansicht}
      {raumcode}
      senden={(aktion) => verbindung?.senden(aktion)}
    />
  {:else if verbindung.ansicht.phase === "beendet"}
    <Ende ansicht={verbindung.ansicht} />
  {:else if verbindung.ansicht.phase === "aufgeloest"}
    <Aufloesung
      ansicht={verbindung.ansicht}
      senden={(aktion) => verbindung?.senden(aktion)}
    />
  {:else if verbindung.ansicht.rolle === "quiz-master"}
    <QuizMasterRunde
      ansicht={verbindung.ansicht}
      senden={(aktion) => verbindung?.senden(aktion)}
    />
  {:else}
    {#key `${verbindung.ansicht.kategorie}-${verbindung.ansicht.rundeInKategorie}`}
      <SpielerRunde
        ansicht={verbindung.ansicht}
        senden={(aktion) => verbindung?.senden(aktion)}
      />
    {/key}
  {/if}
  {#if verbindung.ansicht.rolle === "quiz-master"}
    <div class="seite" style="padding-top: 0">
      <button
        class="text"
        onclick={() => {
          if (
            confirm("Spielraum wirklich schließen? Die Partie endet damit.")
          ) {
            verbindung?.senden({ typ: "raum-schliessen" });
          }
        }}
      >
        Spielraum schließen
      </button>
    </div>
  {/if}
{:else}
  <main class="seite"><p class="matt">Verbinden …</p></main>
{/if}
