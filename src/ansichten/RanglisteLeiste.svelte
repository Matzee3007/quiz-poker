<script lang="ts">
  import { platzVon, type SpielerZeile } from "../regeln/ansicht";
  import Rangliste from "./Rangliste.svelte";

  interface Props {
    spieler: SpielerZeile[];
    ichId: string;
  }

  let { spieler, ichId }: Props = $props();

  let offen = $state(false);
  const chips = $derived(
    spieler.find((zeile) => zeile.id === ichId)?.chips ?? 0,
  );
  const platz = $derived(platzVon(spieler, chips));
</script>

<!-- Nur auf dem Handy sichtbar (stil.css), am Desktop steht die Rangliste daneben. -->
<div class="rang-leiste-rahmen">
  <button
    class="rang-leiste"
    class:offen
    aria-expanded={offen}
    onclick={() => (offen = !offen)}
  >
    <span class="platz-nr">{platz}.</span>
    <span>Platz {platz} von {spieler.length}</span>
    <span class="chips">{chips}</span>
    <span class="matt">Chips</span>
    <span class="auf">Rangliste {offen ? "▴" : "▾"}</span>
  </button>
  {#if offen}
    <div class="rang-panel" aria-label="Rangliste" role="region">
      <Rangliste {spieler} {ichId} />
    </div>
  {/if}
</div>
