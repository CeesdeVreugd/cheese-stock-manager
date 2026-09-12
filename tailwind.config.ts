import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: "#E3A628",
        goldDeep: "#B9821A",
        goldSoft: "#FBEBC7",
        green: "#223B2C",
        greenSoft: "#EAF0EA",
        cream: "#FFFDF8",
        ink: "#2B2620",
        inkSoft: "#756C5E",
        line: "#EDE4D1",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
