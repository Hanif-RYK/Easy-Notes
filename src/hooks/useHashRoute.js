import { useEffect, useState } from "react";

// Minimal hash router: "#/note/abc" -> ["note", "abc"].
// Using the hash keeps the browser/phone back button working and needs no
// server configuration, so the app works on any static host.

function parse() {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

export function navigate(path, { replace = false } = {}) {
  const hash = `#/${path.replace(/^\//, "")}`;
  if (replace) {
    // Keep the "inApp" marker of the entry we are replacing.
    window.history.replaceState(window.history.state, "", hash);
  } else {
    // Mark entries created by the app so goBack() knows it's safe to go back.
    window.history.pushState({ inApp: true }, "", hash);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/**
 * Go to the previous screen. If the page was opened directly on this URL
 * (no in-app history), go to `fallback` instead of leaving the site.
 */
export function goBack(fallback = "notes") {
  if (window.history.state?.inApp) window.history.back();
  else navigate(fallback, { replace: true });
}

export function useHashRoute() {
  const [segments, setSegments] = useState(parse);

  useEffect(() => {
    const onChange = () => setSegments(parse());
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  return segments;
}
