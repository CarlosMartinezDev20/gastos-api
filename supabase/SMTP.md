# SMTP propio para Supabase Auth

**Por qué hace falta:** el SMTP integrado de Supabase solo envía a las direcciones del equipo de la organización y como mucho 2 correos por hora. Sin un SMTP propio, a un usuario real no le llegan ni el correo para **recuperar la contraseña** ni el de **confirmar la cuenta**. Por eso la confirmación de email está desactivada.

## Proveedor recomendado (gratis)

| Opción | Plan gratuito | Requisito | Para qué |
|---|---|---|---|
| **Resend** (recomendado) | 3 000 correos/mes, 100/día | Un **dominio propio** verificado (registros DNS SPF/DKIM) | Beta y producción |
| Brevo | 300 correos/día | Dominio propio para entregar bien en Gmail | Alternativa a Resend |
| Gmail con *contraseña de aplicación* | ~500/día | Cuenta de Google con verificación en 2 pasos | Beta cerrada con pocos usuarios, sin dominio |

Sin dominio, la opción realista es Gmail con contraseña de aplicación: los correos salen desde tu Gmail. Con dominio (unos 10 USD al año, es un gasto que decides tú), Resend es lo más limpio.

## Valores que tienes que conseguir

| Campo en Supabase | Resend | Gmail |
|---|---|---|
| Host | `smtp.resend.com` | `smtp.gmail.com` |
| Puerto | `465` | `465` |
| Usuario | `resend` | tu dirección de Gmail |
| Contraseña | API key de Resend (`re_...`) | contraseña de aplicación de 16 caracteres |
| Correo remitente | `no-reply@tu-dominio` (dominio verificado) | la misma dirección de Gmail |
| Nombre remitente | `Miaunero` | `Miaunero` |

**La contraseña SMTP no va en Flutter ni en git.** Solo vive en Supabase (y en tu shell un momento, si usas la CLI).

## Activarlo

### Opción A — Dashboard (más simple)
1. Supabase → proyecto `appgastos` → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP* y rellena los valores de la tabla.
2. **Authentication → Rate Limits**: sube «emails sent per hour» (por ejemplo a 30).
3. **Authentication → Emails → Templates**: pega en *Confirm signup* y *Reset password* el contenido de `supabase/templates/confirmation.html` y `recovery.html`.

Con esta opción, refleja después los mismos valores, salvo la contraseña, en `config.toml`, para que un futuro `supabase config push` no los revierta.

### Opción B — CLI (queda en el repo, sin la contraseña)
1. En `supabase/config.toml`, descomenta el bloque `[auth.email.smtp]` y las plantillas, y rellena host, usuario y remitente.
2. Sube `[auth.rate_limit] email_sent` a 30.
3. ```bash
   cd gastos-api
   read -rs SUPABASE_AUTH_SMTP_PASS && export SUPABASE_AUTH_SMTP_PASS   # no queda en el historial
   supabase config push --project-ref gxgjbcywdsiguxfblyof
   unset SUPABASE_AUTH_SMTP_PASS
   ```

## Probar antes de activar la confirmación
1. En la app: login → «¿Olvidaste tu contraseña?» → tu correo → **abre el enlace en el mismo teléfono**. Debe abrirse Miaunero en «Contraseña nueva».
2. Si llega y funciona, activa la confirmación: en `config.toml`, `[auth.email] enable_confirmations = true` y `supabase config push`. O en el Dashboard: *Authentication → Providers → Email → Confirm email*.
3. Registra una cuenta nueva: la app muestra «Confirma tu correo» con «Reenviar correo». Abre el enlace en el teléfono y la app entra sola, o vuelve a iniciar sesión.

**Las cuentas ya existentes no se ven afectadas:** Supabase las creó confirmadas mientras la confirmación estaba desactivada.

## Notas
- Los enlaces vuelven a la app por `io.github.carlosmartinezdev20.appgastos://auth-callback`, que ya está permitido en `additional_redirect_urls`.
- La app usa PKCE: el enlace de recuperación debe abrirse **en el mismo teléfono y la misma instalación** donde se pidió. Si se abre en otro dispositivo, Supabase rechaza el código y hay que pedir otro.
