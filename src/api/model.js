import { client } from './client';

export const modelApi = {
	list: (provider) => client.get('/model/', { provider }),
};

export const ttsModelApi = {
	list: (provider) => client.get('/tts-model/', { provider }),
};

export const embeddingModelApi = {
	list: (provider) => client.get('/embedding-model/', { provider }),
};
