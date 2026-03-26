import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const draftDisableSchema = z.object({
  secret: z.string().min(20).max(500),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const draftSecret = process.env.DRAFT_SECRET;
    if (!draftSecret) {
      return NextResponse.json(
        { error: "Draft mode not configured" },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    
    // Validate input against schema
    const validatedData = draftDisableSchema.parse(body);
    
    // Compare secrets using constant-time comparison to prevent timing attacks
    const secretMatch = crypto.subtle.timingSafeEqual(
      new TextEncoder().encode(validatedData.secret),
      new TextEncoder().encode(draftSecret)
    ) || false;
    
    if (!secretMatch) {
      return NextResponse.json(
        { error: "Invalid secret" },
        { status: 403 }
      );
    }
    
    // Disable draft mode
    (await draftMode()).disable();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to disable draft" },
      { status: 400 }
    );
  }
}

export async function GET() {
	(await draftMode()).disable();
	return new Response("Draft mode disabled. Redirecting back.", {
		status: 200,
		headers: {
			"content-type": "text/plain",
			refresh: "1; url=/",
		},
	});
}
