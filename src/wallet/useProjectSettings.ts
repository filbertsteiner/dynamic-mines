import { useState } from "react";
import { useDynamicClient, useOnEvent } from "@dynamic-labs-sdk/react-hooks";

// Minimal structural view of the bits of project settings we read.
type Provider = {
  provider: string;
  enabledAt?: Date | null;
  keyExportUrl?: string | null;
};
export type ProjectSettingsLite = {
  providers?: Provider[];
  security?: { mfa?: unknown };
} | null;

// Live view of the Dynamic dashboard config. Updates on projectSettingsChanged,
// so toggling a setting in the dashboard + refreshing is reflected in the UI.
export function useProjectSettings(): ProjectSettingsLite {
  const client = useDynamicClient();
  const [settings, setSettings] = useState<ProjectSettingsLite>(
    (client.projectSettings as ProjectSettingsLite) ?? null
  );
  useOnEvent({
    event: "projectSettingsChanged",
    listener: ({ projectSettings }) =>
      setSettings((projectSettings as ProjectSettingsLite) ?? null),
  });
  return settings;
}

export function isProviderEnabled(
  settings: ProjectSettingsLite,
  id: string
): boolean {
  return !!settings?.providers?.some(
    (p) => p.provider === id && p.enabledAt != null
  );
}

const SOCIAL_IDS = ["google", "apple", "twitter", "discord", "farcaster", "github"];

export function isAnySocialEnabled(settings: ProjectSettingsLite): boolean {
  return SOCIAL_IDS.some((id) => isProviderEnabled(settings, id));
}

export function isKeyExportEnabled(settings: ProjectSettingsLite): boolean {
  return !!settings?.providers?.some((p) => !!p.keyExportUrl);
}
