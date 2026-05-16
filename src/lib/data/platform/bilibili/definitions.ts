import { z } from "zod"
import { baseDownloadConfig } from "@/src/lib/data/streams/definitions"
import { globalPlatformConfig } from "@/src/lib/data/platform/definitions"

export const bilibiliGlobalConfig = globalPlatformConfig.extend({
	sourceFormat: z.enum(["flv", "hls"]).nullish(),
})

export const bilibiliDownloadConfig = baseDownloadConfig.merge(bilibiliGlobalConfig)

export type BilibiliGlobalConfig = z.infer<typeof bilibiliGlobalConfig>
export type BilibiliDownloadConfig = z.infer<typeof bilibiliDownloadConfig>
