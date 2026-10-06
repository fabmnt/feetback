"use client";

const SCRIPT_SRC = "/feetback.js";

type EmbedSettings = Record<string, unknown>;

/**
 * Installs the Feetback script with the given Feetback Settings while this
 * component is mounted, and fully removes it on unmount.
 *
 * Why: the script keeps its settings for the whole browser session. Without
 * this reset, client-side navigation between pages with different settings
 * would keep showing the first page's button and theme.
 *
 * Side effects: writes `window.FeetbackSettings`, adds a script tag to the
 * document, and destroys the running Feetback runtime on unmount.
 */
export function FeetbackEmbed({ settings }: { settings: EmbedSettings }) {
  function install(marker: HTMLElement | null) {
    if (!marker) {
      return;
    }

    window.__feetbackRuntime?.destroy();
    window.FeetbackSettings = settings as typeof window.FeetbackSettings;

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    document.body.append(script);

    return () => {
      script.remove();
      window.__feetbackRuntime?.destroy();
    };
  }

  return <span ref={install} hidden />;
}
