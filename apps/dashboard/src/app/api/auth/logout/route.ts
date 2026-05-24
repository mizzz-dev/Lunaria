import { NextRequest, NextResponse } from "next/server";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("lunaria_session");
  return response;
}

