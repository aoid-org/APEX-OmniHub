export interface SessionState {
  readonly authenticated: boolean;
}

export interface MiddlewareRequest {
  readonly url: string;
  readonly nextUrl: {
    readonly pathname: string;
    readonly origin: string;
  };
  readonly session: SessionState | null;
}

export class NextResponse {
  public readonly type: 'next' | 'redirect';
  public readonly status: number;
  public readonly location?: string;

  private constructor(type: 'next' | 'redirect', status = 200, location?: string) {
    this.type = type;
    this.status = status;
    this.location = location;
  }

  static next(): NextResponse {
    return new NextResponse('next', 200);
  }

  static redirect(url: URL, status = 307): NextResponse {
    return new NextResponse('redirect', status, url.toString());
  }
}

export function middleware(request: MiddlewareRequest): NextResponse {
  const { pathname, origin } = request.nextUrl;
  const session = request.session;

  if (session?.authenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', origin), 307);
  }

  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', origin), 307);
  }

  return NextResponse.next();
}
