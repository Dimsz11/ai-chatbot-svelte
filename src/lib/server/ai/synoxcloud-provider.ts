import type { LanguageModelV1, LanguageModelV1CallWarning, LanguageModelV1StreamPart } from 'ai';

/**
 * Custom provider for api.synoxcloud.xyz — a simple third-party HTTP API.
 *
 * IMPORTANT: this is NOT an official Anthropic/Claude API. It's a third-party
 * endpoint that happens to use Claude-style model names in its URL path.
 * We cannot verify what model actually answers behind it.
 *
 * The API only supports:
 *   GET https://api.synoxcloud.xyz/ai-chat/{model}?pesan={message}
 * and returns some JSON/text payload for a single message — no native
 * multi-turn / message-array support, and no native streaming.
 *
 * This wrapper:
 *  - Flattens the conversation into a single "pesan" (message) string.
 *  - Calls the endpoint once with fetch (non-streaming).
 *  - Fakes streaming for `doStream` by chunking the final text, so it stays
 *    compatible with `streamText` / `createDataStreamResponse` elsewhere in
 *    the app without changing route code.
 *
 * NOTE: I have not been able to verify the actual JSON shape this API
 * returns (no network access in this sandbox). The parsing logic below
 * tries a few common shapes (`{ result }`, `{ message }`, `{ response }`,
 * `{ answer }`, plain text) — please test against the real endpoint and
 * tell me the actual response shape if parsing fails, so I can fix it.
 */

const SYNOXCLOUD_BASE_URL = 'https://api.synoxcloud.xyz/ai-chat';

interface SynoxCloudModelConfig {
	/** model id used in the URL, e.g. 'claude-opus-4.5' */
	modelId: string;
}

function flattenMessagesToPesan(prompt: LanguageModelV1['doGenerate'] extends never ? never : any): string {
	// prompt is LanguageModelV1CallOptions['prompt']: an array of
	// { role: 'system' | 'user' | 'assistant' | 'tool', content: ... }
	const lines: string[] = [];

	for (const message of prompt as Array<{ role: string; content: unknown }>) {
		const role = message.role;
		let text = '';

		if (typeof message.content === 'string') {
			text = message.content;
		} else if (Array.isArray(message.content)) {
			text = message.content
				.map((part: any) => {
					if (typeof part === 'string') return part;
					if (part?.type === 'text') return part.text;
					return '';
				})
				.filter(Boolean)
				.join(' ');
		}

		if (!text) continue;

		if (role === 'system') {
			lines.push(`[SYSTEM]: ${text}`);
		} else if (role === 'user') {
			lines.push(`[USER]: ${text}`);
		} else if (role === 'assistant') {
			lines.push(`[ASSISTANT]: ${text}`);
		}
	}

	return lines.join('\n');
}

async function callSynoxCloud(modelId: string, pesan: string): Promise<string> {
	const url = `${SYNOXCLOUD_BASE_URL}/${encodeURIComponent(modelId)}?pesan=${encodeURIComponent(pesan)}`;

	const res = await fetch(url, { method: 'GET' });

	if (!res.ok) {
		throw new Error(`synoxcloud API error: ${res.status} ${res.statusText}`);
	}

	const contentType = res.headers.get('content-type') ?? '';

	// Try JSON first, fall back to plain text.
	if (contentType.includes('application/json')) {
		const data = (await res.json()) as Record<string, unknown>;
		// Best-effort guesses at the response shape. Adjust once the real
		// shape is confirmed.
		const candidate =
			data.result ??
			data.message ??
			data.response ??
			data.answer ??
			data.data ??
			data.text ??
			data.reply;

		if (typeof candidate === 'string') return candidate;
		if (candidate && typeof candidate === 'object') {
			// e.g. { data: { message: '...' } }
			const nested = (candidate as Record<string, unknown>).message ?? (candidate as Record<string, unknown>).text;
			if (typeof nested === 'string') return nested;
		}

		// Unknown shape — surface raw JSON so it's at least visible/debuggable.
		return JSON.stringify(data);
	}

	return await res.text();
}

/**
 * Creates a LanguageModelV1-compatible model backed by the synoxcloud API.
 */
export function createSynoxCloudModel({ modelId }: SynoxCloudModelConfig): LanguageModelV1 {
	return {
		specificationVersion: 'v1',
		provider: 'synoxcloud',
		modelId,
		defaultObjectGenerationMode: undefined,

		async doGenerate(options) {
			const pesan = flattenMessagesToPesan(options.prompt);
			const text = await callSynoxCloud(modelId, pesan);

			const warnings: LanguageModelV1CallWarning[] = [];

			return {
				text,
				finishReason: 'stop',
				usage: {
					// synoxcloud does not report token usage; set to 0 as a placeholder.
					promptTokens: 0,
					completionTokens: 0
				},
				rawCall: { rawPrompt: pesan, rawSettings: {} },
				warnings
			};
		},

		async doStream(options) {
			const pesan = flattenMessagesToPesan(options.prompt);
			const text = await callSynoxCloud(modelId, pesan);

			// Fake streaming: emit the whole text as word-sized chunks so
			// downstream `smoothStream({ chunking: 'word' })` still animates.
			const words = text.split(/(\s+)/).filter((w) => w.length > 0);

			const stream = new ReadableStream<LanguageModelV1StreamPart>({
				start(controller) {
					for (const word of words) {
						controller.enqueue({ type: 'text-delta', textDelta: word });
					}
					controller.enqueue({
						type: 'finish',
						finishReason: 'stop',
						usage: { promptTokens: 0, completionTokens: 0 }
					});
					controller.close();
				}
			});

			return {
				stream,
				rawCall: { rawPrompt: pesan, rawSettings: {} }
			};
		}
	};
}
