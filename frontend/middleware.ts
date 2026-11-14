import { NextResponse, type NextRequest } from "next/server";

/**
 * Redireciona para /login quem nao tem cookie de sessao do Django.
 * E apenas conveniencia de navegacao: quem valida a sessao e o papel e o Django.
 */
export function middleware(request: NextRequest) {
  // Desenvolvimento local com login desativado: o Django trata todos como "dev-local".
  if (process.env.AUTH_DESATIVADA === "true" || request.cookies.has("sessionid")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Tudo, exceto a pagina de login, as rotas de API e os arquivos estaticos.
  matcher: ["/((?!login|api/|_next/|favicon.ico).*)"],
};
