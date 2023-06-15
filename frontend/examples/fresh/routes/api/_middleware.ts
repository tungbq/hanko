import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

type Store = Map<string, Map<string, { todoID: string, description: string, checked: string }>>;

const JWKS_ENDPOINT = `${Deno.env.get("HANKO_API_URL")}/.well-known/jwks.json`;

const store: Store = new Map();

interface State {
  store: Store,
  auth: jose.JWTPayload;
}

function getToken(req: Request): string | undefined {
  const cookies = getCookies(req.headers);
  const authorization = req.headers.get("authorization")

  if (authorization && authorization.split(" ")[0] === "Bearer")
    return authorization.split(" ")[1]
  else if (cookies.hanko)
    return cookies.hanko
}

export async function handler(req: Request, ctx: MiddlewareHandlerContext<State>) {
  const JWKS = jose.createRemoteJWKSet(new URL(JWKS_ENDPOINT), {
    cooldownDuration: 120000,
  });
  const jwt = getToken(req);

  if (jwt) {
    const { payload } = await jose.jwtVerify(jwt, JWKS);
    ctx.state = { auth: payload, store };

    return await ctx.next();
  }

  return new Response(null, { status: 403 });
}
