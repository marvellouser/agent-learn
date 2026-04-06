import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';

import { OpenAIEmbeddings } from '@langchain/openai';

const COLLECTION_NAME = 'ai_diary';
const VECTOR_DIM = 1024;

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});

const client = new MilvusClient({
  address: process.env.MILVUS_ADDRESS,
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await client.connectPromise;
    console.log('✓ Connected\n');

    console.log('Searching for similar diary entries...');

    const query = '我想看看关于户外的活动日记';
    console.log(`Query: ${query}\n`);
    const queryVector = await getEmbedding(query);

    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: 2,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'content', 'date', 'mood', 'tags'],
    });

    console.log(`Found ${searchResult.results.length} similar diary entries\n`);
    console.log('Search results:');
    searchResult.results.forEach((result, index) => {
      console.log(`${index + 1}. [Score: ${result.score.toFixed(4)}]`);
      console.log(`ID: ${result.id}, Score: ${result.score}`);
      console.log(`Content: ${result.content}`);
      console.log(`Date: ${result.date}`);
      console.log(`Mood: ${result.mood}`);
      console.log(`Tags: ${result.tags}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
