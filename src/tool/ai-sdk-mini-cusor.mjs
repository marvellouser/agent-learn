import 'dotenv/config';
import chalk from 'chalk';
import { streamText, stepCountIs } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { tools } from './ai-sdk-all-tools.mjs';

const openai = createOpenAICompatible({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const model = openai(process.env.MODEL_NAME);

console.log(model, '....');

async function runAgentWithTools(query, maxIterations = 30) {
  console.log(chalk.bgGreen('⏳ 正在等待 AI 思考...'));
  console.log(chalk.bgBlue('\n🚀 Agent 开始思考并生成流...\n'));

  const stream = streamText({
    model,
    maxSteps: maxIterations,
    stopWhen: stepCountIs(25),
    temperature: 0,
    tools,
    messages: [
      {
        role: 'system',
        content: `你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. exec_command: 执行命令（支持 workingDirectory 参数）
4. list_directory: 列出目录

重要规则 - exec_command：
- workingDirectory 参数会自动切换到指定目录
- 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
- 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
- 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }

重要规则 - write_file：
- 当写入 React 组件文件（如 App.tsx）时，如果存在对应的 CSS 文件（如 App.css），在其他 import 语句后加上这个 css 的导入`,
      },
      {
        role: 'user',
        content: query,
      },
    ],
    onStepFinish: ({ stepType, toolCalls }) => {
      if (stepType === 'tool-result' && toolCalls?.length) {
        for (const toolCall of toolCalls) {
          if (toolCall.toolName === 'write_file' && toolCall.args?.filePath) {
            console.log(
              chalk.bgBlue(`\n[工具调用] write_file("${toolCall.args.filePath}") - 已执行\n`)
            );
          }
        }
      }
    },
  });

  for await (const textPart of stream.textStream) {
    process.stdout.write(textPart);
    console.log(2222);
  }

  console.log(11111);

  const text = await stream.text;
  console.log(chalk.green('\n✅ 消息已完整处理'));
  console.log(`\n✨ AI 最终回复:\n${typeof text === 'string' ? text : JSON.stringify(text)}\n`);
  return text;
}

const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite ai-sdk-react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
    - 添加、删除、编辑、标记完成
    - 分类筛选（全部/进行中/已完成）
    - 统计信息显示
    - localStorage 数据持久化
3. 添加复杂样式：
    - 渐变背景（蓝到紫）
    - 卡片阴影、圆角
    - 悬停效果
4. 添加动画：
    - 添加/删除时的过渡动画
    - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

去掉 main.tsx 里的 index.css 导入

之后在 ai-sdk-react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;

async function main() {
  try {
    await runAgentWithTools(case1);
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}\n`);
  }
}

main().catch((error) => {
  console.error(`\n❌ 未捕获错误: ${error.message}\n`);
  process.exitCode = 1;
});
