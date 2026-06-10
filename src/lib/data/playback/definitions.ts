import { z } from "zod"

export const playbackFileSchema = z.object({
	name: z.string(),
	hash: z.string(),
	url: z.string(),
	size: z.number(),
	contentType: z.string(),
	format: z.string(),
	exists: z.boolean(),
})

export const playbackManifestSchema = z.object({
	id: z.number(),
	title: z.string(),
	streamerName: z.string(),
	dateStart: z.number().nullish(),
	dateEnd: z.number().nullish(),
	video: playbackFileSchema,
	danmu: playbackFileSchema.nullish(),
})

export type PlaybackFile = z.infer<typeof playbackFileSchema>
export type PlaybackManifest = z.infer<typeof playbackManifestSchema>
