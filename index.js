/**
 * Host half of dsh-lmfpd: two same-origin JSON routes that list this
 * deployment's providers and models, and score one model with the LM
 * Fingerpoint Detector.
 *
 * Sampling goes through ctx.llm, so the test uses whatever provider
 * credentials the deployment already holds - the panel never asks for a key
 * and never needs a base URL, wire API, or service tier.
 */
import { generateChallenges, loadDetector, parseNumbers } from 'lmfpd-sdk';

/** Required services: the routes need the HTTP server, the samples need the model runtime. */
export const inject = ['webServer', 'llm'];

/** Largest accepted JSON request body. */
const MAX_BODY_BYTES = 4096;
/** One sample's ceiling; the panel reports a failure instead of waiting forever. */
const SAMPLE_TIMEOUT_MS = 180000;
/** How many candidates the panel shows. */
const CANDIDATES = 5;

/**
 * Write one JSON response and take ownership of it.
 * @param response - the response to finish.
 * @param status - HTTP status code.
 * @param payload - JSON-serializable body.
 */
function sendJson(response, status, payload) {
	response.writeHead(status, {
		'cache-control': 'no-store',
		'content-type': 'application/json; charset=utf-8'
	});
	response.end(JSON.stringify(payload));
}

/**
 * Exact routes sit on the bare web server, in front of the authenticated
 * /api fence, so this route proves the caller is the page that loaded it: a
 * cross-site fetch is refused, and a present Origin must match the Host. A
 * missing Origin is allowed because the desktop proxy strips it (#648).
 * @param request - incoming request.
 * @returns whether the caller is same-origin.
 */
function sameOrigin(request) {
	const host = String(request.headers.host ?? '').trim();
	if (host === '') return false;
	if (String(request.headers['sec-fetch-site'] ?? '') === 'cross-site') return false;
	const origin = request.headers.origin;
	if (origin === undefined) return true;
	if (typeof origin !== 'string' || origin === '' || origin === 'null') return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}

/**
 * Read one small JSON body.
 * @param request - incoming request.
 * @returns the parsed object, or an empty object for an empty body.
 */
