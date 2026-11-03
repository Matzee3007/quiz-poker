<script lang="ts">
  import type { SpielerZeile } from "../regeln/ansicht";

  interface Props {
    spieler: SpielerZeile[];
    ichId?: string;
  }

  let { spieler, ichId }: Props = $props();

  const sortiert = $derived(
    [...spieler].sort((links, rechts) => rechts.chips - links.chips),
  );
</script>

<aside class="karte">
  <p class="ueberschrift">Rangliste</p>
  {#each sortiert as zeile (zeile.id)}
    <div class="rangliste-zeile" class:ich={zeile.id === ichId}>
      <span>
        <span class="punkt" class:an={zeile.verbunden}></span>{zeile.name}
      </span>
      <span>{zeile.chips}</span>
    </div>
  {/each}
</aside>
