<script lang="ts">
  import { untrack } from "svelte";
  import Start from "./ansichten/Start.svelte";
  import Warten from "./ansichten/Warten.svelte";
  import { meldungFuer } from "./meldungen";
  import { istGueltigerRaumcode } from "./regeln/raumcode";
  import {
    tokenLesen,
    tokenLoeschen,
    tokenSpeichern,
    Verbindung,
  } from "./verbindung.svelte";

  function raumcodeAusPfad(): string | null {
    const treffer = /^\/raum\/([^/]+)$/.exec(location.pathname);
    return treffer && istGueltigerRaumcode(treffer[1]) ? treffer[1] : null;
  }

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
    if (verbindung?.zustand === "unbekannt" && raumcode) {
      tokenLoeschen(raumcode);
      untrack(() => {
        startMeldung = "Dein Platz in diesem Spielraum gilt nicht mehr.";
        zumStart();
      });
    }
  });

  function zumStart() {
    verbindung = null;
    token = null;
    raumcode = null;
    history.pushState(null, "", "/");
  }

  function eintreten(neuerCode: string, neuesToken: string) {
    tokenSpeichern(neuerCode, neuesToken);
    startMeldung = null;
    raumcode = neuerCode;
    token = neuesToken;
    history.pushState(null, "", `/raum/${neuerCode}`);
  }

  const SCHRITTE = [
    ["einsatz", "Einsatz"],
    ["antworten", "Antwort"],
    ["auswertung", "Auswertung"],
    ["aufgeloest", "Auflösung"],
  ] as const;
</script>

<header class="kopf">
  <span class="logo">Quiz-Poker</span>
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

{#if !raumcode || !token}
  <Start {raumcode} meldung={startMeldung} onEintritt={eintreten} />
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
  {#if verbindung.ansicht.phase === "warten"}
    <Warten
      ansicht={verbindung.ansicht}
      {raumcode}
      senden={(aktion) => verbindung?.senden(aktion)}
    />
  {:else}
    <main class="seite"><p class="matt">Die Partie läuft.</p></main>
  {/if}
{:else}
  <main class="seite"><p class="matt">Verbinden …</p></main>
{/if}
