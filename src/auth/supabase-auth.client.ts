import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * The few Supabase Auth calls the API makes itself (sign-in and sign-up
 * happen in the app). The secret key never leaves the server.
 */
@Injectable()
export class SupabaseAuthClient {
  private readonly url: string;

  constructor(private readonly config: ConfigService) {
    this.url = `${config.getOrThrow<string>('SUPABASE_URL')}/auth/v1`;
  }

  /** Whether [password] is the current password of [email]. */
  async checkPassword(email: string, password: string): Promise<boolean> {
    const res = await this.call('/token?grant_type=password', {
      method: 'POST',
      key: this.key('SUPABASE_PUBLISHABLE_KEY'),
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return true;
    if (res.status === 400) return false;
    throw this.unavailable();
  }

  /**
   * Whether the Supabase user still exists: a deleted account's token stays
   * valid until it expires. Without a secret key (local development) it
   * can't ask, and trusts the token.
   */
  async userExists(userId: string): Promise<boolean> {
    const key = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!key) return true;
    const res = await this.call(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'GET',
      key,
    });
    if (res.ok) return true;
    if (res.status === 404) return false;
    throw this.unavailable();
  }

  /** Removes the Supabase user (admin API, needs the secret key). */
  async deleteUser(userId: string): Promise<void> {
    const res = await this.call(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      key: this.key('SUPABASE_SECRET_KEY'),
    });
    // Already gone counts as done.
    if (!res.ok && res.status !== 404) throw this.unavailable();
  }

  private key(name: string): string {
    const key = this.config.get<string>(name);
    if (!key) throw this.unavailable();
    return key;
  }

  private async call(
    path: string,
    { key, ...init }: RequestInit & { key: string },
  ): Promise<Response> {
    try {
      return await fetch(`${this.url}${path}`, {
        ...init,
        headers: { apikey: key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw this.unavailable();
    }
  }

  private unavailable() {
    return new ServiceUnavailableException(
      'El servicio de cuentas no responde, intenta de nuevo',
    );
  }
}
