<script lang="ts">
  import { anmelden } from "../konto";
  import { meldungFuer } from "../meldungen";

  interface Props {
    meldung: string | null;
    onAngemeldet: () => void;
  }

  let { meldung, onAngemeldet }: Props = $props();

  let email = $state("");
  let passwort = $state("");
  let fehler = $state<string | null>(null);
  let sendetGerade = $state(false);

  async function absenden(ereignis: SubmitEvent) {
    ereignis.preventDefault();
    fehler = null;
    sendetGerade = true;
    const ergebnis = await anmelden(email, passwort);
    sendetGerade = false;
    if (ergebnis.ok) {
      onAngemeldet();
    } else {
      fehler = meldungFuer(ergebnis.code);
      passwort = "";
    }
  }
</script>

<main class="seite stapel">
  <section class="spielidee">
    <h1>Anmelden</h1>
    <p class="matt">Zum Spielen brauchst du kein Konto.</p>
  </section>
  {#if meldung && !fehler}
    <p class="hinweis">{meldung}</p>
  {/if}
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}
  <div class="zwei-spalten">
    <form class="karte stapel" onsubmit={absenden}>
      <h2>Deine Zugangsdaten</h2>
      <div class="wege">
        <div>
          <label for="email">E-Mail</label>
          <input
            id="email"
            type="email"
            autocomplete="username"
            required
            bind:value={email}
          />
        </div>
        <div>
          <label for="passwort">Passwort</label>
          <input
            id="passwort"
            type="password"
            autocomplete="current-password"
            required
            bind:value={passwort}
          />
        </div>
      </div>
      <div class="reihe">
        <button class="haupt" disabled={sendetGerade}>Anmelden</button>
      </div>
    </form>
    <section class="karte stapel">
      <h2>Passwort vergessen?</h2>
      <p class="matt klein">
        Melde dich beim Betreiber, der dir auch die Einladung geschickt hat. Du
        bekommst dann einen Link, mit dem du ein neues Passwort setzt. E-Mails
        verschickt diese Seite nicht.
      </p>
    </section>
  </div>
</main>
