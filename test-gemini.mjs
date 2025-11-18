import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

async function main() {
  try {
    console.log('GOOGLE_GENERATIVE_AI_API_KEY set:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: 'Say hello in one short sentence as plain JSON: {"message": "hello"}'
    });
    console.log('Result text:', result.text);
  } catch (error) {
    console.error('Error calling Gemini:', error);
  }
}

main().then(() => process.exit(0));
