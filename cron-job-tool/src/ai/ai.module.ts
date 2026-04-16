import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { UserService } from './user.service';
import { QueryUserToolService } from './query-user-tool.service';
import { UsersModule } from '../users/users.module';
import { ToolModule } from 'src/tool/tool.module';

@Module({
  imports: [UsersModule, ToolModule],
  controllers: [AiController],
  providers: [
    AiService,
    UserService,
    QueryUserToolService,
    {
      provide: 'QUERY_USER_TOOL',
      useFactory: (svc: QueryUserToolService) => svc.tool,
      inject: [QueryUserToolService],
    },
  ],
})
export class AiModule {}
