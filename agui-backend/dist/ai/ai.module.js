"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const ai_controller_1 = require("./ai.controller");
const config_1 = require("@nestjs/config");
const openai_1 = require("@langchain/openai");
const tools_1 = require("@langchain/core/tools");
const zod_1 = __importDefault(require("zod"));
const mailer_1 = require("@nestjs-modules/mailer");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        controllers: [ai_controller_1.AiController],
        providers: [
            ai_service_1.AiService,
            {
                provide: 'CHAT_MODEL',
                useFactory: (configService) => {
                    return new openai_1.ChatOpenAI({
                        model: configService.get('MODEL_NAME'),
                        apiKey: configService.get('OPENAI_API_KEY'),
                        configuration: {
                            baseURL: configService.get('OPENAI_BASE_URL'),
                        },
                    });
                },
                inject: [config_1.ConfigService],
            },
            {
                provide: 'WEB_SEARCH_TOOL',
                useFactory: (configService) => {
                    const webSearchArgsSchema = zod_1.default.object({
                        query: zod_1.default
                            .string()
                            .min(1)
                            .describe('搜索关键词，例如：公司年报、某个事件等'),
                        count: zod_1.default
                            .number()
                            .int()
                            .min(1)
                            .max(20)
                            .optional()
                            .describe('返回的搜索结果数量，默认 10 条'),
                    });
                    return (0, tools_1.tool)(async ({ query, count }) => {
                        const apiKey = configService.get('BOCHA_API_KEY');
                        if (!apiKey) {
                            return 'Bocha Web Search 的 API Key 未配置（环境变量 BOCHA_API_KEY），请先在服务端配置后再重试。';
                        }
                        const url = 'https://api.bochaai.com/v1/web-search';
                        const body = {
                            query,
                            freshness: 'noLimit',
                            summary: true,
                            count: count ?? 10,
                        };
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(body),
                        });
                        if (!response.ok) {
                            const errorText = await response.text();
                            return `搜索 API 请求失败，状态码: ${response.status}, 错误信息: ${errorText}`;
                        }
                        let json;
                        try {
                            json = await response.json();
                        }
                        catch (e) {
                            return `搜索 API 请求失败，原因是：搜索结果解析失败 ${e.message}`;
                        }
                        try {
                            if (json.code !== 200 || !json.data) {
                                return `搜索 API 请求失败，原因是: ${json.msg ?? '未知错误'}`;
                            }
                            const webpages = json.data.webPages?.value ?? [];
                            if (!webpages.length) {
                                return '未找到相关结果。';
                            }
                            const formatted = webpages
                                .map((page, idx) => `引用: ${idx + 1}
    标题: ${page.name}
    URL: ${page.url}
    摘要: ${page.summary}
    网站名称: ${page.siteName}
    网站图标: ${page.siteIcon}
    发布时间: ${page.dateLastCrawled}`)
                                .join('\n\n');
                            return formatted;
                        }
                        catch (e) {
                            return `搜索 API 请求失败，原因是：搜索结果解析失败 ${e.message}`;
                        }
                    }, {
                        name: 'web_search',
                        description: '使用 Bocha Web Search API 搜索互联网网页。输入为搜索关键词（可选 count 指定结果数量），返回包含标题、URL、摘要、网站名称、图标和时间等信息的结果列表。',
                        schema: webSearchArgsSchema,
                    });
                },
                inject: [config_1.ConfigService],
            },
            {
                provide: 'SEND_MAIL_TOOL',
                useFactory: (mailerService, configService) => {
                    const sendMailArgsSchema = zod_1.default.object({
                        to: zod_1.default.email().describe('收件人邮箱地址，例如：someone@example.com'),
                        subject: zod_1.default.string().describe('邮件主题'),
                        text: zod_1.default.string().optional().describe('纯文本内容，可选'),
                        html: zod_1.default.string().optional().describe('HTML 内容，可选'),
                    });
                    return (0, tools_1.tool)(async ({ to, subject, text, html, }) => {
                        const fallbackFrom = configService.get('MAIL_FROM');
                        await mailerService.sendMail({
                            to,
                            subject,
                            text: text ?? '（无文本内容）',
                            html: html ?? `<p>${text ?? '（无 HTML 内容）'}</p>`,
                            from: fallbackFrom,
                        });
                        return `邮件已发送到 ${to}，主题为「${subject}」`;
                    }, {
                        name: 'send_mail',
                        description: '发送电子邮件。需要提供收件人邮箱、主题，可选文本内容和 HTML 内容。',
                        schema: sendMailArgsSchema,
                    });
                },
                inject: [mailer_1.MailerService, config_1.ConfigService],
            },
        ],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map