import https from "https";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ip = url.searchParams.get("ip");

  if (!ip) {
    return NextResponse.json({ error: "Missing IP address" }, { status: 400 });
  }

  return new Promise((resolve) => {
    const reqHttps = https.get(
      `https://${ip}:6443`,
      { rejectUnauthorized: false, timeout: 3000 },
      (kubeRes) => {
        resolve(
          NextResponse.json({
            reachable: true,
            statusCode: kubeRes.statusCode,
          })
        );
      }
    );

    reqHttps.on("error", () => {
      resolve(
        NextResponse.json({
          reachable: false,
        })
      );
    });

    reqHttps.end();
  });
}
