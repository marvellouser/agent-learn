import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpServerScript = path.join(__dirname, 'my-mcp-server.mjs');

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'My MCP Server': {
      command: 'node',
      args: [mcpServerScript],
    },
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

const res = await mcpClient.listResources();
let resourceContent = '';
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    resourceContent += content[0].text;
  }
}

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new SystemMessage(resourceContent), new HumanMessage(query)];
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);
    if (!response.tool_calls?.length) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(chalk.bgRed(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(chalk.bgRed(`🔍 工具调用: ${response.tool_calls.map((t) => t.name).join(', ')}`));

    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name);
      if (foundTool) {
        console.log(chalk.bgRed(`🔍 工具调用: ${toolCall.name}`));
        const toolResult = await foundTool.invoke(toolCall.args);
        messages.push(new ToolMessage({ content: toolResult, tool_call_id: toolCall.id }));
      } else {
        console.warn(chalk.yellow(`未知工具: ${toolCall.name}`));
        messages.push(
          new ToolMessage({
            content: `错误：未找到名为 "${toolCall.name}" 的工具。`,
            tool_call_id: toolCall.id,
          })
        );
      }
    }
  }

  console.warn(chalk.yellow(`已达到最大迭代次数 ${maxIterations}`));
  const last = messages[messages.length - 1];
  return last?.content ?? '';
}

await runAgentWithTools('MCP Server 的使用指南是什么');

await mcpClient.close();
