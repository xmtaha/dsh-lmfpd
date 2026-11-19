# dsh-lmfpd

A **model identity test** for the DeepSeek Harness settings page.

It asks the selected provider and model to write random numbers, compares the
answer with the [lm-detector](https://github.com/Ikaleio/lm-detector) reference
bank, and ranks the closest known fingerprints.

## Why it never asks for an API key

Samples are produced through `ctx.llm.stream`, so the test uses the providers and
credentials the deployment already has. No base URL, wire protocol
(responses / chat completions / messages), or service tier to configure — any
provider registered in DSH works.

Scoring runs in-process through `lmfpd-sdk`; the ~3.6 MB reference bank is
downloaded once and cached by the operating system.

## Install

Requires **Node.js >= 22** and **pnpm** (DSH plugin commands run through pnpm).
Replace `<profile>` with the profile that runs your UI: `web` for browser use,
`desktop` for the desktop app.

```shell
git clone https://github.com/xmtaha/dsh-lmfpd
cd dsh-lmfpd && pnpm install && cd ..
dsh plugin --profile <profile> add ./dsh-lmfpd
```

The second line matters: `dsh plugin add` links the clone instead of copying it,
and Node resolves a linked package's imports from its real path. Without
`node_modules` inside the clone, `index.js` cannot find `lmfpd-sdk` and the
plugin fails to load (the routes 404 and the section never appears). Adding
`lmfpd-sdk` to the profile does not help for the same reason.

Restart DSH afterwards; the section appears as **Settings > Model identity test**.
You can also add the cloned folder from **Settings > Plugins** in the DSH UI.

### Straight from the repository

```shell
dsh plugin --profile <profile> add github:xmtaha/dsh-lmfpd
```

pnpm clones the repository and installs `lmfpd-sdk` itself. If pnpm blocks the
package's build scripts, it prints the exact key to add under `allowBuilds` in
`<profile>/pnpm-workspace.yaml`, then re-run the command.

## Use

1. Open **Settings > Model identity test**.
2. Pick a provider and a model.
3. Press **Run test** — three prompts go out in parallel; usually 5–20 seconds.
4. Read the result: closest identity, family, confidence, the top five candidates
   with score bars, and how many numbers each sample returned.

## Limits

- The result is a **ranking, not proof of identity**. A model missing from the
  reference bank is still matched with its closest neighbour, so treat the answer
  as a signal about the route you are being served.
- Confidence is shown only for calibrated rounds; otherwise the panel says
  *calibration not available*.
- If none of the three answers is usable (refusal, provider error, timeout, no
  numbers), no score is produced and the reason is shown.
- The two routes (`/lmfpd/models`, `/lmfpd/detect`) enforce same-origin: they sit
  in front of DSH's authenticated `/api` fence, so cross-site requests and empty
  `Origin` headers are refused.

## Development

```shell
npm install          # or: pnpm install
node --check index.js
node --check client.js
node test.mjs        # host half: fake ctx + fake model, end-to-end score
```

`test.mjs` makes no network calls of its own; the reference bank comes from the
OS cache.

Layout:

| File | Role |
| --- | --- |
| `index.js` | Host half: two JSON routes, sampling through `ctx.llm`, scoring through `lmfpd-sdk` |
| `client.js` | Browser half: the `settings.section` component |
| `cordis.patch.yml` | Bundle patch that inserts the plugin |
| `locale/en.json` | Package title and description used by the plugin manager |
| `test.mjs` | Host-half check, no DSH required |

## License

MIT