import { SERVER_HOST } from "$env/static/private";

export function GET() {
	return new Response(SERVER_HOST, {
		headers: {
			"Content-Type": "text/plain"
		}
	});
}