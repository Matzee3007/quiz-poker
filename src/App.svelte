<script lang="ts">
  import { untrack } from "svelte";
  import Anmelden from "./ansichten/Anmelden.svelte";
  import Aufloesung from "./ansichten/Aufloesung.svelte";
  import Ende from "./ansichten/Ende.svelte";
  import Konto from "./ansichten/Konto.svelte";
  import PasswortNeu from "./ansichten/PasswortNeu.svelte";
  import QuizEditor from "./ansichten/QuizEditor.svelte";
  import QuizMasterRunde from "./ansichten/QuizMasterRunde.svelte";
  import Registrieren from "./ansichten/Registrieren.svelte";
  import RueckkehrHinweise from "./ansichten/RueckkehrHinweise.svelte";
  import SpielerRunde from "./ansichten/SpielerRunde.svelte";
  import Start from "./ansichten/Start.svelte";
  import Warten from "./ansichten/Warten.svelte";
  import { angemeldeteAdresse } from "./konto";
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
  const KONTO_PFADE = ["/anmelden", "/registrieren", "/passwort-neu", "/konto"];

  function kontoPfadAusAdresse(): string | null {
    return KONTO_PFADE.includes(location.pathname) ? location.pathname : null;
  }

  let imEditor = $state(location.pathname === EDITOR_PFAD);
  let kontoPfad = $state(kontoPfadAusAdresse());
  // undefined: Der Server hat noch nicht geantwortet.
  let adresse = $state<string | null | undefined>(undefined);
  let raumcode = $state(raumcodeAusPfad());
  let token = $state(raumcodeAusPfad() ? tokenLesen(raumcodeAusPfad()!) : null);
  let verbindung = $state<Verbindung | null>(null);
  let startMeldung = $state<string | null>(null);

  // In einer Partie ist das Konto egal, dort bleibt diese Anfrage aus.
  async function kontoLaden() {
    adresse = await angemeldeteAdresse();
  }
  if (!raumcodeAusPfad()) {
    void kontoLaden();
  }

  $effect(() => {
    if (kontoPfad === "/konto" && adresse === null) {
      untrack(() => zu("/anmelden"));
    }
  });

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
    kontoPfad = kontoPfadAusAdresse();
    // Wer direkt in einem Spielraum startete, hat das Konto noch nicht geladen.
    if (adresse === undefined && !code) {
      void kontoLaden();
    }
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

  function zu(pfad: string) {
    history.pushState(null, "", pfad);
    adresseUebernehmen();
  }

  async function zumKonto() {
    await kontoLaden();
    zu("/konto");
  }

  function kontoVerlassen(meldung: string) {
    adresse = null;
    zumStart();
    startMeldung = meldung;
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
  {#if kontoPfad}
    <div class="rest">
      <button class="text" onclick={zumStart}>Zum Start</button>
      {#if kontoPfad === "/konto"}
        <strong>Konto</strong>
      {:else if kontoPfad !== "/anmelden"}
        <button class="text" onclick={() => zu("/anmelden")}>Anmelden</button>
      {/if}
    </div>
  {:else if !imEditor && !raumcode}
    <div class="rest">
      {#if adresse}
        <button class="text" onclick={() => zu("/konto")}>Konto</button>
      {:else if adresse === null}
        <span>Spielen geht ohne Konto</span>
        <button class="text" onclick={() => zu("/anmelden")}>Anmelden</button>
      {/if}
    </div>
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

{#if kontoPfad === "/anmelden"}
  <Anmelden onAngemeldet={zumKonto} />
{:else if kontoPfad === "/registrieren"}
  <Registrieren onRegistriert={zumKonto} onZurueck={zumStart} />
{:else if kontoPfad === "/passwort-neu"}
  <PasswortNeu onAnmelden={() => zu("/anmelden")} onZurueck={zumStart} />
{:else if kontoPfad === "/konto"}
  {#if adresse}
    <Konto
      {adresse}
      onAbgemeldet={() => kontoVerlassen("Du bist abgemeldet.")}
      onGeloescht={() => kontoVerlassen("Dein Konto ist gelöscht.")}
    />
  {:else}
    <main class="seite"><p class="matt">Einen Moment …</p></main>
  {/if}
{:else if imEditor}
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
    {#key verbindung.ansicht.rundeNummer}
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
