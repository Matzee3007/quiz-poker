<script lang="ts">
  import type { Aktion } from "../protokoll";
  import { mindesteinsatzFuer } from "../regeln/chips";
  import type { SpielerAnsicht } from "../regeln/ansicht";
  import Rangliste from "./Rangliste.svelte";

  interface Props {
    ansicht: SpielerAnsicht;
    senden: (aktion: Aktion) => void;
  }

  let { ansicht, senden }: Props = $props();

  const ich = $derived(
    ansicht.spieler.find((spieler) => spieler.id === ansicht.ichId),
  );
  const chips = $derived(ich?.chips ?? 0);
  const minimum = $derived(mindesteinsatzFuer(chips));
  const spieltMit = $derived(ich?.spieltMit ?? false);

  let einsatzEingabe = $state<number | null>(null);
  let antwort = $state("");
  const einsatz = $derived(einsatzEingabe ?? minimum);
</script>

<main class="seite zwei-spalten">
  <section class="karte stapel">
    {#if !spieltMit}
      <p class="hinweis">Du spielst ab der nächsten Runde mit.</p>
    {/if}

    {#if ansicht.phase === "einsatz"}
      <p class="ueberschrift">Kategorie</p>
      <p class="frage">{ansicht.kategorie}</p>
      {#if spieltMit}
        <p class="grosszahl">{einsatz}</p>
        <label for="einsatz">Dein Einsatz ({minimum} bis {chips} Chips)</label>
        <input
          id="einsatz"
          type="range"
          min={minimum}
          max={chips}
          value={einsatz}
          oninput={(ereignis) => {
            einsatzEingabe = Number(ereignis.currentTarget.value);
          }}
        />
        <div class="reihe">
          <button
            class="haupt"
            onclick={() => senden({ typ: "einsatz-setzen", einsatz })}
          >
            {ich?.hatGesetzt ? "Einsatz ändern" : "Einsatz setzen"}
          </button>
          <button onclick={() => (einsatzEingabe = chips)}>Alle Chips</button>
        </div>
        <p class="matt">
          {#if ich?.hatGesetzt}
            Gesetzt: {ich.einsatz} Chips. Du kannst noch ändern, bis die Frage erscheint.
          {:else}
            Bei Richtig hast du {chips + einsatz} Chips, bei Falsch {chips -
              einsatz}.
          {/if}
        </p>
      {/if}
    {:else if ansicht.phase === "antworten"}
      <p class="ueberschrift">Frage</p>
      <p class="frage">{ansicht.frage}</p>
      {#if spieltMit}
        <p class="matt">Dein Einsatz: {ich?.einsatz ?? 0} Chips</p>
        {#if ich?.istBereit}
          <p>Deine Antwort: <strong>{ich.antwort}</strong></p>
          <div>
            <button onclick={() => senden({ typ: "antwort-zuruecknehmen" })}>
              Bereit lösen und ändern
            </button>
          </div>
        {:else}
          <div>
            <label for="antwort">Deine Antwort ({antwort.length} von 200)</label
            >
            <textarea id="antwort" bind:value={antwort} maxlength="200"
            ></textarea>
          </div>
          <div>
            <button
              class="haupt"
              disabled={antwort.trim() === ""}
              onclick={() =>
                senden({ typ: "antwort-bestaetigen", text: antwort })}
            >
              Bereit
            </button>
          </div>
        {/if}
      {/if}
    {:else}
      <p class="ueberschrift">Frage</p>
      <p class="frage">{ansicht.frage}</p>
      <p class="matt">Der Quiz-Master wertet gerade aus …</p>
      {#if ich?.antwort}
        <p>Deine Antwort: <strong>{ich.antwort}</strong></p>
      {/if}
    {/if}

    <div>
      <p class="ueberschrift">
        {ansicht.phase === "einsatz" ? "Wer hat gesetzt" : "Wer ist bereit"}
      </p>
      {#each ansicht.spieler.filter((spieler) => spieler.spieltMit) as spieler (spieler.id)}
        <div class="rangliste-zeile">
          <span>{spieler.name}</span>
          <span class="matt">
            {#if ansicht.phase === "einsatz"}
              {spieler.hatGesetzt ? "hat gesetzt" : "wählt noch"}
            {:else}
              {spieler.istBereit ? "bereit" : "antwortet noch"}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </section>

  <Rangliste spieler={ansicht.spieler} ichId={ansicht.ichId} />
</main>
