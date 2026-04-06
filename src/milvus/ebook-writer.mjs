import 'dotenv/config';
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { dirname, join, parse } from 'path';
import { fileURLToPath } from 'url';

const COLLECTION_NAME = 'ebook_collection';
const VECTOR_DIM = 1024;
const CHUNK_SIZE = 500;
// const EPUB_FILE = './天龙八部.epub';
const __dirname = dirname(fileURLToPath(import.meta.url));

const EPUB_FILE = join(__dirname, '天龙八部.epub');

const BOOK_NAME = parse(EPUB_FILE).name;

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
 * 创建或获取合集
 * @param {*} bookId 书籍ID
 */
async function ensureCollection(bookId) {
  try {
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });
    if (!hasCollection.value) {
      console.log(`Creating collection: ${COLLECTION_NAME}...`);
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          { name: 'id', data_type: DataType.VarChar, max_length: 100, is_primary_key: true },
          { name: 'book_id', data_type: DataType.VarChar, max_length: 100 },
          { name: 'book_name', data_type: DataType.VarChar, max_length: 200 },
          { name: 'chapter_num', data_type: DataType.Int32 },
          { name: 'index', data_type: DataType.Int32 },
          { name: 'content', data_type: DataType.VarChar, max_length: 10000 },
          { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM },
        ],
      });

      console.log(`✓ Collection created: ${COLLECTION_NAME}`);
      // 创建索引
      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'vector',
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: {
          nlist: 1024,
        },
      });
      console.log(`✓ Index created: ${COLLECTION_NAME}`);
    }

    // 确保集合以加载
    try {
      await client.loadCollection({
        collection_name: COLLECTION_NAME,
      });
      console.log(`✓ Collection loaded: ${COLLECTION_NAME}`);
    } catch (error) {
      console.error('Error:', error.message);
    }
    return COLLECTION_NAME;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * 将文档块批量插入到 Milvus （流式处理）
 */
async function insertChunksBatch(chunks, bookId, chapterNum) {
  try {
    if (chunks.length === 0) {
      return 0;
    }
    //为每个文档块生成向量并构建插入数据
    const insertData = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const vector = await getEmbedding(chunk);
        // 手动生成 ID
        return {
          id: `${bookId}_${chapterNum}_${chunkIndex}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: chunkIndex,
          content: chunk,
          vector: vector,
        };
      })
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData,
    });

    return Number(insertResult.insert_cnt) || 0;
  } catch (error) {
    console.error(`插入章节 ${chapterNum} 失败:`, error.message);
    console.error('Error:', error.message);
    return 0;
  }
}

/**
 * 加载 EPUB 文件并进行流式处理（边处理边插入）
 */
async function loadAndProcessEpubStream(bookId) {
  try {
    console.log(`\nLoading EPUB file: ${EPUB_FILE}...`);
    const loader = new EPubLoader(EPUB_FILE, { splitChapters: true });
    const documents = await loader.load();
    console.log(`✓ 加载完成，共 ${documents.length} 个章节\n`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50,
    });

    let totalInserted = 0;

    for (let chapterIndex = 0; chapterIndex < documents.length; chapterIndex++) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;

      console.log(`处理第 ${chapterIndex + 1}/${documents.length} 章节...`);

      // 使用 splitter 进行二次拆分
      const chunks = await textSplitter.splitText(chapterContent);

      console.log(`✓ 分割完成，共 ${chunks.length} 个片段\n`);

      if (chunks.length === 0) {
        console.log(`⚠️ 章节 ${chapterIndex + 1} 没有内容，跳过...`);
        continue;
      }

      console.log(`生成向量并插入中...`);

      const insertedCount = await insertChunksBatch(chunks, bookId, chapterIndex + 1);
      totalInserted += insertedCount;
      console.log(
        `✓ 插入完成，共 ${insertedCount} 个片段插入成功 （累计 ${totalInserted} 个片段）\n`
      );
    }

    console.log(`\n✓ 所有章节处理完成，共 ${totalInserted} 个片段插入成功\n`);
    return totalInserted;
  } catch (error) {
    console.error('Error:', error.message);
  }
}
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('电子书处理程序');
    console.log('='.repeat(80)); // 连接 Milvus

    console.log('\n连接 Milvus...');
    await client.connectPromise;
    console.log('✓ Connected\n');

    const bookId = 1;
    await ensureCollection(bookId);

    await loadAndProcessEpubStream(bookId);

    console.log('='.repeat(80));
    console.log('处理完成！');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
