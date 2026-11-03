<script lang="ts">
  import type { Aktion } from "../protokoll";
  import type { QuizMasterAnsicht, SpielerAnsicht } from "../regeln/ansicht";

  interface Props {
    ansicht: SpielerAnsicht | QuizMasterAnsicht;
    senden: (aktion: Aktion) => void;
  }

  let { ansicht, senden }: Props = $props();

  const mitspielende = $derived(
    ansicht.spieler
      .filter((spieler) => spieler.spieltMit)
      .sort((links, rechts) => rechts.chips - links.chips),
  );
</script>

<main class="seite stapel">
  <section class="reihe" style="align-items: flex-start; gap: 32px">
    <div class="stapel" style="flex: 1">
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
        <th>Spieler</th>
        <th>Antwort</th>
        <th>Ergebnis</th>
        <th class="zahl">Änderung</th>
        <th class="zahl">Chips</th>
      </tr>
    </thead>
    <tbody>
      {#each mitspielende as spieler (spieler.id)}
        {@const einsatz = spieler.einsatz ?? 0}
        <tr>
          <td><strong>{spieler.name}</strong></td>
          <td>{spieler.antwort ?? "keine Antwort"}</td>
          <td class={spieler.richtig ? "plus" : "minus"}>
            {spieler.richtig ? "Richtig" : "Falsch"}
          </td>
          <td
            class="zahl"
            class:plus={spieler.richtig}
            class:minus={!spieler.richtig}
          >
            {einsatz === 0 ? "" : spieler.richtig ? "+" : "−"}{einsatz}
          </td>
          <td class="zahl gold">{spieler.chips}</td>
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
    <p class="matt">Der Quiz-Master startet gleich die nächste Runde …</p>
  {/if}
</main>
