import { auth } from "@/auth"
import { API_URL, jsonHeaders } from "@/src/lib/data/definitions"

type RouteContext = {
	params: Promise<{
		id: string
	}>
}

export async function GET(_: Request, { params }: RouteContext) {
	const { id } = await params
	const session = await auth()
	const headers: Record<string, string> = {
		...jsonHeaders,
	}

	if (session?.user?.token) {
		headers.Authorization = `Bearer ${session.user.token}`
	}

	const response = await fetch(`${API_URL}/streams/${id}/playback`, {
		headers,
		cache: "no-store",
	})

	return new Response(response.body, {
		headers: response.headers,
		status: response.status,
		statusText: response.statusText,
	})
}
