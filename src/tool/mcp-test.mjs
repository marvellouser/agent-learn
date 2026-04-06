import dotenv from 'dotenv';

dotenv.config();

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';

import chalk from 'chalk';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['D:\\myLearn\\tool-learn\\src\\my-mcp-server.mjs'],
    },
    'amap-maps-streamableHTTP': {
      url: 'https://mcp.amap.com/mcp?key=f1e60ebddaa982ce09771b4ef4ad9331',
    },
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', 'D:\\myLearn\\tool-learn'],
    },
    'chrome-devtools': {
      command: 'npx',
      args: ['-y', 'chrome-devtools-mcp@latest'],
    },
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new HumanMessage(query)];
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.green('正在等待AI思考...'));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n AI最终回复：\n ${response.content}\n`);
      return response.content;
    }
    console.log(chalk.bgRed(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(chalk.bgRed(`🔍 工具调用: ${response.tool_calls.map((t) => t.name).join(', ')}`));

    for (const toolCall of response.tool_calls) {
      const findTool = tools.find((t) => t.name === toolCall.name);
      if (findTool) {
        const toolResult = await findTool.invoke(toolCall.args);

        let contentStr = '';
        if (typeof toolResult === 'string') {
          contentStr = toolResult;
        } else if (toolResult && toolResult.text) {
          contentStr = toolResult.text;
        }
        messages.push(new ToolMessage({ content: contentStr, tool_call_id: toolCall.id }));
      }
    }
  }
  return messages[messages.length - 1].content;
}

await runAgentWithTools(
  '北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名'
);

await mcpClient.close();
