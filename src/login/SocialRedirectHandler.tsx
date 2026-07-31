import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { completeSocialRedirect } from "@dynamic-labs-sdk/client";
import { useInitStatus, useUser } from "@dynamic-labs-sdk/react-hooks";
import { useDevLog } from "../dev/DevLog";

// True on a post-OAuth-redirect page load (the provider returns us with query
// params). Read synchronously so the very first render already knows.
function isSocialReturn(): boolean {
  return new URL(window.location.href).search.length > 1;
}

const SocialRedirectContext = createContext<{ completing: boolean }>({
  completing: false,
});

export function useSocialRedirect() {
  return useContext(SocialRedirectContext);
}

// After a social redirect, the provider returns the user to our app with OAuth
// params in the URL. Once the SDK is initialized, finish the sign-in and clean
// the URL. While that's in flight we expose `completing` so the app can show a
// "signing you in" splash instead of flashing the login screen.
export function SocialRedirectProvider({ children }: { children: ReactNode }) {
  const { data: initStatus } = useInitStatus();
  const { data: user } = useUser();
  const { log } = useDevLog();
  const done = useRef(false);
  const [completing, setCompleting] = useState(isSocialReturn);

  useEffect(() => {
    if (done.current || initStatus !== "finished") return;
    const url = new URL(window.location.href);
    // No query params → not returning from a social redirect.
    if (!url.search) {
      setCompleting(false);
      return;
    }
    done.current = true;

    log({ category: "auth", onChain: false, title: "completeSocialRedirect()" });
    completeSocialRedirect({ url })
      .then((u) => {
        if (u)
          log({ category: "auth", onChain: false, title: "Social sign-in complete ✓" });
      })
      .catch((err) => {
        log({
          category: "auth",
          onChain: false,
          title: "completeSocialRedirect failed",
          detail: err instanceof Error ? err.message : String(err),
        });
        setCompleting(false); // let the login screen show on failure
      })
      .finally(() => {
        // Strip OAuth params so a refresh doesn't re-trigger completion.
        window.history.replaceState({}, "", url.pathname + url.hash);
      });
  }, [initStatus, log]);

  // Success path: the moment the user appears, drop the splash (the arcade
  // renders because `user` is set — so there's never a login flash between).
  useEffect(() => {
    if (user) setCompleting(false);
  }, [user]);

  // Safety net: never hang on the splash if completion silently stalls.
  useEffect(() => {
    if (!completing) return;
    const t = setTimeout(() => setCompleting(false), 10000);
    return () => clearTimeout(t);
  }, [completing]);

  return (
    <SocialRedirectContext.Provider value={{ completing }}>
      {children}
    </SocialRedirectContext.Provider>
  );
}
