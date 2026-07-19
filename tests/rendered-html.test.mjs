import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("server-renders the full GammaLens module directory", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env,
    ctx,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>GammaLens/);
  assert.match(html, /22 个研究模块/);
  assert.match(html, /有效 Gamma 雷达/);
  assert.match(html, /合成价格、虚构 OI 和伪实时戳已全部禁用/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("dynamic module routes render without a login wall", async () => {
  const worker = await loadWorker();
  for (const path of ["/effective-gamma", "/ticker/MU", "/ticker/SPX", "/spx-playbook", "/iv-radar"]) {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
      env,
      ctx,
    );
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.doesNotMatch(html, /登录|sign in|log in/i, path);
  }
});

test("SPX ticker route renders the dedicated audited structure terminal", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/ticker/SPX", { headers: { accept: "text/html" } }),
    env,
    ctx,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /SPX 结构终端/);
  assert.match(html, /模块已就绪，数据不合格时不出数字/);
  assert.match(html, /Delta 缺失绝不按 0 处理/);
  assert.match(html, /Nasdaq Smart Options/);
  assert.match(html, /Cboe CGIF/);
  assert.match(html, /Bloomberg B-PIPE \/ SAPI/);
  assert.match(html, /Yahoo Finance/);
  assert.match(html, /OptionCharts/);
  assert.match(html, /TradingView/);
  assert.match(html, /不抓网页 · 不平均门户价格/);
  assert.doesNotMatch(html, /登录|sign in|log in/i);
});

test("provider registry reports capabilities without exposing credentials", async () => {
  const worker = await loadWorker();
  const providerEnv = {
    ...env,
    MASSIVE_API_KEY: "massive-secret",
    NASDAQ_DATALINK_BASE_URL: "https://licensed.example.test",
    NASDAQ_DATALINK_CLIENT_ID: "nasdaq-client",
    NASDAQ_DATALINK_CLIENT_SECRET: "nasdaq-secret",
    PUBLIC_FEED_MODE: "realtime",
    PUBLIC_DISPLAY_AUTHORIZED: "true",
    DERIVED_ANALYTICS_AUTHORIZED: "true",
    RAW_REDISTRIBUTION_AUTHORIZED: "true",
  };
  const response = await worker.fetch(
    new Request("http://localhost/api/providers"),
    providerEnv,
    ctx,
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.doesNotMatch(text, /massive-secret|nasdaq-secret|nasdaq-client/);
  const payload = JSON.parse(text);
  assert.equal(payload.policy.htmlScraping, false);
  assert.equal(payload.policy.portalAveraging, false);
  assert.equal(payload.providers.find((item) => item.id === "massive").runtimeState, "ready");
  assert.equal(payload.providers.find((item) => item.id === "nasdaq-smart-options").configured, true);
  assert.equal(payload.providers.find((item) => item.id === "tradingview").runtimeState, "display-only");
});

test("market API refuses to fabricate data when the provider is unconfigured", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/market?symbol=MU"), env, ctx);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-gammalens-mode"), "unconfigured");
  const payload = await response.json();
  assert.equal(payload.status, "unconfigured");
  assert.equal(payload.error.code, "DATA_PROVIDER_NOT_CONFIGURED");
  assert.equal("contracts" in payload, false);
  assert.equal("spot" in payload, false);
});

test("market API fails closed when a key exists but public data rights are not confirmed", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/market?symbol=SPX&profile=spx-front-structure"),
    { ...env, MASSIVE_API_KEY: "server-only-key-without-rights" },
    ctx,
  );
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.doesNotMatch(text, /server-only-key-without-rights/);
  const payload = JSON.parse(text);
  assert.equal(payload.status, "unconfigured");
  assert.equal("contracts" in payload, false);
  assert.equal("spot" in payload, false);
});

test("market API rejects unsafe ticker input before provider access", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/market?symbol=MU%2F..%2Fsecret"),
    env,
    ctx,
  );
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error.code, "INVALID_SYMBOL");
});

test("SPX profile uses the independent index snapshot and a bounded complete scope", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  const timestamp = Date.parse("2026-07-20T14:30:00.000Z") * 1_000_000;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    requested.push(url.toString());
    if (url.pathname === "/v3/snapshot/indices") {
      return Response.json({
        status: "OK",
        request_id: "index-request",
        results: [{ ticker: "I:SPX", value: 6000, last_updated: timestamp, timeframe: "REAL-TIME", session: { change: 10, change_percent: .17, previous_close: 5990 } }],
      });
    }
    if (url.pathname === "/v3/snapshot/options/I%3ASPX" || decodeURIComponent(url.pathname) === "/v3/snapshot/options/I:SPX") {
      const base = {
        expiration_date: "2026-07-20",
        shares_per_contract: 100,
        strike_price: 6000,
      };
      const snapshot = (type, ticker, delta) => ({
        details: { ...base, contract_type: type, ticker },
        day: { volume: 50 },
        greeks: { delta, gamma: .002, theta: -.1, vega: .2 },
        implied_volatility: .2,
        last_quote: { bid: 9.8, ask: 10.2, last_updated: timestamp, timeframe: "REAL-TIME" },
        open_interest: 100,
        underlying_asset: { value: 6000, last_updated: timestamp, timeframe: "REAL-TIME" },
      });
      return Response.json({
        status: "OK",
        request_id: "chain-request",
        results: [snapshot("call", "O:SPX260720C06000000", .5), snapshot("put", "O:SPX260720P06000000", -.5)],
      });
    }
    return new Response("unexpected provider request", { status: 500 });
  };

  try {
    const worker = await loadWorker();
    const response = await worker.fetch(
      new Request("http://localhost/api/market?symbol=SPX&profile=spx-front-structure"),
      {
        ...env,
        MASSIVE_API_KEY: "server-only-test-key",
        PUBLIC_FEED_MODE: "realtime",
        PUBLIC_DISPLAY_AUTHORIZED: "true",
        DERIVED_ANALYTICS_AUTHORIZED: "true",
        RAW_REDISTRIBUTION_AUTHORIZED: "true",
      },
      ctx,
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, "ready");
    assert.equal(payload.underlying.source, "index-snapshot");
    assert.equal(payload.chain.requestedScope.profile, "spx-front-structure");
    assert.equal(payload.chain.pagination.hasMore, false);
    assert.equal(payload.contracts.length, 2);
    const indexUrl = requested.find((url) => url.includes("/v3/snapshot/indices"));
    assert.equal(new URL(indexUrl).searchParams.get("ticker"), "I:SPX");
    const chainUrl = new URL(requested.find((url) => url.includes("/v3/snapshot/options/")));
    const expirationFrom = chainUrl.searchParams.get("expiration_date.gte");
    const expirationTo = chainUrl.searchParams.get("expiration_date.lte");
    assert.ok(expirationFrom && expirationTo);
    assert.equal(
      (new Date(`${expirationTo}T00:00:00Z`) - new Date(`${expirationFrom}T00:00:00Z`)) / 86_400_000,
      7,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