async function readBody(request) {
	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw new Error('request body too large');
		chunks.push(chunk);
	}
	if (size === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Mount the routes.
 * @param ctx - the plugin context (webServer and llm are injected).
 */
export function apply(ctx) {
	/** Reference bank, downloaded once per process and shared by every test. */
	let detectorPromise;

	/**
	 * Load the reference bank on first use and retry a failed download later.
	 * @returns the loaded detector.
	 */
	const getDetector = async () => {
		detectorPromise ??= loadDetector();
		try {
			return await detectorPromise;
		} catch (error) {
			detectorPromise = undefined;
			throw error;
		}
	};

	/**
	 * Ask the model for one number sequence.
	 * @param provider - registered provider route.
	 * @param model - exact model id.
	 * @param challenge - the generated prompt and its expected count.
	 * @param parent - cancellation for the whole test.
	 * @returns the answer, its number count, and any failure.
	 */
	const sample = async (provider, model, challenge, parent) => {
		const started = Date.now();
		const controller = new AbortController();
		const abort = () => controller.abort();
		parent?.addEventListener('abort', abort, { once: true });
		const timer = setTimeout(abort, SAMPLE_TIMEOUT_MS);
		let text = '';
		let firstByte = null;
		let error = null;
		try {
			const stream = ctx.llm.stream({
				provider,
				model,
				messages: [{ role: 'user', content: [{ type: 'text', text: challenge.prompt }] }],
				maxTokens: 8192,
				signal: controller.signal
			});
			for await (const chunk of stream) {
				if (chunk.type === 'text-delta') {
					if (firstByte === null) firstByte = Date.now() - started;
					text += chunk.text;
				} else if (chunk.type === 'finish') {
					const kind = chunk.reason?.kind;
					if (kind === 'error') error = chunk.reason.failure?.message ?? 'the provider reported an error';
					else if (kind === 'aborted') error = chunk.reason.failure?.message ?? `no answer within ${SAMPLE_TIMEOUT_MS / 1000} s`;
				}
			}
		} catch (thrown) {
			error = thrown instanceof Error ? thrown.message : String(thrown);
		} finally {
			clearTimeout(timer);
			parent?.removeEventListener('abort', abort);
		}
		return {
			text,
			numbers: parseNumbers(text).length,
			expected: challenge.expected_count,
			firstByteMs: firstByte,
			error
		};
	};

	/**
	 * Run one test: three prompts in parallel, then score the answers.
	 * @param provider - registered provider route.
	 * @param model - exact model id.
	 * @param signal - cancellation for the whole test.
	 * @returns the panel's payload.
	 */
	const run = async (provider, model, signal) => {
		const challenges = generateChallenges(3);
		const samples = await Promise.all(challenges.map((challenge) => sample(provider, model, challenge, signal)));
		const usable = samples.filter((entry) => entry.error === null && entry.text.trim() !== '');
		const payload = {
			provider,
			model,
			builtAt: null,
			samples: samples.map((entry) => ({
				numbers: entry.numbers,
				expected: entry.expected,
				firstByteMs: entry.firstByteMs,
				error: entry.error
			})),
			analysis: null,
			analysisError: null
		};
		if (usable.length === 0) {
			payload.analysisError = samples.find((entry) => entry.error !== null)?.error ?? 'The model returned no numbers.';
			return payload;
		}
		try {
			const detector = await getDetector();
			payload.builtAt = detector.builtAt;
			const analysis = detector.analyze(usable.map((entry) => ({ text: entry.text, expected_count: entry.expected })));
			payload.analysis = {
				decision: analysis.decision,
				prediction: analysis.prediction,
				predictionName: analysis.prediction_name,
				familyPrediction: analysis.family_prediction,
				familyPredictionName: analysis.family_prediction_name,
				probability: analysis.probability,
				usedOutputs: analysis.used_outputs,
				results: analysis.results.slice(0, CANDIDATES).map((row) => ({
					model: row.model,
					name: row.display_name,
					family: row.family,
					familyName: row.family_name,
					score: row.score,
					probability: row.probability
				})),
				evidence: analysis.evidence
			};
		} catch (error) {
			payload.analysisError = error instanceof Error ? error.message : String(error);
		}
		return payload;
	};

	/**
	 * List every provider that advertises models.
	 * @param request - incoming request.
	 * @param response - the owned response.
	 */
	const handleModels = async (request, response) => {
		if (!sameOrigin(request)) return sendJson(response, 403, { error: 'untrusted origin' });
		if (request.method !== 'GET') return sendJson(response, 405, { error: 'method not allowed' });
		const providers = [];
		for (const info of ctx.llm.listProviders()) {
			try {
				const models = await ctx.llm.listModels(info.id);
				if (models.length === 0) continue;
				providers.push({
					id: info.id,
					name: info.name,
					models: models.map((model) => ({ id: model.id, name: model.name }))
				});
			} catch {
				// An unreachable catalog is not a failure of the list.
			}
		}
		sendJson(response, 200, { providers });
	};

	/**
	 * Score one model.
	 * @param request - incoming request.
	 * @param response - the owned response.
	 */
	const handleDetect = async (request, response) => {
		if (!sameOrigin(request)) return sendJson(response, 403, { error: 'untrusted origin' });
		if (request.method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' });
		let body;
		try {
			body = await readBody(request);
		} catch (error) {
			return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
		}
		const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
		const model = typeof body.model === 'string' ? body.model.trim() : '';
		if (provider === '' || model === '') return sendJson(response, 400, { error: 'provider and model are required' });
		const controller = new AbortController();
		response.on('close', () => controller.abort());
		try {
			sendJson(response, 200, await run(provider, model, controller.signal));
		} catch (error) {
			sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
		}
	};

	ctx.effect(
		() => ctx.webServer.register({ kind: 'exact', path: '/lmfpd/models', handler: handleModels }),
		'lmfpd: model catalog route'
	);
	ctx.effect(
		() => ctx.webServer.register({ kind: 'exact', path: '/lmfpd/detect', handler: handleDetect }),
		'lmfpd: detect route'
	);
}
