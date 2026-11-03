<script lang="ts">
  import type { Aktion } from "../protokoll";

  interface Props {
    id: string;
    name: string;
    senden: (aktion: Aktion) => void;
  }

  let { id, name, senden }: Props = $props();
</script>

<button
  class="text"
  onclick={() => {
    if (confirm(`${name} wirklich aus der Partie entfernen?`)) {
      senden({ typ: "spieler-entfernen", spielerId: id });
    }
  }}
>
  Entfernen
</button>
