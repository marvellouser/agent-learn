import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tool } from 'ai';
import { z } from 'zod';

const readFileTool = tool({
  description: '读取指定路径的文件内容',
  inputSchema: z.object({
    filePath: z.string().describe('文件路径'),
  }),
  execute: async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
      return `文件内容:\n${content}`;
    } catch (error) {
      console.error(`[工具调用] read_file("${filePath}") - 失败: ${error.message}`);
      return `读取文件失败: ${error.message}`;
    }
  },
});

const writeFileTool = tool({
  description: '向指定路径写入文件内容，自动创建目录',
  inputSchema: z.object({
    filePath: z.string().describe('文件路径'),
    content: z.string().describe('要写入的内容'),
  }),
  execute: async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`[工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
      return `文件写入成功 ${filePath}`;
    } catch (error) {
      console.error(`[工具调用] write_file("${filePath}") - 失败: ${error.message}`);
      return `文件写入失败: ${error.message} ${filePath}`;
    }
  },
});

const executeCommandTool = tool({
  description: '执行系统命令，支持指定工作目录，实时显示输出',
  inputSchema: z.object({
    command: z.string().describe('要执行的命令'),
    workingDirectory: z.string().optional().describe('工作目录（推荐指定）'),
  }),
  execute: async ({ command, workingDirectory }) => {
    const cwd = workingDirectory || process.cwd();
    console.log(`[工具调用] exec_command("${command}") - 工作目录: ${workingDirectory || cwd}`);

    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd });
      let errorMsg = '';

      child.on('error', (err) => {
        errorMsg = err.message;
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[工具调用] exec_command("${command}") - 命令执行成功`);
          const cwdInfo = workingDirectory
            ? `\n\n重要提示：命令目录"${workingDirectory}"中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: ${workingDirectory} 参数， 不要使用 cd 命令`
            : '';
          resolve(`命令执行成功: ${command} ${cwdInfo}`);
          return;
        }

        console.error(
          `[工具调用] exec_command("${command}") - 命令执行失败: ${errorMsg}, 错误码: ${code}`
        );
        reject(`命令执行失败: 退出码: ${code}${errorMsg ? `, 错误信息: \n${errorMsg}` : ''}`);
      });
    });
  },
});

const listDirectoryTool = tool({
  description: '列出指定目录下的所有文件和文件夹',
  inputSchema: z.object({
    directoryPath: z.string().describe('目录路径'),
  }),
  execute: async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath);
      console.log(
        `[工具调用] list_directory("${directoryPath}") - 成功列出 ${files.length} 个文件`
      );
      return `目录内容: \n${files.map((f) => `- ${f}`).join('\n')}`;
    } catch (error) {
      console.error(`[工具调用] list_directory("${directoryPath}") - 失败: ${error.message}`);
      return `列出目录失败: ${error.message} ${directoryPath}`;
    }
  },
});

const tools = {
  read_file: readFileTool,
  write_file: writeFileTool,
  exec_command: executeCommandTool,
  list_directory: listDirectoryTool,
};

export { tools, readFileTool, writeFileTool, executeCommandTool, listDirectoryTool };
