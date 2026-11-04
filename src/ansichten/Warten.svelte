<script lang="ts">
  import type { Aktion } from "../protokoll";
  import type { QuizMasterAnsicht, SpielerAnsicht } from "../regeln/ansicht";
  import EntfernenKnopf from "./EntfernenKnopf.svelte";

  interface Props {
    ansicht: SpielerAnsicht | QuizMasterAnsicht;
    raumcode: string;
    senden: (aktion: Aktion) => void;
  }

  let { ansicht, raumcode, senden }: Props = $props();

  const link = $derived(`${location.origin}/raum/${raumcode}`);
  let kopierText = $state("Link kopieren");

  async function kopieren() {
    try {
      // Ohne sichere Verbindung gibt es navigator.clipboard nicht, der Aufruf schlägt dann fehl.
      await navigator.clipboard.writeText(link);
      kopierText = "Kopiert";
    } catch {
      kopierText = "Bitte von Hand kopieren";
    }
  }
</script>

<main class="seite zwei-spalten">
  <section class="karte stapel">
    <p class="ueberschrift">Raumcode</p>
    <p class="raumcode">{raumcode}</p>
    <div class="reihe">
      <span class="matt">{link}</span>
      <button onclick={kopieren}>{kopierText}</button>
    </div>
    <p class="matt">Quiz: <strong>{ansicht.quizTitel}</strong></p>
    {#if ansicht.rolle === "quiz-master"}
      <div>
        <button
          class="haupt"
          disabled={ansicht.spieler.length < 2}
          onclick={() => senden({ typ: "partie-starten" })}
        >
          Partie starten
        </button>
      </div>
      {#if ansicht.spieler.length < 2}
        <p class="matt">Zum Start braucht es mindestens 2 Spieler.</p>
      {/if}
    {:else}
      <p class="matt">Warten auf den Quiz-Master …</p>
    {/if}
  </section>

  <aside class="karte">
    <p class="ueberschrift">Spieler ({ansicht.spieler.length} von 8)</p>
    {#each ansicht.spieler as spieler (spieler.id)}
      <div class="rangliste-zeile">
        <span>
          <span class="punkt" class:an={spieler.verbunden}></span>{spieler.name}
        </span>
        <span class="reihe">
          <span class="gold">{spieler.chips}</span>
          {#if ansicht.rolle === "quiz-master"}
            <EntfernenKnopf id={spieler.id} name={spieler.name} {senden} />
          {/if}
        </span>
      </div>
    {/each}
  </aside>
</main>
