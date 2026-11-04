<script lang="ts">
  import type { Aktion } from "../protokoll";
  import type { QuizMasterAnsicht, SpielerAnsicht } from "../regeln/ansicht";
  import EntfernenKnopf from "./EntfernenKnopf.svelte";

  interface Props {
    ansicht: SpielerAnsicht | QuizMasterAnsicht;
    senden: (aktion: Aktion) => void;
  }

  let { ansicht, senden }: Props = $props();

  const ichId = $derived(ansicht.rolle === "spieler" ? ansicht.ichId : null);
  const reihenfolge = $derived(
    [...ansicht.spieler].sort((links, rechts) => rechts.chips - links.chips),
  );

  function platzVon(chips: number): number {
    return reihenfolge.findIndex((spieler) => spieler.chips === chips) + 1;
  }
</script>

<main class="seite stapel">
  <section class="frage-loesung">
    <div class="stapel">
      <p class="ueberschrift">Frage</p>
      <p class="frage">{ansicht.frage}</p>
    </div>
    <div class="karte">
      <p class="ueberschrift">Musterlösung</p>
      <p class="loesung">{ansicht.musterloesung}</p>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th class="zahl">Platz</th>
        <th>Spieler</th>
        <th class="zahl">Einsatz</th>
        <th>Antwort</th>
        <th>Ergebnis</th>
        <th class="zahl">Änderung</th>
        <th class="zahl">Chips</th>
        {#if ansicht.rolle === "quiz-master"}
          <th></th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each reihenfolge as spieler (spieler.id)}
        {@const einsatz = spieler.einsatz ?? 0}
        <tr>
          <td class="zahl">{platzVon(spieler.chips)}</td>
          <td>
            <strong>{spieler.name}</strong>
            {#if spieler.id === ichId}<span class="matt">(du)</span>{/if}
          </td>
          {#if spieler.spieltMit}
            <td class="zahl gold">{einsatz}</td>
            <td>{spieler.antwort ?? "keine Antwort"}</td>
            <td class={spieler.richtig ? "plus" : "minus"}>
              {spieler.richtig ? "Richtig" : "Falsch"}
            </td>
            <td
              class="zahl"
              class:plus={spieler.richtig && einsatz > 0}
              class:minus={!spieler.richtig && einsatz > 0}
            >
              {einsatz === 0 ? "" : spieler.richtig ? "+" : "−"}{einsatz}
            </td>
          {:else}
            <td class="zahl matt">–</td>
            <td class="matt" colspan="3">spielt ab der nächsten Runde mit</td>
          {/if}
          <td class="zahl gold">{spieler.chips}</td>
          {#if ansicht.rolle === "quiz-master"}
            <td>
              <EntfernenKnopf id={spieler.id} name={spieler.name} {senden} />
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  {#if ansicht.rolle === "quiz-master"}
    <div class="reihe" style="justify-content: flex-end">
      <button class="haupt" onclick={() => senden({ typ: "naechste-runde" })}>
        Weiter
      </button>
    </div>
  {:else}
    <p class="matt">Der Quiz-Master schaltet gleich weiter …</p>
  {/if}
</main>
