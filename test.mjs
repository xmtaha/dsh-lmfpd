/**
 * Minimal end-to-end check of the host half without a running DSH: a stub
 * context records the two routes, a stub model answers with a number list, and
 * the detect route must come back scored.
 *
 * Run: node test.mjs
 */
import assert from 'node:assert/strict';
import { apply } from './index.js';

/** Numbers a model-like answer must contain. */
const ANSWER = Array.from({ length: 300 }, (_, index) => 1 + ((index * 37) % 355)).join(', ');

const routes = new Map();
const ctx = {
	effect: (register) => register(),
	webServer: { register: (route) => { routes.set(route.path, route.handler); return () => {}; } },
	llm: {
		listProviders: () => [{ id: 'stub', name: 'Stub provider' }],
		listModels: async () => [{ id: 'stub-model', name: 'Stub model' }],
		stream: () => (async function* () {
			yield { type: 'block-start', index: 0, blockType: 'text' };
			yield { type: 'text-delta', index: 0, text: ANSWER };
			yield { type: 'block-end', index: 0, block: { type: 'text', text: ANSWER } };
			yield { type: 'finish', reason: { kind: 'stop' } };
		})()
	}
};

apply(ctx);
assert.deepEqual([...routes.keys()].sort(), ['/lmfpd/detect', '/lmfpd/models']);

/** Drive one handler and collect its JSON answer. */
const call = async (path, { method = 'GET', body } = {}) => {
	const answer = await new Promise((resolve, reject) => {
		const response = {
			status: 0,
			headers: {},
			on() { return this; },
			writeHead(status, headers) { this.status = status; this.headers = headers ?? {}; return this; },
			end(text) { resolve({ status: this.status, payload: JSON.parse(text) }); }
		};
		const request = {
			method,
			headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' },
			async *[Symbol.asyncIterator]() { if (body !== undefined) yield Buffer.from(JSON.stringify(body)); }
		};
		routes.get(path)(request, response).catch(reject);
	});
	return answer;
};

const catalog = await call('/lmfpd/models');
assert.equal(catalog.status, 200);
assert.equal(catalog.payload.providers[0].models[0].id, 'stub-model');

const refused = await call('/lmfpd/detect', { method: 'POST', body: { provider: 'stub', model: 'stub-model' } });
assert.equal(refused.status, 200);
assert.equal(refused.payload.samples.length, 3);
assert.equal(refused.payload.analysisError, null, refused.payload.analysisError ?? '');
assert.ok(['scored', 'partial'].includes(refused.payload.analysis.decision), refused.payload.analysis.decision);
assert.equal(refused.payload.analysis.results.length, 5);
console.log('ok', refused.payload.analysis.decision, refused.payload.analysis.predictionName, refused.payload.analysis.probability);
