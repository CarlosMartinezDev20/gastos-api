import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

/** For the host's and uptime monitors' health checks (no auth, no limit). */
@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process answers. Doesn't touch the database, so a
   * database hiccup doesn't make the host restart a healthy API. */
  @Get()
  @ApiOperation({ summary: 'La API está en marcha' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok' } } })
  check() {
    return { status: 'ok' };
  }

  @Get('db')
  @ApiOperation({ summary: 'La API llega a la base de datos' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok' } } })
  @ApiResponse({ status: 503, description: 'Sin conexión a la base de datos' })
  async database() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
    return { status: 'ok' };
  }
}
