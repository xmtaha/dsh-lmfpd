window.__ModuleLoader__.load({
	id: "dsh-lmfpd",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		const h = React.createElement;

		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.lmfpd";

		/** Settings section copy. */
		const en = {
			title: "Model identity test",
			intro:
				"Asks the chosen model to write random numbers. Models differ in the sequences they call random, so the answer can be compared with a bank of known fingerprints. The result is a ranked guess, not proof of identity.",
			provider: "Provider",
			model: "Model",
			run: "Run test",
			running: "Asking the model for three sequences…",
			elapsed: "Elapsed: ",
			loadingCatalog: "Reading this deployment's models…",
			catalogEmpty: "No provider currently advertises models.",
			catalogFailed: "Could not read the model list: ",
			noAnswer: "No answer",
			verdict: "Closest known identity",
			confidence: "Confidence",
			confidenceUnavailable: "calibration not available for this round",
			candidates: "Closest candidates",
			samples: "Answer samples",
			samplesLine: "numbers given / numbers requested",
			reference: "Reference bank built ",
			detail: "Show details",
			hideDetail: "Hide details",
			evidence: "Evidence",
			disclaimer:
				"A model outside the reference bank is still ranked against its closest neighbour, so treat this as a signal about the route, not a certificate.",
			partialNote: "Only some answers were usable; the score is partial.",
			failed: "The test failed: ",
			again: "Run again"
		};

		/** Shared styles; colors come from the host theme, never from literals. */
		const css = [
			".lmfpd_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;display:flex}",
			".lmfpd_heading{margin:0;font-size:18px;font-weight:600}",
			".lmfpd_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}",
			".lmfpd_form{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}",
			".lmfpd_field{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 240px}",
			".lmfpd_label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}",
			".lmfpd_select,.lmfpd_button{font:inherit;font-size:13px;border-radius:8px;padding:8px 10px;box-sizing:border-box}",
			".lmfpd_select{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);width:100%}",
			".lmfpd_select:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".lmfpd_button{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill);border:0;cursor:pointer;font-weight:500;min-width:132px}",
			"@media (hover:hover){.lmfpd_button:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}}",
			".lmfpd_button:disabled{opacity:.6;cursor:default}",
			".lmfpd_button:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
			".lmfpd_card{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px}",
			".lmfpd_caption{color:var(--dsw-alias-label-tertiary);font-size:12px;margin:0}",
			".lmfpd_verdict{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}",
			".lmfpd_verdictName{font-size:20px;font-weight:600;margin:0}",
			".lmfpd_chip{background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".lmfpd_rows{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}",
			".lmfpd_row{display:flex;flex-direction:column;gap:4px}",
			".lmfpd_rowHead{display:flex;justify-content:space-between;gap:12px;font-size:13px}",
			".lmfpd_rowName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".lmfpd_rowScore{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none}",
			".lmfpd_track{background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:6px;overflow:hidden}",
			".lmfpd_fill{background:var(--dsw-alias-button-info-fill);height:100%;border-radius:999px}",
			".lmfpd_samples{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}",
			".lmfpd_sample{background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:6px 10px;font-size:12px;font-variant-numeric:tabular-nums}",
			".lmfpd_sampleBad{color:var(--dsw-alias-state-error-primary)}",
			".lmfpd_error{color:var(--dsw-alias-state-error-primary);font-size:13px;margin:0}",
			".lmfpd_note{color:var(--dsw-alias-label-tertiary);font-size:12px;margin:0;line-height:18px}",
			".lmfpd_details{color:var(--dsw-alias-label-secondary);font-size:12px;margin:0;white-space:pre-wrap;word-break:break-word}"
		].join("");

		/** Install the shared style tag once. */
		function installStyles() {
			const tagId = "dsh-lmfpd/section.css";
			if (typeof document === "undefined") return;
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-lmfpd";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/**
		 * Resolve one of this plugin's routes against the page's own base path.
		 * @param path - route name below the prefix.
		 * @returns the absolute path to fetch.
		 */
		function route(path) {
			const relative = path.replace(/^\/+/, "");
			return new URL(relative, document.baseURI).pathname;
		}

		/**
		 * Read one JSON response, turning a refusal into a readable message.
		 * @param response - the fetch response.
		 * @returns the parsed payload.
		 */
		async function json(response) {
			let payload;
			try {
				payload = await response.json();
			} catch {
				throw new Error("The service returned an unreadable response.");
			}
			if (!response.ok) throw new Error(payload && payload.error ? payload.error : "The service refused the request.");
			return payload;
		}

		/**
		 * Format a probability as a percentage.
		 * @param value - probability in [0, 1], or null.
		 * @returns the label to show.
		 */
		function percent(value) {
			return typeof value === "number" ? Math.round(value * 100) + "%" : "";
		}

		/** One settings section: pick a provider and model, run the test, read the verdict. */
		function LmfpdSection({ t }) {
			const [catalog, setCatalog] = React.useState(null);
			const [catalogError, setCatalogError] = React.useState(null);
			const [provider, setProvider] = React.useState("");
			const [model, setModel] = React.useState("");
			const [state, setState] = React.useState("idle");
			const [elapsed, setElapsed] = React.useState(0);
			const [result, setResult] = React.useState(null);
			const [runError, setRunError] = React.useState(null);
			const [showDetail, setShowDetail] = React.useState(false);

			React.useEffect(() => {
				const controller = new AbortController();
				let live = true;
				(async () => {
					try {
						const payload = await json(
							await fetch(route("lmfpd/models"), {
								headers: { accept: "application/json" },
								signal: controller.signal
							})
						);
						if (!live) return;
						const providers = Array.isArray(payload.providers) ? payload.providers : [];
						setCatalog(providers);
						const first = providers[0];
						if (first !== undefined) {
							setProvider(first.id);
							setModel(first.models[0] ? first.models[0].id : "");
						}
					} catch (error) {
						if (live && error.name !== "AbortError") setCatalogError(error.message);
					}
				})();
				return () => {
					live = false;
					controller.abort();
				};
			}, []);

			React.useEffect(() => {
				if (state !== "running") return undefined;
				const started = Date.now();
				const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
				return () => clearInterval(timer);
			}, [state]);

			const selected = catalog === null ? undefined : catalog.find((entry) => entry.id === provider);
			const models = selected === undefined ? [] : selected.models;

			const pickProvider = (event) => {
				const next = event.target.value;
				setProvider(next);
				const entry = catalog === null ? undefined : catalog.find((candidate) => candidate.id === next);
				setModel(entry !== undefined && entry.models[0] ? entry.models[0].id : "");
			};

			const runTest = async () => {
				setState("running");
				setElapsed(0);
				setResult(null);
				setRunError(null);
				setShowDetail(false);
				try {
					const payload = await json(
						await fetch(route("lmfpd/detect"), {
							method: "POST",
							headers: { "content-type": "application/json", accept: "application/json" },
							body: JSON.stringify({ provider, model })
						})
					);
					setResult(payload);
					setState("done");
				} catch (error) {
					setRunError(error.name === "AbortError" ? "The test was cancelled." : error.message);
					setState("done");
				}
			};

			const busy = state === "running";
			const canRun = !busy && provider !== "" && model !== "";

			const children = [];

			if (catalogError !== null) {
				children.push(
					h("p", { className: "lmfpd_error", key: "catalog-error" }, t("catalogFailed") + catalogError)
				);
			} else if (catalog === null) {
				children.push(
					h("p", { className: "lmfpd_caption", key: "catalog-loading" }, t("loadingCatalog"))
				);
			} else if (catalog.length === 0) {
				children.push(h("p", { className: "lmfpd_caption", key: "catalog-empty" }, t("catalogEmpty")));
			} else {
				children.push(
					h(
						"div",
						{ className: "lmfpd_form", key: "form" },
						h(
							"div",
							{ className: "lmfpd_field" },
							h("label", { className: "lmfpd_label", htmlFor: "lmfpd-provider" }, t("provider")),
							h(
								"select",
								{
									id: "lmfpd-provider",
									className: "lmfpd_select",
									value: provider,
									disabled: busy,
									onChange: pickProvider
								},
								catalog.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name || entry.id))
							)
						),
						h(
							"div",
							{ className: "lmfpd_field" },
							h("label", { className: "lmfpd_label", htmlFor: "lmfpd-model" }, t("model")),
							h(
								"select",
								{
									id: "lmfpd-model",
									className: "lmfpd_select",
									value: model,
									disabled: busy,
									onChange: (event) => setModel(event.target.value)
								},
								models.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name || entry.id))
							)
						),
						h(
							"button",
							{ type: "button", className: "lmfpd_button", disabled: !canRun, onClick: runTest },
							busy ? t("running") : result === null ? t("run") : t("again")
						)
					)
				);
			}

			if (busy) {
				children.push(
					h(
						"p",
						{ className: "lmfpd_caption", key: "progress", role: "status" },
						t("elapsed") + elapsed + " s"
					)
				);
			}

			if (runError !== null) {
				children.push(h("p", { className: "lmfpd_error", key: "run-error" }, t("failed") + runError));
			}

			if (result !== null) {
				const analysis = result.analysis;
				const card = [];

				if (analysis === null) {
					card.push(
						h("p", { className: "lmfpd_error", key: "analysis-error" }, result.analysisError || t("noAnswer"))
					);
				} else {
					const scored = analysis.decision === "scored" || analysis.decision === "partial";
					const headline = scored
						? analysis.predictionName || analysis.prediction || "?"
						: analysis.predictionName || t("noAnswer");
					card.push(
						h(
							"div",
							{ className: "lmfpd_verdict", key: "verdict" },
							h("p", { className: "lmfpd_caption" }, t("verdict")),
							h("p", { className: "lmfpd_verdictName" }, headline),
							analysis.familyPredictionName
								? h("span", { className: "lmfpd_chip" }, analysis.familyPredictionName)
								: null,
							scored && typeof analysis.probability === "number"
								? h(
										"span",
										{ className: "lmfpd_chip" },
										t("confidence") + ": " + percent(analysis.probability)
									)
								: null
						)
					);
					if (analysis.decision === "partial") {
						card.push(h("p", { className: "lmfpd_note", key: "partial" }, t("partialNote")));
					}
					if (scored && typeof analysis.probability !== "number") {
						card.push(h("p", { className: "lmfpd_note", key: "no-prob" }, t("confidenceUnavailable")));
					}
					const rows = Array.isArray(analysis.results) ? analysis.results : [];
					if (rows.length > 0) {
						const top = rows[0].score || 1;
						card.push(
							h("p", { className: "lmfpd_caption", key: "candidates-label" }, t("candidates")),
							h(
								"ul",
								{ className: "lmfpd_rows", key: "candidates" },
								rows.map((row, index) =>
									h(
										"li",
										{ className: "lmfpd_row", key: row.model + index },
										h(
											"div",
											{ className: "lmfpd_rowHead" },
											h("span", { className: "lmfpd_rowName" }, row.name || row.model),
											h(
												"span",
												{ className: "lmfpd_rowScore" },
												typeof row.probability === "number"
													? percent(row.probability)
													: row.score.toFixed(3)
											)
										),
										h(
											"div",
											{ className: "lmfpd_track" },
											h("div", {
												className: "lmfpd_fill",
												style: { width: Math.max(2, Math.round((row.score / top) * 100)) + "%" }
											})
										)
									)
								)
							)
						);
					}
					card.push(
						h("p", { className: "lmfpd_caption", key: "evidence" }, t("evidence") + ": " + analysis.evidence.label)
					);
				}

				const samples = Array.isArray(result.samples) ? result.samples : [];
				card.push(
					h("p", { className: "lmfpd_caption", key: "samples-label" }, t("samples")),
					h(
						"ul",
						{ className: "lmfpd_samples", key: "samples" },
						samples.map((entry, index) =>
							h(
								"li",
								{
									key: "sample-" + index,
									className: entry.error === null ? "lmfpd_sample" : "lmfpd_sample lmfpd_sampleBad",
									title: entry.error === null ? undefined : entry.error
								},
								"#" +
									(index + 1) +
									"  " +
									entry.numbers +
									"/" +
									entry.expected +
									(entry.firstByteMs === null ? "" : "  ·  " + entry.firstByteMs + " ms")
							)
						)
					)
				);

				if (result.builtAt) {
					card.push(h("p", { className: "lmfpd_caption", key: "reference" }, t("reference") + result.builtAt));
				}
				card.push(h("p", { className: "lmfpd_note", key: "disclaimer" }, t("disclaimer")));
				if (analysis !== null && analysis.evidence !== null) {
					card.push(
						h(
							"button",
							{
								type: "button",
								key: "toggle-detail",
								className: "lmfpd_caption",
								style: {
									background: "none",
									border: 0,
									padding: 0,
									cursor: "pointer",
									font: "inherit",
									textAlign: "left"
								},
								onClick: () => setShowDetail((previous) => !previous)
							},
							showDetail ? t("hideDetail") : t("detail")
						)
					);
					if (showDetail) {
						card.push(
							h(
								"p",
								{ className: "lmfpd_details", key: "detail" },
								(analysis.evidence.reason || "") +
									"\n" +
									t("samplesLine") +
									": " +
									analysis.usedOutputs +
									"/" +
									samples.length
							)
						);
					}
				}

				children.push(h("div", { className: "lmfpd_card", key: "card" }, card));
			}

			return h(
				"div",
				{ className: "lmfpd_section" },
				h("h2", { className: "lmfpd_heading" }, t("title")),
				h("p", { className: "lmfpd_intro" }, t("intro")),
				children
			);
		}

		/** Required services (cordis fiber inject). */
		const inject = ["slots", "locale"];

		/**
		 * Mount the model identity test into the settings page.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			installStyles();
			ctx.effect(() => ctx.locale.register(NS, "en", en), "dsh-lmfpd: dictionary");
			const t = ctx.locale.bind(NS);
			ctx.effect(
				() =>
					ctx.slots.inject("settings.section", () =>
						ctx.slots.register(
							{
								name: "settings.section",
								id: "lmfpd",
								order: 20,
								label: () => t("title"),
								locale: NS
							},
							LmfpdSection
						)
					),
				"dsh-lmfpd: settings section"
			);
		}

		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
