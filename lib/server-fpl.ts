const FPL_BASE = "https://fantasy.premierleague.com/api";

export async function fplFetch<T>(path: string, revalidate = 300): Promise<T> {
  const response = await fetch(`${FPL_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FPL-Risk/0.5 (independent public beta)",
    },
    next: revalidate > 0 ? { revalidate } : undefined,
    cache: revalidate > 0 ? "force-cache" : "no-store",
  });

  if (!response.ok) {
    throw new Error(`FPL API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}
