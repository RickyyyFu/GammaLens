/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  createMarketErrorResponse,
  getMarketPayload,
  type MarketApiResponse,
} from "../lib/market";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  MASSIVE_API_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
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

    if (url.pathname === "/api/market") {
      const symbol = url.searchParams.get("symbol") ?? "MU";
      let payload: MarketApiResponse;
      if (request.method !== "GET") {
        payload = createMarketErrorResponse(
          symbol,
          "METHOD_NOT_ALLOWED",
          "仅支持 GET 请求。",
          false,
        );
      } else {
        payload = await getMarketPayload(symbol, env.MASSIVE_API_KEY);
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
