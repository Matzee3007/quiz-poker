<script lang="ts">
  import { meldungFuer } from "../meldungen";

  interface Props {
    raumcode: string | null;
    meldung: string | null;
    onEintritt: (raumcode: string, token: string) => void;
  }

  let { raumcode, meldung, onEintritt }: Props = $props();

  let eingabeCode = $state("");
  let name = $state("");
  let fehler = $state<string | null>(null);
  let rueckkehrAnbieten = $state(false);

  const code = $derived((raumcode ?? eingabeCode).trim().toUpperCase());

  async function codeLesen(antwort: Response): Promise<string> {
    const daten = (await antwort.json().catch(() => ({}))) as { code?: string };
    return daten.code ?? "";
  }

  async function eroeffnen() {
    fehler = null;
    const antwort = await fetch("/api/raeume", { method: "POST" });
    if (!antwort.ok) {
      fehler = meldungFuer(await codeLesen(antwort));
      return;
    }
    const daten = (await antwort.json()) as {
      raumcode: string;
      token: string;
    };
    onEintritt(daten.raumcode, daten.token);
  }

  async function namensAnfrage(weg: "spieler" | "rueckkehr") {
    fehler = null;
    const antwort = await fetch(`/api/raeume/${code}/${weg}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (antwort.ok) {
      const daten = (await antwort.json()) as { token: string };
      onEintritt(code, daten.token);
      return;
    }

    const fehlercode = await codeLesen(antwort);
    rueckkehrAnbieten = fehlercode === "name-vergeben";
    fehler = meldungFuer(fehlercode || "raum-unbekannt");
  }
</script>

<main class="seite stapel">
  {#if meldung}
    <p class="hinweis">{meldung}</p>
  {/if}
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}

  <div class={raumcode ? "stapel" : "zwei-spalten"}>
    {#if !raumcode}
      <section class="karte stapel">
        <h2>Spielraum eröffnen</h2>
        <p class="matt">
          Du leitest die Partie als Quiz-Master und spielst nicht mit.
        </p>
        <div>
          <button class="haupt" onclick={eroeffnen}>Spielraum eröffnen</button>
        </div>
      </section>
    {/if}

    <form
      class="karte stapel"
      onsubmit={(ereignis) => {
        ereignis.preventDefault();
        void namensAnfrage("spieler");
      }}
    >
      <h2>
        {raumcode ? `Spielraum ${raumcode} beitreten` : "Spielraum beitreten"}
      </h2>
      {#if !raumcode}
        <div>
          <label for="code">Raumcode</label>
          <input
            id="code"
            bind:value={eingabeCode}
            maxlength="4"
            autocomplete="off"
          />
        </div>
      {/if}
      <div>
        <label for="name">Dein Name</label>
        <input id="name" bind:value={name} maxlength="20" autocomplete="off" />
      </div>
      <div class="reihe">
        <button class="haupt" type="submit">Beitreten</button>
        {#if rueckkehrAnbieten}
          <button type="button" onclick={() => namensAnfrage("rueckkehr")}>
            Das bin ich, zurückkehren
          </button>
        {/if}
      </div>
    </form>
  </div>
</main>
