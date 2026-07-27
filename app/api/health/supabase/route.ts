import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorWithCause = Error & {
  cause?: {
    code?: string;
    errno?: number | string;
    syscall?: string;
    hostname?: string;
    address?: string;
    port?: number;
    message?: string;
  };
};

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawUrl || !key) {
    return NextResponse.json(
      {
        ok: false,
        stage: "configuration",
        error: "Missing Supabase public environment variables.",
        hasUrl: Boolean(rawUrl),
        hasKey: Boolean(key),
      },
      { status: 500 },
    );
  }

  let projectUrl: URL;

  try {
    projectUrl = new URL(rawUrl.trim());
  } catch {
    return NextResponse.json(
      {
        ok: false,
        stage: "configuration",
        error: "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      new URL("/rest/v1/", projectUrl),
      {
        headers: {
          apikey: key.trim(),
          authorization: `Bearer ${key.trim()}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    const responseText = await response.text();

    return NextResponse.json(
      {
        ok: response.ok,
        stage: "response",
        targetHost: projectUrl.hostname,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        responsePreview: responseText.slice(0, 300),
      },
      { status: response.ok ? 200 : 502 },
    );
  } catch (unknownError) {
    const error = unknownError as ErrorWithCause;

    return NextResponse.json(
      {
        ok: false,
        stage: "network",
        targetHost: projectUrl.hostname,
        errorName: error.name,
        errorMessage: error.message,
        cause: error.cause
          ? {
              code: error.cause.code,
              errno: error.cause.errno,
              syscall: error.cause.syscall,
              hostname: error.cause.hostname,
              address: error.cause.address,
              port: error.cause.port,
              message: error.cause.message,
            }
          : null,
      },
      { status: 502 },
    );
  }
}
