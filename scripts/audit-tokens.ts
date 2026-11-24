import { PHYSICAL_TOKEN_LIST, type ThemeMode } from "../src/lib/design/tokens";
import {
  contrastOklchOnHex,
  isWithinSrgbGamut,
  oklchToHex,
} from "../src/lib/design/contrast";

const themes: ThemeMode[] = ["dark-lab", "light-editorial"];

for (const p of PHYSICAL_TOKEN_LIST) {
  for (const t of themes) {
    for (const k of ["trace", "ink"] as const) {
      const col = p.oklch[t][k];
      let maxC = col.c;
      while (maxC > 0 && !isWithinSrgbGamut({ ...col, c: maxC })) {
        maxC -= 0.002;
      }
      const bg = t === "dark-lab" ? "#11141B" : "#F1F3F6";
      const bgElevated = t === "dark-lab" ? "#171B24" : "#FFFFFF";
      console.log(
        [
          p.key.padEnd(11),
          t.padEnd(16),
          k.padEnd(6),
          `inGamut=${String(isWithinSrgbGamut(col)).padEnd(5)}`,
          `c=${col.c.toFixed(3)}`,
          `maxC=${maxC.toFixed(3)}`,
          `hex=${oklchToHex(col)}`,
          `CR(panel)=${contrastOklchOnHex(col, bg).toFixed(2)}`,
          `CR(elev)=${contrastOklchOnHex(col, bgElevated).toFixed(2)}`,
        ].join("  ")
      );
    }
  }
}
