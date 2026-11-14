import { Bricolage_Grotesque } from "next/font/google";

/** Brand font, exposed as the `--font-bricolage` variable and `font-brand` utility. */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
});
