import { customProvider } from 'ai';
import { createSynoxCloudModel } from './synoxcloud-provider';

// NOTE: synoxcloud.xyz is a third-party HTTP API, not an official
// Anthropic/Claude API — the "claude-opus-*" names are just the model
// path segments this particular provider uses, not verified Anthropic models.
const claudeOpus45 = createSynoxCloudModel({ modelId: 'claude-opus-4.5' });
const claudeOpus46 = createSynoxCloudModel({ modelId: 'claude-opus-4.6' });
const claudeOpus47 = createSynoxCloudModel({ modelId: 'claude-opus-4.7' });
const claudeOpus48 = createSynoxCloudModel({ modelId: 'claude-opus-4.8' });
const claudeSonnet46 = createSynoxCloudModel({ modelId: 'claude-sonnet-4.6' });

export const myProvider = customProvider({
	languageModels: {
		'claude-opus-4.5': claudeOpus45,
		'claude-opus-4.6': claudeOpus46,
		'claude-opus-4.7': claudeOpus47,
		'claude-opus-4.8': claudeOpus48,
		'claude-sonnet-4.6': claudeSonnet46,
		'title-model': claudeSonnet46,
		'artifact-model': claudeSonnet46
	}
});
