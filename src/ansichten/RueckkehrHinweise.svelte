<script lang="ts">
  import type { Aktion } from "../protokoll";
  import type { QuizMasterAnsicht } from "../regeln/ansicht";

  interface Props {
    anfragen: QuizMasterAnsicht["rueckkehrAnfragen"];
    senden: (aktion: Aktion) => void;
  }

  let { anfragen, senden }: Props = $props();
</script>

{#if anfragen.length > 0}
  <div class="seite stapel" style="padding-bottom: 0">
    {#each anfragen as anfrage (anfrage.spielerId)}
      <div class="hinweis reihe">
        <span>{anfrage.name} möchte zurück.</span>
        <button
          onclick={() =>
            senden({
              typ: "rueckkehr-bestaetigen",
              spielerId: anfrage.spielerId,
            })}
        >
          Bestätigen
        </button>
        <button
          onclick={() =>
            senden({ typ: "rueckkehr-ablehnen", spielerId: anfrage.spielerId })}
        >
          Ablehnen
        </button>
      </div>
    {/each}
  </div>
{/if}
