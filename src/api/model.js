import { client } from './client';

export const modelApi = {
	list: (provider) => client.request('model.list', { params: { provider } }),
};

export const ttsModelApi = {
	list: (provider) => client.request('model.ttsList', { params: { provider } }),
};

export const embeddingModelApi = {
	list: (provider) => client.request('model.embeddingList', { params: { provider } }),
};
