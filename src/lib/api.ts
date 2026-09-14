import { getSession } from "@/core/prices/session";

export interface ResponseMeta {
  generatedAt: string;
  session: string;
  marketLive: boolean;
  eastern: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function meta(): ResponseMeta {
  const state = getSession();
  return {
    generatedAt: new Date().toISOString(),
    session: state.session,
    marketLive: state.live,
    eastern: state.eastern,
  };
}

/** Cache for the whole time the data cannot change: a shut market moves no prices. */
export function cacheSeconds(): number {
  return getSession().live ? 30 : 300;
}

export function ok<T>(data: T, seconds = cacheSeconds()): Response {
  return Response.json(
    { data, meta: meta() },
    {
      headers: {
        ...CORS,
        "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`,
      },
    },
  );
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: CORS });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  // Number(null) and Number("") are both 0 and both finite, so guard before coercing
  if (value === null || value.trim() === "") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
