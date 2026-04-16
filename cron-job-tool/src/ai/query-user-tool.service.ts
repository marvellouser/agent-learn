import { Injectable } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { UserService } from './user.service';

@Injectable()
export class QueryUserToolService {
  readonly tool: StructuredTool;

  constructor(private readonly userService: UserService) {
    const queryUserArgsSchema = z.object({
      userId: z.string().describe('用户 ID，例如: 001, 002, 003'),
    });

    this.tool = tool(
      async ({ userId }: { userId: string }) => {
        const user = this.userService.findOne(userId);
        if (!user) {
          return JSON.stringify({
            found: false,
            userId,
            message: '用户不存在',
          });
        }
        return JSON.stringify({ found: true, user });
      },
      {
        name: 'query_user',
        description:
          '根据用户 ID 查询内存中的用户信息（姓名、邮箱、角色等），用于校验或展示。',
        schema: queryUserArgsSchema,
      },
    );
  }
}
