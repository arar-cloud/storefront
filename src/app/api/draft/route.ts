import { draftMode } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { draftLimiter, getClientIdentifier } from "@/lib/rate-limiter";

export async function GET(request: Request) {
	const clientId = getClientIdentifier(request);
	const limited = await draftLimiter.isLimited(clientId);
	if (limited) {
		return new Response("Rate limit exceeded", { status: 429 });
	}
	(await draftMode()).enable();
	redirect("/", RedirectType.replace);
}
