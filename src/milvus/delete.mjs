import 'dotenv/config';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

const COLLECTION_NAME = 'ai_diary';

const client = new MilvusClient({
  address: process.env.MILVUS_ADDRESS,
});

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await client.connectPromise;
    console.log('✓ Connected\n');

    console.log('Deleting diary entry...');
    const deleteId = 'diary_005';
    const result = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id == "${deleteId}"`,
    });

    console.log(`✓ Deleted diary entry: ${result.delete_cnt} record(s)`);
    console.log(`ID: ${deleteId}\n`);

    // 批量删除
    console.log('Batch deleting diary entries...');
    const deleteIds = ['diary_002', 'diary_003'];
    const idsStr = deleteIds.map((id) => `"${id}"`).join(', ');
    const batchResult = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id in [${idsStr}]`,
    });

    console.log(`✓ Batch Deleted ${batchResult.delete_cnt} record(s)`);
    console.log(`IDs: ${deleteIds.map((id) => `"${id}"`).join(', ')}\n`);

    // 条件删除
    console.log('Conditional deleting diary entries...');
    const condition = 'mood == "curious"';
    const conditionalResult = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: condition,
    });

    console.log(`✓ Conditional Deleted ${conditionalResult.delete_cnt} record(s)`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
