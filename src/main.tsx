import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { DevLogProvider } from "./dev/DevLog";
// Importing the client module here registers extensions before any component renders.
import { dynamicClient } from "./dynamicClient";

// Dynamic's react-hooks are built on @tanstack/react-query, so the tree must be
// wrapped in a QueryClientProvider (this is why react-query is a peer dependency).
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DynamicProvider client={dynamicClient}>
        <DevLogProvider>
          <App />
        </DevLogProvider>
      </DynamicProvider>
    </QueryClientProvider>
  </StrictMode>
);
