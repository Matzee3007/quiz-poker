<script lang="ts">
  import type { Aktion } from "../protokoll";
  import type { QuizMasterAnsicht } from "../regeln/ansicht";
  import EntfernenKnopf from "./EntfernenKnopf.svelte";

  interface Props {
    ansicht: QuizMasterAnsicht;
    senden: (aktion: Aktion) => void;
  }

  let { ansicht, senden }: Props = $props();

  const mitspielende = $derived(
    ansicht.spieler.filter((spieler) => spieler.spieltMit),
  );
  const offen = $derived(
    mitspielende.filter(
      (spieler) => spieler.antwort !== null && spieler.richtig === null,
    ).length,
  );
  const fehlende = $derived(
    mitspielende.filter((spieler) =>
      ansicht.phase === "einsatz" ? !spieler.hatGesetzt : !spieler.istBereit,
    ).length,
  );
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
        <th>Verbindung</th>
        <th>Spieler</th>
        <th class="zahl">Chips</th>
        <th class="zahl">Einsatz</th>
        <th>Antwort</th>
        {#if ansicht.phase === "auswertung"}
          <th>Auswertung</th>
        {/if}
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each ansicht.spieler as spieler (spieler.id)}
        <tr>
          <td>
            <span class="punkt" class:an={spieler.verbunden}></span>
            {spieler.verbunden ? "verbunden" : "getrennt"}
          </td>
          <td><strong>{spieler.name}</strong></td>
          <td class="zahl">{spieler.chips}</td>
          <td class="zahl gold">
            {spieler.spieltMit ? (spieler.einsatz ?? "–") : "nächste Runde"}
          </td>
          <td>{spieler.antwort ?? "–"}</td>
          {#if ansicht.phase === "auswertung"}
            <td>
              {#if spieler.antwort !== null}
                <div class="reihe">
                  <button
                    class:richtig-an={spieler.richtig === true}
                    onclick={() =>
                      senden({
                        typ: "antwort-auswerten",
                        spielerId: spieler.id,
                        richtig: true,
                      })}
                  >
                    Richtig
                  </button>
                  <button
                    class:falsch-an={spieler.richtig === false}
                    onclick={() =>
                      senden({
                        typ: "antwort-auswerten",
                        spielerId: spieler.id,
                        richtig: false,
                      })}
                  >
                    Falsch
                  </button>
                </div>
              {:else if spieler.spieltMit}
                <span class="matt">keine Antwort, zählt als falsch</span>
              {/if}
            </td>
          {/if}
          <td>
            <EntfernenKnopf id={spieler.id} name={spieler.name} {senden} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="reihe" style="justify-content: flex-end">
    {#if ansicht.phase === "einsatz"}
      <span class="matt">
        {fehlende > 0
          ? `${fehlende} noch ohne Einsatz, das zählt als 0.`
          : "Alle haben gesetzt."}
      </span>
      <button class="haupt" onclick={() => senden({ typ: "frage-zeigen" })}>
        Frage zeigen
      </button>
    {:else if ansicht.phase === "antworten"}
      <span class="matt">
        {fehlende > 0
          ? `${fehlende} noch nicht bereit, das zählt als falsch.`
          : "Alle sind bereit."}
      </span>
      <button
        class="haupt"
        onclick={() => senden({ typ: "auswertung-starten" })}
      >
        Auswertung starten
      </button>
    {:else}
      <span class="matt">
        {offen > 0 ? `Noch ${offen} ohne Auswertung.` : "Alles ausgewertet."}
      </span>
      <button
        class="haupt"
        disabled={offen > 0}
        onclick={() => senden({ typ: "aufloesen" })}
      >
        Auflösen
      </button>
    {/if}
  </div>
</main>
