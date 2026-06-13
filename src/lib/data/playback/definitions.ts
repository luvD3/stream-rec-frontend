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

export const playbackFlvSeekIndexSchema = z.object({
	format: z.literal("flv"),
	duration: z.number(),
	fileSize: z.number(),
	times: z.array(z.number()),
	filepositions: z.array(z.number()),
	keyframeCount: z.number(),
})

export type PlaybackFile = z.infer<typeof playbackFileSchema>
export type PlaybackManifest = z.infer<typeof playbackManifestSchema>
export type PlaybackFlvSeekIndex = z.infer<typeof playbackFlvSeekIndexSchema>
