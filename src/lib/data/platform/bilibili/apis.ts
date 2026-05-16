"use server"

import { fetchApi } from "@/src/lib/data/api"
import { z } from "zod"
import { bilibiliCookieVerificationResultSchema } from "@/src/lib/data/platform/bilibili/definitions"

const bilibiliCookieVerificationApiResponseSchema = z.object({
	code: z.number(),
	msg: z.string(),
	data: bilibiliCookieVerificationResultSchema.optional(),
})

export type BilibiliCookieVerificationInput = {
	cookie: string
	roomUrl?: string | null
}

export async function verifyBilibiliCookie(input: BilibiliCookieVerificationInput) {
	const response = await fetchApi("/platforms/bilibili/cookie/verify", {
		method: "POST",
		cache: "no-cache",
		body: JSON.stringify({
			cookie: input.cookie,
			roomUrl: input.roomUrl || null,
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error("Error verifying Bilibili cookie, status: " + response.status + " " + errorText)
	}

	const data = bilibiliCookieVerificationApiResponseSchema.parse(await response.json())

	if (data.code !== 200 || !data.data) {
		throw new Error(data.msg)
	}

	return data.data
}
