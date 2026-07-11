import type { PilotLocationPolicy } from "../contracts/pilot";

export type PilotConfig =
  | {
      enabled: false;
      allowedLocations: PilotLocationPolicy;
    }
  | {
      enabled: true;
      allowedLocations: PilotLocationPolicy;
      siteUrl: string;
      stripeSecretKey: string;
      accessCodeHash: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseLocations(value: string | undefined): PilotLocationPolicy {
  if (value === undefined || value.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("PILOT_ALLOWED_LOCATIONS must be a JSON array");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("PILOT_ALLOWED_LOCATIONS must be a JSON array");
  }
  if (parsed.length > 50) {
    throw new Error("PILOT_ALLOWED_LOCATIONS may contain at most 50 locations");
  }

  return parsed.map((location) => {
    if (
      !isRecord(location) ||
      Object.keys(location).length !== 3 ||
      !("country" in location) ||
      !("region" in location) ||
      !("city" in location) ||
      (location.country !== "US" && location.country !== "CA") ||
      typeof location.region !== "string" ||
      location.region.trim() === "" ||
      location.region.trim().length > 120 ||
      typeof location.city !== "string" ||
      location.city.trim() === "" ||
      location.city.trim().length > 120
    ) {
      throw new Error("PILOT_ALLOWED_LOCATIONS contains an invalid location");
    }
    return {
      country: location.country,
      region: location.region.trim(),
      city: location.city.trim(),
    };
  });
}

function parseSiteOrigin(value: string | undefined): string {
  if (!value?.trim()) throw new Error("NEXT_PUBLIC_SITE_URL is required");

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL");
  }
  const localHttp = url.protocol === "http:" && url.hostname === "localhost";
  if (
    (url.protocol !== "https:" && !localHttp) ||
    url.username !== "" ||
    url.password !== "" ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a canonical HTTPS origin");
  }
  return url.origin;
}

export function parsePilotConfig(
  env: Record<string, string | undefined>,
): PilotConfig {
  const flag = env.PAID_PILOT_ENABLED;
  if (flag !== undefined && flag !== "true" && flag !== "false") {
    throw new Error("PAID_PILOT_ENABLED must be true or false");
  }
  if (flag !== "true") return { enabled: false, allowedLocations: [] };

  const allowedLocations = parseLocations(env.PILOT_ALLOWED_LOCATIONS);

  const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is required");
  const accessCodeHash = env.PILOT_ACCESS_CODE_HASH?.trim().toLowerCase();
  if (!accessCodeHash || !/^[a-f0-9]{64}$/.test(accessCodeHash)) {
    throw new Error("PILOT_ACCESS_CODE_HASH must be a SHA-256 hex digest");
  }

  return {
    enabled: true,
    allowedLocations,
    siteUrl: parseSiteOrigin(env.NEXT_PUBLIC_SITE_URL),
    stripeSecretKey,
    accessCodeHash,
  };
}
