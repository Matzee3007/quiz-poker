<script lang="ts">
  import { registrieren } from "../konto";
  import { meldungFuer } from "../meldungen";

  interface Props {
    onRegistriert: () => void;
    onZurueck: () => void;
  }

  let { onRegistriert, onZurueck }: Props = $props();

  // Nach dem ersten Absenden steht der Code nicht mehr in der Adresse, ein zweiter Versuch nimmt ihn von hier.
  const code = new URLSearchParams(location.search).get("code");

  let email = $state("");
  let passwort = $state("");
  let fehler = $state<string | null>(null);
  let adresseVergeben = $state(false);
  let gueltig = $state(code !== null);
  let sendetGerade = $state(false);

  async function absenden(ereignis: SubmitEvent) {
    ereignis.preventDefault();
    if (code === null) {
      return;
    }
    fehler = null;
    adresseVergeben = false;
    sendetGerade = true;
    history.replaceState(null, "", location.pathname);
    const ergebnis = await registrieren(code, email, passwort);
    sendetGerade = false;
    if (ergebnis.ok) {
      onRegistriert();
    } else if (ergebnis.code === "einladung-ungueltig") {
      gueltig = false;
    } else {
      fehler = meldungFuer(ergebnis.code);
      adresseVergeben = ergebnis.code === "email-vergeben";
    }
  }
</script>

<main class="seite stapel">
  {#if !gueltig}
    <section class="spielidee"><h1>Konto anlegen</h1></section>
    <p class="hinweis fehler" role="alert">
      {meldungFuer("einladung-ungueltig")}
    </p>
    <section class="karte stapel">
      <p class="matt">
        Eine Einladung gilt für genau ein Konto. Bitte den Betreiber um eine
        neue.
      </p>
      <div class="reihe"><button onclick={onZurueck}>Zum Start</button></div>
    </section>
  {:else}
    <section class="spielidee">
      <h1>Du bist eingeladen.</h1>
      <p class="matt">Leg dein Konto an. Die Einladung gilt für ein Konto.</p>
    </section>
    {#if fehler}
      <p class="hinweis fehler" role="alert">{fehler}</p>
    {/if}
    <div class="zwei-spalten">
      <form class="karte stapel" onsubmit={absenden}>
        <h2>Konto anlegen</h2>
        <div class="wege">
          <div class:feld-fehler={adresseVergeben}>
            <label for="email">E-Mail</label>
            <input
              id="email"
              type="email"
              autocomplete="username"
              required
              bind:value={email}
            />
            {#if adresseVergeben}
              <p class="matt klein feld-hilfe">
                Deine Einladung gilt weiter. Nimm eine andere Adresse oder melde
                dich mit dieser an.
              </p>
            {/if}
          </div>
          <div>
            <label for="passwort">Passwort</label>
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
          <button class="haupt" disabled={sendetGerade}>Konto anlegen</button>
        </div>
      </form>
      <section class="karte stapel">
        <h2>Merk dir deine Adresse</h2>
        <p class="matt klein">
          Deine E-Mail-Adresse ist nur dein Login-Name. Sie wird nicht geprüft,
          und diese Seite schreibt dir nie. Merk sie dir also genau so, wie du
          sie hier eintippst.
        </p>
      </section>
    </div>
  {/if}
</main>
