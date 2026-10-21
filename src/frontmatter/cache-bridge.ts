import { isMarkdownBlobPage, observePageNavigation } from "../page-navigation";
import {
  CACHE_SOURCE_ATTRIBUTE,
  type CachedQuery,
  isMetadataQuery,
  readCachedMetadata,
} from "./cache-source";

type QueryCache = {
  findAll: (filters: { predicate: (query: CachedQuery) => boolean }) => CachedQuery[];
  subscribe: (listener: (event: { query: CachedQuery }) => void) => () => void;
};
type PageWindow = Window & {
  __TANSTACK_QUERY_CLIENT__?: { getQueryCache: () => QueryCache };
};

/** MAIN-world adapter: read/subscribe only; never fetch or mutate GitHub's cache. */
export function startMetadataCacheBridge(): () => void {
  let cache: QueryCache | undefined;
  let unsubscribe: (() => void) | undefined;
  let script: HTMLScriptElement | undefined;
  let stopped = false;
  let queued = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pathname = window.location.pathname;

  const publish = (json: string | null) => {
    if (!json) {
      script?.remove();
      script = undefined;
      return;
    }
    if (!script) {
      script = document.createElement("script");
      script.type = "application/json";
      script.setAttribute(CACHE_SOURCE_ATTRIBUTE, "");
    }
    if (script.textContent !== json) script.textContent = json;
    if (!script.isConnected) document.documentElement.append(script);
  };
  const refresh = () => {
    queued = false;
    if (stopped) return;
    pathname = window.location.pathname;
    if (!isMarkdownBlobPage(pathname)) {
      unsubscribe?.();
      unsubscribe = undefined;
      cache = undefined;
      publish(null);
      return;
    }
    try {
      const next = (window as PageWindow).__TANSTACK_QUERY_CLIENT__?.getQueryCache();
      if (next !== cache) {
        unsubscribe?.();
        unsubscribe = undefined;
        cache = next;
        if (cache) {
          unsubscribe = cache.subscribe((event) => {
            if (isMetadataQuery(event?.query)) schedule();
          });
        }
      }
      publish(
        cache ? readCachedMetadata(cache.findAll({ predicate: isMetadataQuery }), pathname) : null,
      );
    } catch {
      // A changed/unsupported page API must not disrupt GitHub or hide its table.
      publish(null);
    }
  };
  const schedule = () => {
    if (queued || stopped) return;
    queued = true;
    queueMicrotask(refresh);
  };
  // The module may finish hydration after document_idle. Retry briefly, then
  // rely on relevant cache events and navigation, with no permanent polling.
  const connect = () => {
    refresh();
    if (isMarkdownBlobPage() && !cache && !stopped && ++attempts < 30) {
      timer = setTimeout(connect, 1_000);
    }
  };
  const reconnect = () => {
    clearTimeout(timer);
    attempts = 0;
    connect();
  };
  const observer = new MutationObserver(() => {
    if (pathname !== window.location.pathname) reconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const stopNavigation = observePageNavigation(reconnect);
  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe?.();
    observer.disconnect();
    stopNavigation();
    publish(null);
  };
}
