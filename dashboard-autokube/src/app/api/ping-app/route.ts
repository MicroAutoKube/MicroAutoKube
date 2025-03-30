import http from "http";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
  }

  return new Promise((resolve) => {
    const reqHttp = http.get(
      targetUrl,
      { timeout: 3000 },
      (appRes) => {
        resolve(
          NextResponse.json({
            reachable: true,
            statusCode: appRes.statusCode,
          })
        );
      }
    );

    reqHttp.on("error", () => {
      resolve(
        NextResponse.json({
          reachable: false,
        })
      );
    });

    reqHttp.end();
  });
}
