<script lang="ts">
  import { abmelden, kontoLoeschen } from "../konto";
  import { meldungFuer } from "../meldungen";
  import { quizzeLaden } from "../quizSammlung";
  import { QUIZ_GRENZEN } from "../regeln/quizpruefung";

  interface Props {
    adresse: string;
    onAbgemeldet: () => void;
    onGeloescht: () => void;
    onSitzungAbgelaufen: () => void;
    onMeineQuizze: () => void;
  }

  let {
    adresse,
    onAbgemeldet,
    onGeloescht,
    onSitzungAbgelaufen,
    onMeineQuizze,
  }: Props = $props();

  // Nur zur Anzeige: Scheitert die Abfrage, fehlt die Zahl einfach.
  let anzahl = $state<number | null>(null);
  void quizzeLaden().then((ergebnis) => {
    if (ergebnis.ok) {
      anzahl = ergebnis.wert.length;
    }
  });

  let loeschenOffen = $state(false);
  let passwort = $state("");
  let fehler = $state<string | null>(null);
  let loeschFehler = $state<string | null>(null);
  let sendetGerade = $state(false);

  async function abmeldenKlick() {
    fehler = null;
    sendetGerade = true;
    const ergebnis = await abmelden();
    sendetGerade = false;
    if (ergebnis.ok) {
      onAbgemeldet();
    } else {
      fehler = meldungFuer(ergebnis.code);
    }
  }

  async function loeschen(ereignis: SubmitEvent) {
    ereignis.preventDefault();
    loeschFehler = null;
    sendetGerade = true;
    const ergebnis = await kontoLoeschen(passwort);
    sendetGerade = false;
    if (ergebnis.ok) {
      onGeloescht();
    } else if (ergebnis.code === "sitzung-abgelaufen") {
      onSitzungAbgelaufen();
    } else {
      loeschFehler = meldungFuer(ergebnis.code);
    }
  }

  function abbrechen() {
    loeschenOffen = false;
    passwort = "";
    loeschFehler = null;
  }
</script>

<main class="seite stapel">
  <section class="spielidee">
    <h1>Dein Konto</h1>
  </section>
  {#if fehler}
    <p class="hinweis fehler" role="alert">{fehler}</p>
  {/if}
  <div class="zwei-spalten">
    <section class="karte stapel">
      <div class="ueberschrift">Angemeldet als</div>
      <p class="adresse gold">{adresse}</p>
      <div class="reihe">
        <button disabled={sendetGerade} onclick={abmeldenKlick}>Abmelden</button
        >
      </div>
      <div class="stapel linie-oben">
        <div class="reihe zwischen">
          <h2>Meine Quizze</h2>
          {#if anzahl !== null}
            <span class="zaehler"
              ><b>{anzahl}</b> von {QUIZ_GRENZEN.quizzeJeKonto}</span
            >
          {/if}
        </div>
        <p class="matt klein">
          Deine gespeicherten Quizze, nur für dich sichtbar.
        </p>
        <div><button onclick={onMeineQuizze}>Zu meinen Quizzen</button></div>
      </div>
    </section>
    {#if loeschenOffen}
      <form class="karte stapel" onsubmit={loeschen}>
        <h2>Konto löschen</h2>
        {#if loeschFehler}
          <p class="hinweis fehler" role="alert">{loeschFehler}</p>
        {/if}
        <p class="notiz warnung klein">
          Das Löschen ist endgültig. Deine Adresse, dein Passwort und deine
          Quizze werden sofort entfernt, und niemand kann das Konto
          wiederherstellen. Spielen kannst du weiter ohne Konto.
        </p>
        <div class:feld-fehler={loeschFehler !== null}>
          <label for="passwort">Passwort zur Bestätigung</label>
          <input
            id="passwort"
            type="password"
            autocomplete="current-password"
            required
            bind:value={passwort}
          />
        </div>
        <button class="falsch-an voll" disabled={sendetGerade}
          >Konto endgültig löschen</button
        >
        <button class="voll" type="button" onclick={abbrechen}>Abbrechen</button
        >
      </form>
    {:else}
      <section class="karte stapel">
        <h2>Konto löschen</h2>
        <p class="matt klein">
          Entfernt deine Adresse, dein Passwort und deine Quizze.
        </p>
        <div>
          <button onclick={() => (loeschenOffen = true)}>Konto löschen</button>
        </div>
      </section>
    {/if}
  </div>
</main>
