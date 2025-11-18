// Bridge SvelteKit private env vars into process.env for server-only libraries
import { GOOGLE_GENERATIVE_AI_API_KEY } from '$env/static/private';

if (GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
	process.env.GOOGLE_GENERATIVE_AI_API_KEY = GOOGLE_GENERATIVE_AI_API_KEY;
}

