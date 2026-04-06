import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

const { MODEL_NAME, OPENAI_API_KEY, OPENAI_BASE_URL } = process.env;

if (!MODEL_NAME || !OPENAI_API_KEY || !OPENAI_BASE_URL) {
  console.error('Missing env: set MODEL_NAME, OPENAI_API_KEY, and OPENAI_BASE_URL in .env (see .env.example).');
  process.exit(1);
}

const model = new ChatOpenAI({
  modelName: MODEL_NAME,
  apiKey: OPENAI_API_KEY,
  configuration: {
    baseURL: OPENAI_BASE_URL,
  },
});

const response = await model.invoke('介绍下自己');
console.log(response.content);
