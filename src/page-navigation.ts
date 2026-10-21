export function isMarkdownBlobPage(pathname = window.location.pathname): boolean {
  return /^\/[^/]+\/[^/]+\/blob\/.+\.md$/i.test(pathname);
}

/** Observes committed URLs in both script worlds without patching GitHub's history API. */
export function observePageNavigation(refresh: () => void): () => void {
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  let stopped = false;
  let queued = false;
  const schedule = () => {
    if (queued || stopped) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!stopped) refresh();
    });
  };
  navigation?.addEventListener("currententrychange", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("pageshow", schedule);
  return () => {
    stopped = true;
    navigation?.removeEventListener("currententrychange", schedule);
    window.removeEventListener("popstate", schedule);
    window.removeEventListener("pageshow", schedule);
  };
}
