import { useEffect, useRef } from "react";
import { completeSocialRedirect } from "@dynamic-labs-sdk/client";
import { useInitStatus } from "@dynamic-labs-sdk/react-hooks";
import { useDevLog } from "../dev/DevLog";

// After a social redirect, the provider returns the user to our app with OAuth
// params in the URL. Once the SDK is initialized, finish the sign-in and clean
// the URL. Mounted app-wide so it runs on the post-redirect page load.
export function SocialRedirectHandler() {
  const { data: initStatus } = useInitStatus();
  const { log } = useDevLog();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || initStatus !== "finished") return;
    const url = new URL(window.location.href);
    // No query params → not returning from a social redirect.
    if (!url.search) return;
    done.current = true;

    log({ category: "auth", onChain: false, title: "completeSocialRedirect()" });
    completeSocialRedirect({ url })
      .then((user) => {
        if (user)
          log({ category: "auth", onChain: false, title: "Social sign-in complete ✓" });
      })
      .catch((err) => {
        log({
          category: "auth",
          onChain: false,
          title: "completeSocialRedirect failed",
          detail: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        // Strip OAuth params so a refresh doesn't re-trigger completion.
        window.history.replaceState({}, "", url.pathname + url.hash);
      });
  }, [initStatus, log]);

  return null;
}
