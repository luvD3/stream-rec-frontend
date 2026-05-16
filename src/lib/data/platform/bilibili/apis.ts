"use server"

import { fetchApi } from "@/src/lib/data/api"
import { z } from "zod"

export const BILIBILI_LOGIN_URL = "https://passport.bilibili.com/login"

const bilibiliQualitySchema = z.object({
	qn: z.number(),
	description: z.string().nullish(),
})

export const bilibiliCookieVerificationResultSchema = z.object({
	valid: z.boolean(),
	loggedIn: z.boolean(),
	userId: z.number().nullish(),
	userName: z.string().nullish(),
	roomId: z.number().nullish(),
	live: z.boolean().nullish(),
	highestQuality: bilibiliQualitySchema.nullish(),
	availableQualities: z.array(bilibiliQualitySchema).default([]),
	message: z.string().nullish(),
})

const bilibiliCookieVerificationApiResponseSchema = z.object({
	code: z.number(),
	msg: z.string(),
	data: bilibiliCookieVerificationResultSchema.optional(),
})

export type BilibiliCookieVerificationResult = z.infer<typeof bilibiliCookieVerificationResultSchema>

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
