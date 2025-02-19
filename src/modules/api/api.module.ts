import { Module, OnApplicationBootstrap } from "@nestjs/common";
import { DatabaseModule } from "@/database";
import { HealthController } from "@/api/controllers";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { QueueModule } from "@/queue/queue.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-redis-store";
import { CacheModule, CacheStore } from "@nestjs/cache-manager";
import { configAuth } from "./configs/auth";
import { configCache } from "./configs/cache";
import { BusinessModule } from "@/business/business.module";
import { openaiConfig } from "./configs/openai";
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: process.env.APP_ENV === "production" ? 60 : 600,
    }),
    DatabaseModule,
    QueueModule,
    BusinessModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const urlRedis =
          process.env.REDIS_URL + `?family=${process.env.REDIS_FAMILY}`;
        return {
          ttl: configService.get("cache.api.cache_ttl"),
          store: (await redisStore({
            url: urlRedis,
            ttl: Number(configService.get("cache.api.cache_ttl")) / 1000,
          })) as unknown as CacheStore,
        };
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configAuth, configCache, openaiConfig],
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("auth.jwt.jwt_secret_key"),
        global: true,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: CustomThrottlerGuard,
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: FormatResponseInterceptor,
    // },
  ],
})
export class ApiModule implements OnApplicationBootstrap {
  constructor() {}

  async onApplicationBootstrap() {}
}
