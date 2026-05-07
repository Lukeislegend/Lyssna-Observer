import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

/** Semantic tokens aligned with Lyssna study pages (light). */
export const theme = extendTheme({
  config,
  styles: {
    global: {
      ":root": {
        "--study-pages-top-nav-height": "64px",
      },
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
    },
  },
  semanticTokens: {
    colors: {
      "chakra-body-text": { default: "gray.800" },
      "chakra-body-bg": { default: "white" },
      "chakra-border-color": { default: "gray.200" },
      "chakra-placeholder-color": { default: "gray.500" },
    },
  },
});
