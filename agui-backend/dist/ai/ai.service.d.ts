import { ChatOpenAI } from '@langchain/openai';
import { UIMessage } from 'ai';
export declare class AiService {
    private readonly webSearchTool;
    private readonly sendMailTool;
    private readonly agent;
    constructor(webSearchTool: any, sendMailTool: any, model: ChatOpenAI);
    stream(messages: UIMessage[]): Promise<ReadableStream<import("ai").UIMessageChunk>>;
}
