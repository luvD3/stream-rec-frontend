import { z } from "zod"
import { baseDownloadConfig } from "@/src/lib/data/streams/definitions"
import { globalPlatformConfig } from "@/src/lib/data/platform/definitions"

export const bilibiliQualityValues = [30000, 20000, 15000, 10000, 400, 250, 150, 80] as const

export const bilibiliQualityConfig = z.union([
	z.literal(30000),
	z.literal(20000),
	z.literal(15000),
	z.literal(10000),
	z.literal(400),
	z.literal(250),
	z.literal(150),
	z.literal(80),
])

export const bilibiliGlobalConfig = globalPlatformConfig.extend({
	quality: bilibiliQualityConfig.nullish(),
	sourceFormat: z.enum(["flv", "hls"]).nullish(),
})

export const bilibiliDownloadConfig = baseDownloadConfig.merge(bilibiliGlobalConfig)

export const bilibiliQualitySchema = z.object({
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

export type BilibiliGlobalConfig = z.infer<typeof bilibiliGlobalConfig>
export type BilibiliDownloadConfig = z.infer<typeof bilibiliDownloadConfig>
export type BilibiliQuality = z.infer<typeof bilibiliQualityConfig>
export type BilibiliCookieVerificationResult = z.infer<typeof bilibiliCookieVerificationResultSchema>
