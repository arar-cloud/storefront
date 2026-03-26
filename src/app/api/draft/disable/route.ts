import { draftMode } from "next/headers";

const DRAFT_MODE_SECRET = process.env.DRAFT_MODE_SECRET;

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const secret = searchParams.get('secret');
		
		if (!secret || secret.length === 0) {
			return new Response(JSON.stringify({ error: 'Missing secret token' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		
		if (!constantTimeEqual(secret, DRAFT_MODE_SECRET || '')) {
			return new Response(JSON.stringify({ error: 'Invalid secret token' }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			});
		}
		
		(await draftMode()).disable();
		return new Response("Draft mode disabled. Redirecting back.", {
			status: 200,
			headers: {
				"content-type": "text/plain",
				refresh: "1; url=/",
			},
		});
	} catch (error) {
		console.error('Draft disable error:', error);
		return new Response(JSON.stringify({ error: 'Request failed' }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}
}
