import { NextResponse } from "next/server";

// Sound prints and recordings belong in the private BirdNET listening tools.
export function GET() {
  return NextResponse.json({error:"Sound prints are private."},{status:404,headers:{"Cache-Control":"no-store"}});
}
