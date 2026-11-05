<script lang="ts">
  import { passwortNeu } from "../konto";
  import { meldungFuer } from "../meldungen";

  interface Props {
    onAnmelden: () => void;
    onZurueck: () => void;
  }

  let { onAnmelden, onZurueck }: Props = $props();

  // Nach dem ersten Absenden steht das Token nicht mehr in der Adresse, ein zweiter Versuch nimmt es von hier.
  const token = new URLSearchParams(location.search).get("token");

  let passwort = $state("");
  let fehler = $state<string | null>(null);
  let zustand = $state<"eingabe" | "geklappt" | "ungueltig">(
    token === null ? "ungueltig" : "eingabe",
  );
  let sendetGerade = $state(false);

  async function absenden(ereignis: SubmitEvent) {
    ereignis.preventDefault();
    if (token === null) {
      return;
    }
    fehler = null;
    sendetGerade = true;
    history.replaceState(null, "", location.pathname);
    const ergebnis = await passwortNeu(token, passwort);
    sendetGerade = false;
    if (ergebnis.ok) {
      zustand = "geklappt";
    } else if (ergebnis.code === "link-ungueltig") {
      zustand = "ungueltig";
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }
</script>

<main class="seite stapel">
  {#if zustand === "geklappt"}
    <section class="spielidee"><h1>Neues Passwort setzen</h1></section>
    <p class="hinweis">Dein neues Passwort gilt.</p>
    <section class="karte stapel">
      <p class="matt">
        Du bist auf allen Geräten abgemeldet. Melde dich jetzt mit dem neuen
        Passwort an.
      </p>
      <div class="reihe">
        <button class="haupt" onclick={onAnmelden}>Zum Anmelden</button>
      </div>
    </section>
  {:else if zustand === "ungueltig"}
    <section class="spielidee"><h1>Neues Passwort setzen</h1></section>
    <p class="hinweis fehler" role="alert">{meldungFuer("link-ungueltig")}</p>
    <section class="karte stapel">
      <p class="matt">
        Ein Link gilt 24 Stunden und nur einmal. Bitte den Betreiber um einen
        neuen.
      </p>
      <div class="reihe"><button onclick={onZurueck}>Zum Start</button></div>
    </section>
  {:else}
    <section class="spielidee">
      <h1>Neues Passwort setzen</h1>
      <p class="matt">
        Der Betreiber hat dir diesen Link geschickt. Er gilt einmal.
      </p>
    </section>
    {#if fehler}
      <p class="hinweis fehler" role="alert">{fehler}</p>
    {/if}
    <div class="zwei-spalten">
      <form class="karte stapel" onsubmit={absenden}>
        <h2>Dein neues Passwort</h2>
        <div class="wege">
          <div>
            <label for="passwort">Neues Passwort</label>
            <input
              id="passwort"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="128"
              bind:value={passwort}
            />
            <p class="matt klein feld-hilfe">Mindestens 8 Zeichen</p>
          </div>
        </div>
        <div class="reihe">
          <button class="haupt" disabled={sendetGerade}
            >Passwort speichern</button
          >
        </div>
      </form>
      <section class="karte stapel">
        <h2>Danach</h2>
        <p class="matt klein">
          Du bist auf allen Geräten abgemeldet und meldest dich mit dem neuen
          Passwort an.
        </p>
      </section>
    </div>
  {/if}
</main>
