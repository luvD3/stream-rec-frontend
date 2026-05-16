import { z } from "zod"
import { baseDownloadConfig } from "@/src/lib/data/streams/definitions"
import { globalPlatformConfig } from "@/src/lib/data/platform/definitions"

export const bilibiliGlobalConfig = globalPlatformConfig.extend({
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
export type BilibiliCookieVerificationResult = z.infer<typeof bilibiliCookieVerificationResultSchema>
