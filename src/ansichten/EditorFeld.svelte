<script lang="ts">
  interface Props {
    id: string;
    label: string;
    wert: string;
    max: number;
    /** Leere Felder werden erst nach dem ersten Eröffnen-Versuch rot. */
    leereZeigen: boolean;
    lang?: boolean;
  }

  let {
    id,
    label,
    wert = $bindable(),
    max,
    leereZeigen,
    lang = false,
  }: Props = $props();

  const fehlt = $derived(leereZeigen && wert.trim() === "");
</script>

<div class="feld" class:feld-fehler={fehlt}>
  <label for={id}>{label}</label>
  {#if lang}
    <textarea
      {id}
      rows="3"
      maxlength={max}
      autocomplete="off"
      aria-invalid={fehlt}
      bind:value={wert}></textarea>
  {:else}
    <input
      {id}
      maxlength={max}
      autocomplete="off"
      aria-invalid={fehlt}
      bind:value={wert}
    />
  {/if}
  <div class="feld-unten">
    {#if fehlt}
      <span class="feld-meldung">Bitte ausfüllen</span>
    {/if}
    <span class="zeichen" class:nah={wert.length >= max * 0.9}
      >{wert.length} von {max}</span
    >
  </div>
</div>
