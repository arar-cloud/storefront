import { draftMode } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	// Validate draft token if configured
	const draftToken = request.nextUrl.searchParams.get("token");
	const configuredToken = process.env.DRAFT_MODE_TOKEN;

	// If token is configured in environment, require it for draft mode activation
	if (configuredToken) {
		if (!draftToken || draftToken !== configuredToken) {
			return new Response("Unauthorized: Invalid or missing draft token", {
				status: 401,
				headers: {
					"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
				},
			});
		}
	}

	(await draftMode()).enable();
	redirect("/", RedirectType.replace);
}
