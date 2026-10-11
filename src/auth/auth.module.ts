import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SupabaseAuthClient } from './supabase-auth.client';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier';

/** Global so every controller's `@UseGuards(JwtAuthGuard)` resolves. */
@Global()
@Module({
  providers: [
    {
      provide: SupabaseJwtVerifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SupabaseJwtVerifier(config.getOrThrow<string>('SUPABASE_URL')),
    },
    AuthService,
    SupabaseAuthClient,
    JwtAuthGuard,
  ],
  exports: [AuthService, SupabaseAuthClient, JwtAuthGuard],
})
export class AuthModule {}
