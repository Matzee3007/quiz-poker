<script lang="ts">
  import type { QuizMasterAnsicht, SpielerAnsicht } from "../regeln/ansicht";

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
  <p class="ueberschrift">
    {namen.length > 1 ? "Gleichstand, gewonnen haben" : "Gewonnen hat"}
  </p>
  <p class="raumcode">{namen.join(" und ")}</p>

  <table>
    <thead>
      <tr>
        <th>Spieler</th>
        <th class="zahl">Chips</th>
      </tr>
    </thead>
    <tbody>
      {#each endstand as spieler (spieler.id)}
        <tr>
          <td><strong>{spieler.name}</strong></td>
          <td class="zahl gold">{spieler.chips}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>
