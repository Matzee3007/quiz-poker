// Geheimnisse stehen nicht in wrangler.jsonc, wrangler types kennt sie deshalb nicht.
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
  }
}
