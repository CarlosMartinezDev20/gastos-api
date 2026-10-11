/**
 * Checks the environment once at startup (ConfigModule `validate`): a
 * missing or malformed variable stops the API with a clear message instead
 * of failing on the first request. Never echoes the values (they're secrets).
 */
export function validateEnv(env: Record<string, unknown>) {
  const production = env.NODE_ENV === 'production';
  const errors: string[] = [];
  const text = (name: string) =>
    typeof env[name] === 'string' ? env[name].trim() : '';

  for (const name of ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL']) {
    if (!text(name)) errors.push(`${name} es obligatoria`);
  }

  const url = text('SUPABASE_URL');
  if (url && !/^https?:\/\/[^/]+$/.test(url)) {
    errors.push('SUPABASE_URL debe ser la URL del proyecto, sin barra final');
  }

  // Account deletion checks the password and removes the Supabase user.
  if (production) {
    for (const name of ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
      if (!text(name)) errors.push(`${name} es obligatoria en producción`);
    }
    if (!text('CORS_ORIGIN')) {
      errors.push('CORS_ORIGIN es obligatoria en producción');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join('\n- ')}`);
  }
  return env;
}
