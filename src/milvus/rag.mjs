import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

const COLLECTION_NAME = 'ai_diary';
const VECTOR_DIM = 1024;

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0.7,
});

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

/**
 * 从 Milvus 中检索相关的日记条目
 */
async function retrieveRelevantDiaries(query, k = 2) {
  try {
    const queryVector = await getEmbedding(query);
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'content', 'date', 'mood', 'tags'],
    });
    return searchResult.results;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

/**
 * 使用 RAG 回答关于日记的问题
 */
async function answerDiaryQuestion(question, k = 2) {
  try {
    console.log('='.repeat(80));
    console.log(`问题: ${question}`);
    console.log('='.repeat(80));

    console.log('\n检索相关日记');

    const retrieveDiaries = await retrieveRelevantDiaries(question, k);
    if (retrieveDiaries.length === 0) {
      console.log('未找到相关日记');
      return '抱歉 没有找到相关日记';
    }

    retrieveDiaries.forEach((diary) => {
      console.log(`\n[日记${diary.id}] 相似度: ${diary.score.toFixed(4)}`);
      console.log(`内容: ${diary.content}`);
      console.log(`日期: ${diary.date}`);
      console.log(`心情: ${diary.mood}`);
      console.log(`标签: ${diary.tags}`);
    });

    const context = retrieveDiaries
      .map(
        (diary, i) => `[日记${diary.id}]
      日期: ${diary.date}
      心情: ${diary.mood}
      标签: ${diary.tags}
      内容: ${diary.content}`
      )
      .join('\n\n━━━━━\n\n');

    const prompt = `你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题，用亲切自然的语言。

      请根据以下日记内容回答问题：
      ${context}
      
      用户问题: ${question}
      
      回答要求：
      1. 如果日记中有相关信息，请结合日记内容给出详细、温暖的回答
      2. 可以总结多篇日记的内容，找出共同点或趋势
      3. 如果日记中没有相关信息，请温和地告知用户
      4. 用第一人称"你"来称呼日记的作者
      5. 回答要有同理心，让用户感到被理解和关心
      
      AI 助手的回答:`;

    console.log('\n【AI 回答】');
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log('\n');
    return response.content;
  } catch (error) {
    console.error('Error:', error.message);
    return '抱歉，处理您的问题时出现了错误';
  }
}

async function main() {
  try {
    console.log('连接到 Milvus...');
    await client.connectPromise;
    console.log('✓ 连接成功');

    const question = '我最近做了什么让我愤怒的事情？';
    const answer = await answerDiaryQuestion(question, 2);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
main();
