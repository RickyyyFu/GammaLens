/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  createMarketErrorResponse,
  getMarketPayload,
  type MarketApiResponse,
} from "../lib/market";
import {
  createProviderRegistry,
  type ProviderRuntimeFlags,
} from "../lib/providers";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  MASSIVE_API_KEY?: string;
  PUBLIC_FEED_MODE?: string;
  PUBLIC_DISPLAY_AUTHORIZED?: string;
  DERIVED_ANALYTICS_AUTHORIZED?: string;
  RAW_REDISTRIBUTION_AUTHORIZED?: string;
  NASDAQ_DATALINK_BASE_URL?: string;
  NASDAQ_DATALINK_CLIENT_ID?: string;
  NASDAQ_DATALINK_CLIENT_SECRET?: string;
  CBOE_CGIF_GATEWAY_URL?: string;
  CBOE_CGIF_GATEWAY_TOKEN?: string;
  OCC_DAILY_OI_ENABLED?: string;
  BLOOMBERG_GATEWAY_URL?: string;
  BLOOMBERG_GATEWAY_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

function enabled(value?: string) {
  return value?.trim().toLowerCase() === "true";
}

function publicFeedMode(value?: string): ProviderRuntimeFlags["feedMode"] {
  return value === "delayed" || value === "realtime" ? value : "disabled";
}

function providerFlags(env: Env): ProviderRuntimeFlags {
  return {
    feedMode: publicFeedMode(env.PUBLIC_FEED_MODE),
    publicDisplay: enabled(env.PUBLIC_DISPLAY_AUTHORIZED),
    derivedAnalytics: enabled(env.DERIVED_ANALYTICS_AUTHORIZED),
    rawRedistribution: enabled(env.RAW_REDISTRIBUTION_AUTHORIZED),
    massiveCredentials: Boolean(env.MASSIVE_API_KEY),
    nasdaqCredentials: Boolean(
      env.NASDAQ_DATALINK_BASE_URL &&
      env.NASDAQ_DATALINK_CLIENT_ID &&
      env.NASDAQ_DATALINK_CLIENT_SECRET,
    ),
    cboeGateway: Boolean(env.CBOE_CGIF_GATEWAY_URL && env.CBOE_CGIF_GATEWAY_TOKEN),
    occDailyOi: enabled(env.OCC_DAILY_OI_ENABLED),
    bloombergGateway: Boolean(env.BLOOMBERG_GATEWAY_URL && env.BLOOMBERG_GATEWAY_TOKEN),
  };
}

function mayPublishCurrentMarketPayload(flags: ProviderRuntimeFlags) {
  return flags.feedMode !== "disabled" &&
    flags.publicDisplay === true &&
    flags.derivedAnalytics === true &&
    flags.rawRedistribution === true &&
    flags.massiveCredentials === true;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function marketHttpStatus(payload: MarketApiResponse) {
  if (payload.status === "ready") return 200;
  if (payload.status === "unconfigured") return 503;
  switch (payload.error.code) {
    case "INVALID_SYMBOL":
      return 400;
    case "SYMBOL_NOT_FOUND":
    case "OPTION_CHAIN_UNAVAILABLE":
      return 404;
    case "METHOD_NOT_ALLOWED":
      return 405;
    case "PROVIDER_TIMEOUT":
      return 504;
    case "PROVIDER_AUTH_FAILED":
    case "PROVIDER_UNAVAILABLE":
      return 503;
    default:
      return 502;
  }
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/providers") {
      if (request.method !== "GET") {
        return Response.json(
          { error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 GET 请求。" } },
          { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } },
        );
      }
      return Response.json(createProviderRegistry(providerFlags(env)), {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "X-GammaLens-Schema": "provider-registry/1.0",
        },
      });
    }

    if (url.pathname === "/api/market") {
      const symbol = url.searchParams.get("symbol") ?? "MU";
      const profile = url.searchParams.get("profile") === "spx-front-structure"
        ? "spx-front-structure"
        : "standard";
      let payload: MarketApiResponse;
      if (request.method !== "GET") {
        payload = createMarketErrorResponse(
          symbol,
          "METHOD_NOT_ALLOWED",
          "仅支持 GET 请求。",
          false,
        );
      } else {
        const flags = providerFlags(env);
        payload = await getMarketPayload(
          symbol,
          mayPublishCurrentMarketPayload(flags) ? env.MASSIVE_API_KEY : undefined,
          { profile },
        );
      }
      const mode = payload.status === "ready" ? payload.feedClass : payload.status;
      return Response.json(payload, {
        status: marketHttpStatus(payload),
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-GammaLens-Mode": mode,
          "X-GammaLens-Schema": payload.schemaVersion,
          "X-Request-Id": payload.requestId,
        },
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
