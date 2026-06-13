import { MediaInfo } from "@/src/lib/data/mediainfo/definitions"
import {
	PlaybackFlvSeekIndex,
	PlaybackManifest,
	playbackFlvSeekIndexSchema,
	playbackManifestSchema,
} from "@/src/lib/data/playback/definitions"
import { BASE_PATH } from "@/src/lib/routes"

export async function fetchPlaybackManifest(recordId: string): Promise<PlaybackManifest> {
	const response = await fetch(`${BASE_PATH}/api/streams/${recordId}/playback`, {
		cache: "no-store",
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Failed to load playback manifest: ${response.status} ${errorText}`)
	}

	return playbackManifestSchema.parse(await response.json())
}

export async function fetchPlaybackFlvSeekIndex(recordId: string): Promise<PlaybackFlvSeekIndex> {
	const response = await fetch(`${BASE_PATH}/api/streams/${recordId}/playback/flv-index`, {
		cache: "no-store",
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Failed to load playback FLV seek index: ${response.status} ${errorText}`)
	}

	return playbackFlvSeekIndexSchema.parse(await response.json())
}

export function playbackManifestToMediaInfo(manifest: PlaybackManifest): MediaInfo {
	return {
		site: "local",
		title: manifest.title,
		artist: manifest.streamerName,
		live: false,
		streams: [
			{
				url: manifest.video.url,
				format: normalizePlaybackFormat(manifest.video.format),
				quality: manifest.video.name,
				bitrate: 0,
			},
		],
	}
}

export function normalizePlaybackFormat(format: string): string {
	const normalized = format.toLowerCase()
	if (normalized === "hls") return "m3u8"
	return normalized
}
