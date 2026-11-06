<script lang="ts">
  import { untrack } from "svelte";
  import Anmelden from "./ansichten/Anmelden.svelte";
  import Aufloesung from "./ansichten/Aufloesung.svelte";
  import Datenschutz from "./ansichten/Datenschutz.svelte";
  import Ende from "./ansichten/Ende.svelte";
  import Konto from "./ansichten/Konto.svelte";
  import PasswortNeu from "./ansichten/PasswortNeu.svelte";
  import QuizEditor from "./ansichten/QuizEditor.svelte";
  import QuizMasterRunde from "./ansichten/QuizMasterRunde.svelte";
  import Quizze from "./ansichten/Quizze.svelte";
  import Registrieren from "./ansichten/Registrieren.svelte";
  import RueckkehrHinweise from "./ansichten/RueckkehrHinweise.svelte";
  import SpielerRunde from "./ansichten/SpielerRunde.svelte";
  import Start from "./ansichten/Start.svelte";
  import Warten from "./ansichten/Warten.svelte";
  import { angemeldeteAdresse } from "./konto";
  import { meldungFuer } from "./meldungen";
  import { quizLaden } from "./quizSammlung";
  import type { Quiz } from "./regeln/partie";
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
  const KONTO_PFADE = [
    "/anmelden",
    "/registrieren",
    "/passwort-neu",
    "/konto",
    "/quizze",
    "/datenschutz",
  ];

  function quizIdAusPfad(): string | null {
    return /^\/quiz\/([0-9a-f-]{36})$/.exec(location.pathname)?.[1] ?? null;
  }

  function kontoPfadAusAdresse(): string | null {
    return KONTO_PFADE.includes(location.pathname) ? location.pathname : null;
  }

  let imEditor = $state(location.pathname === EDITOR_PFAD);
  let kontoPfad = $state(kontoPfadAusAdresse());
  let quizId = $state(quizIdAusPfad());
  // Das gerade geladene Quiz aus dem Konto, null solange es lädt oder fehlt.
  let gespeichertesQuiz = $state<{ id: string; quiz: Quiz } | null>(null);
  let quizFehler = $state<string | null>(null);
  let editorUngespeichert = $state(false);
  // undefined: Der Server hat noch nicht oder mit einem Fehler geantwortet.
  let adresse = $state<string | null | undefined>(undefined);
  let kontoLaedt = $state(false);
  let raumcode = $state(raumcodeAusPfad());
  let token = $state(raumcodeAusPfad() ? tokenLesen(raumcodeAusPfad()!) : null);
  let verbindung = $state<Verbindung | null>(null);
  let startMeldung = $state<string | null>(null);

  // In einer Partie ist das Konto egal, dort bleibt diese Anfrage aus.
  // Nur die neueste Abfrage zählt: Eine langsame alte darf keine frische Anmeldung überschreiben.
  let letzteKontoAbfrage = 0;
  async function kontoLaden() {
    const abfrage = ++letzteKontoAbfrage;
    kontoLaedt = true;
    const ergebnis = await angemeldeteAdresse();
    if (abfrage === letzteKontoAbfrage) {
      adresse = ergebnis;
      kontoLaedt = false;
    }
  }
  function kontoLeeren() {
    letzteKontoAbfrage++;
    kontoLaedt = false;
    adresse = null;
  }
  if (!raumcodeAusPfad()) {
    void kontoLaden();
  }

  $effect(() => {
    const id = quizId;
    untrack(() => {
      gespeichertesQuiz = null;
      quizFehler = null;
      editorUngespeichert = false;
    });
    if (!id) {
      return;
    }
    void quizLaden(id).then((ergebnis) => {
      if (quizId !== id) {
        return;
      }
      if (ergebnis.ok) {
        gespeichertesQuiz = { id, quiz: ergebnis.wert };
      } else if (ergebnis.code === "sitzung-abgelaufen") {
        sitzungAbgelaufen();
      } else {
        quizFehler = meldungFuer(ergebnis.code);
      }
    });
  });

  $effect(() => {
    const brauchtKonto =
      kontoPfad === "/konto" || kontoPfad === "/quizze" || quizId !== null;
    if (brauchtKonto && adresse === null) {
      // Ersetzen statt anhängen: Sonst führt der Zurück-Knopf immer wieder hierher.
      untrack(() => {
        history.replaceState(null, "", "/anmelden");
        adresseUebernehmen();
      });
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
    quizId = quizIdAusPfad();
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

  function zu(pfad: string) {
    if (
      editorUngespeichert &&
      !confirm("Deine Änderungen sind nicht gespeichert. Trotzdem verlassen?")
    ) {
      return;
    }
    editorUngespeichert = false;
    history.pushState(null, "", pfad);
    adresseUebernehmen();
  }

  function zumStart() {
    zu("/");
  }

  function zumEditor() {
    zu(EDITOR_PFAD);
  }

  async function zumKonto() {
    await kontoLaden();
    zu("/konto");
  }

  function kontoVerlassen(meldung: string) {
    kontoLeeren();
    zumStart();
    startMeldung = meldung;
  }

  function sitzungAbgelaufen() {
    kontoLeeren();
    zu("/anmelden");
    startMeldung = meldungFuer("sitzung-abgelaufen");
  }

  function eintreten(
    neuerCode: string,
    neuesToken: string,
    rueckkehr: boolean,
  ) {
    tokenSpeichern(neuerCode, neuesToken, rueckkehr);
    startMeldung = null;
    imEditor = false;
    kontoPfad = null;
    quizId = null;
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
      {#if adresse && kontoPfad === "/quizze"}
        <strong>Meine Quizze</strong>
      {:else if adresse}
        <button class="text" onclick={() => zu("/quizze")}>Meine Quizze</button>
      {/if}
      {#if kontoPfad === "/konto"}
        <strong>Konto</strong>
      {:else if adresse}
        <button class="text" onclick={() => zu("/konto")}>Konto</button>
      {:else if kontoPfad !== "/anmelden"}
        <button class="text" onclick={() => zu("/anmelden")}>Anmelden</button>
      {/if}
    </div>
  {:else if quizId}
    <div class="rest">
      <button class="text" onclick={zumStart}>Zum Start</button>
      <button class="text" onclick={() => zu("/quizze")}>Meine Quizze</button>
      <button class="text" onclick={() => zu("/konto")}>Konto</button>
    </div>
  {:else if !imEditor && !raumcode}
    <div class="rest">
      {#if adresse}
        <button class="text" onclick={() => zu("/quizze")}>Meine Quizze</button>
        <button class="text" onclick={() => zu("/konto")}>Konto</button>
      {:else if !kontoLaedt}
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
  <Anmelden meldung={startMeldung} onAngemeldet={zumKonto} />
{:else if kontoPfad === "/registrieren"}
  <Registrieren onRegistriert={zumKonto} onZurueck={zumStart} />
{:else if kontoPfad === "/passwort-neu"}
  <PasswortNeu
    onGesetzt={() => void kontoLaden()}
    onAnmelden={() => zu("/anmelden")}
    onZurueck={zumStart}
  />
{:else if kontoPfad === "/datenschutz"}
  <Datenschutz />
{:else if kontoPfad === "/quizze" && adresse}
  <Quizze
    onBearbeiten={(id) => zu(`/quiz/${id}`)}
    onEintritt={eintreten}
    onSitzungAbgelaufen={sitzungAbgelaufen}
  />
{:else if quizId}
  {#if gespeichertesQuiz}
    {#key gespeichertesQuiz.id}
      <QuizEditor
        gespeichert={gespeichertesQuiz}
        onEintritt={eintreten}
        onZurueck={() => zu("/quizze")}
        onUngespeichert={(wert) => (editorUngespeichert = wert)}
      />
    {/key}
  {:else}
    <main class="seite stapel">
      {#if quizFehler}
        <p class="hinweis fehler" role="alert">{quizFehler}</p>
        <div>
          <button onclick={() => zu("/quizze")}>Zu meinen Quizzen</button>
        </div>
      {:else}
        <p class="matt">Einen Moment …</p>
      {/if}
    </main>
  {/if}
{:else if kontoPfad === "/konto" || kontoPfad === "/quizze"}
  {#if adresse && kontoPfad === "/konto"}
    <Konto
      {adresse}
      onMeineQuizze={() => zu("/quizze")}
      onAbgemeldet={() => kontoVerlassen("Du bist abgemeldet.")}
      onGeloescht={() => kontoVerlassen("Dein Konto ist gelöscht.")}
      onSitzungAbgelaufen={sitzungAbgelaufen}
    />
  {:else}
    <main class="seite stapel">
      {#if kontoLaedt}
        <p class="matt">Einen Moment …</p>
      {:else}
        <p class="hinweis fehler" role="alert">
          {meldungFuer("keine-verbindung")}
        </p>
        <div><button onclick={kontoLaden}>Noch einmal versuchen</button></div>
      {/if}
    </main>
  {/if}
{:else if imEditor}
  <QuizEditor gespeichert={null} onEintritt={eintreten} onZurueck={zumStart} />
{:else if !raumcode || !token}
  <Start
    {raumcode}
    angemeldet={Boolean(adresse)}
    onMeineQuizze={() => zu("/quizze")}
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

{#if !imEditor && !quizId && !raumcode && kontoPfad !== "/datenschutz"}
  <footer class="seiten-fuss">
    <button class="text" onclick={() => zu("/datenschutz")}>Datenschutz</button>
  </footer>
{/if}
