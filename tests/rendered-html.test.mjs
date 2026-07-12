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
  for (const path of ["/effective-gamma", "/ticker/MU", "/spx-playbook", "/iv-radar"]) {
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
