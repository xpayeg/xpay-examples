import type { Appearance } from "@xpayeg/react";

/**
 * Convert HSL (h: 0-360, s/l: 0-100) to a 6-digit hex string.
 *
 * We generate colors in HSL internally because hue/sat/lightness lets us
 * express "a color from this hue family at this lightness range"
 * ergonomically. But the SDK's `Appearance` only accepts hex (the
 * server-side `ColorCustomizationInputDto` `@Matches` validator rejects
 * anything else on save; `getContrastColor`'s WCAG auto-derivation only
 * parses hex too).
 */
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const chroma = (1 - Math.abs(2 * lig - 1)) * sat;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
  const [r1, g1, b1] =
    hPrime < 1
      ? [chroma, x, 0]
      : hPrime < 2
        ? [x, chroma, 0]
        : hPrime < 3
          ? [0, chroma, x]
          : hPrime < 4
            ? [0, x, chroma]
            : hPrime < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = lig - chroma / 2;
  const toHex = (c: number) =>
    Math.round((c + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function randomHex(h: number, s: [number, number], l: [number, number]) {
  const sat = s[0] + Math.random() * (s[1] - s[0]);
  const lig = l[0] + Math.random() * (l[1] - l[0]);
  return hslToHex(h, sat, lig);
}

/**
 * Generate a random SDK appearance config that respects the current theme.
 * Colors are harmonious — built from a single random hue with
 * lightness ranges tuned for dark vs light mode readability. Every
 * color is a hex string so the backend accepts it on save and the
 * client-side WCAG contrast helpers work against it.
 */
export function generateRandomAppearance(isDark: boolean): Appearance {
  const hue = Math.random() * 360;

  const borderStyles = ["rounded", "sharp", "pill"] as const;
  const spacings = ["condensed", "normal", "spacious"] as const;
  const inputSizes = ["small", "medium", "large"] as const;
  const inputStyles = ["flat", "outlined", "filled"] as const;
  const formLayouts = ["compact", "spacious"] as const;

  const primary = randomHex(hue, [50, 80], isDark ? [55, 70] : [40, 55]);
  const accentHue = (hue + 90 + Math.random() * 180) % 360;

  return {
    colorMode: isDark ? "dark" : "light",
    borderStyle: borderStyles[Math.floor(Math.random() * borderStyles.length)]!,
    spacing: spacings[Math.floor(Math.random() * spacings.length)]!,
    inputSize: inputSizes[Math.floor(Math.random() * inputSizes.length)]!,
    inputStyle: inputStyles[Math.floor(Math.random() * inputStyles.length)]!,
    formLayout: formLayouts[Math.floor(Math.random() * formLayouts.length)]!,
    colors: {
      primary,
      primaryForeground: isDark ? "#0d0d0d" : "#fafafa",
      background: isDark
        ? randomHex(hue, [5, 15], [5, 12])
        : randomHex(hue, [5, 15], [95, 99]),
      foreground: isDark
        ? randomHex(hue, [5, 10], [88, 95])
        : randomHex(hue, [5, 10], [5, 12]),
      border: isDark
        ? randomHex(hue, [8, 15], [18, 25])
        : randomHex(hue, [8, 15], [82, 90]),
      input: isDark
        ? randomHex(hue, [8, 15], [20, 28])
        : randomHex(hue, [8, 15], [80, 88]),
      ring: primary,
      muted: isDark
        ? randomHex(hue, [8, 15], [15, 22])
        : randomHex(hue, [8, 15], [92, 96]),
      mutedForeground: isDark
        ? randomHex(hue, [5, 12], [55, 65])
        : randomHex(hue, [5, 12], [38, 48]),
      accent: randomHex(accentHue, [40, 65], isDark ? [50, 65] : [45, 58]),
      accentForeground: isDark ? "#0d0d0d" : "#fafafa",
      destructive: randomHex(0 + Math.random() * 15, [65, 80], isDark ? [50, 60] : [42, 52]),
    },
  };
}
