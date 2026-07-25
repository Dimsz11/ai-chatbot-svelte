export const DEFAULT_CHAT_MODEL: string = 'claude-sonnet-4.6';

interface ChatModel {
	id: string;
	name: string;
	description: string;
}

// NOTE: these call a third-party API (api.synoxcloud.xyz), not the official
// Anthropic API. The names below are just the labels/model-path segments
// that provider uses; they are not verified to be genuine Anthropic models.
export const chatModels: Array<ChatModel> = [
	{
		id: 'claude-opus-4.5',
		name: 'Claude Opus 4.5',
		description: 'via synoxcloud API'
	},
	{
		id: 'claude-opus-4.6',
		name: 'Claude Opus 4.6',
		description: 'via synoxcloud API'
	},
	{
		id: 'claude-opus-4.7',
		name: 'Claude Opus 4.7',
		description: 'via synoxcloud API'
	},
	{
		id: 'claude-opus-4.8',
		name: 'Claude Opus 4.8',
		description: 'via synoxcloud API'
	},
	{
		id: 'claude-sonnet-4.6',
		name: 'Claude Sonnet 4.6',
		description: 'via synoxcloud API'
	}
];
