<script lang="ts">
  import {
    platzVon,
    type QuizMasterAnsicht,
    type SpielerAnsicht,
  } from "../regeln/ansicht";

  interface Props {
    ansicht: SpielerAnsicht | QuizMasterAnsicht;
  }

  let { ansicht }: Props = $props();

  const namen = $derived(
    ansicht.spieler
      .filter((spieler) => ansicht.sieger.includes(spieler.id))
      .map((spieler) => spieler.name),
  );
  const endstand = $derived(
    [...ansicht.spieler].sort((links, rechts) => rechts.chips - links.chips),
  );
</script>

<main class="seite stapel">
  {#if namen.length === 0}
    <p class="ueberschrift">Partie beendet</p>
    <p class="matt">Es ist kein Spieler mehr im Spielraum.</p>
  {:else}
    <p class="ueberschrift">
      {namen.length > 1 ? "Gleichstand, gewonnen haben" : "Gewonnen hat"}
    </p>
    <p class="raumcode">{namen.join(" und ")}</p>
  {/if}

  <section class="podest" aria-label="Podest">
    {#each endstand.slice(0, 3) as spieler (spieler.id)}
      <div
        class="podest-platz"
        class:erster={ansicht.sieger.includes(spieler.id)}
      >
        <p class="ueberschrift">
          Platz {platzVon(ansicht.spieler, spieler.chips)}
        </p>
        <p><strong>{spieler.name}</strong></p>
        <p class="chips">{spieler.chips}</p>
      </div>
    {/each}
  </section>

  <table>
    <thead>
      <tr>
        <th class="zahl">Platz</th>
        <th>Spieler</th>
        <th class="zahl">Chips</th>
      </tr>
    </thead>
    <tbody>
      {#each endstand as spieler (spieler.id)}
        <tr>
          <td class="zahl">{platzVon(ansicht.spieler, spieler.chips)}</td>
          <td><strong>{spieler.name}</strong></td>
          <td class="zahl gold">{spieler.chips}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>
