<script lang="ts">
  // Deko: ein Stapel Chips von der Seite. Die Farben kommen aus stil.css (.chip-stapel).
  interface Props {
    farbe: "gold" | "rot" | "gruen" | "weiss";
    anzahl: number;
    breite: number;
  }

  let { farbe, anzahl, breite }: Props = $props();

  const DICKE = 8;
  // Leicht versetzte Lagen, damit der Stapel nicht wie ein Zylinder aussieht.
  const VERSATZ = [0, 1.5, -1, 2, -1.5, 0.5, -2];

  const rx = $derived(breite / 2 - 2);
  const ry = $derived(rx * 0.34);
  const hoehe = $derived(ry * 2 + DICKE * anzahl + 4);
  const lagen = $derived(
    Array.from({ length: anzahl }, (_, i) => {
      const cx = breite / 2 + VERSATZ[i % VERSATZ.length];
      const y = hoehe - ry - 2 - DICKE * (i + 1);
      const streifen = [-0.62, 0, 0.62].map((p) => ({
        x: cx + p * rx - rx * 0.09,
        y: y + ry * Math.sqrt(1 - p * p) - 0.5,
      }));
      return { cx, y, streifen };
    }),
  );
</script>

<svg
  class="chip-stapel {farbe}"
  width={breite + 6}
  height={hoehe}
  viewBox="-3 0 {breite + 6} {hoehe}"
  aria-hidden="true"
>
  {#each lagen as lage, i (i)}
    <path
      class="seite"
      d="M{lage.cx - rx},{lage.y} v{DICKE} a{rx},{ry} 0 0 0 {2 *
        rx},0 v-{DICKE} z"
    />
    {#each lage.streifen as streifen, j (j)}
      <rect
        class="streifen"
        x={streifen.x}
        y={streifen.y}
        width={rx * 0.18}
        height={DICKE}
      />
    {/each}
    <ellipse class="oben" cx={lage.cx} cy={lage.y} {rx} {ry} />
    {#if i === lagen.length - 1}
      <ellipse
        class="ring"
        cx={lage.cx}
        cy={lage.y}
        rx={rx * 0.62}
        ry={ry * 0.62}
      />
    {/if}
  {/each}
</svg>
