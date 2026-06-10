import { describe, expect, it } from "vitest"
import { normalizePlaybackFormat, playbackManifestToMediaInfo } from "@/src/lib/data/playback/client"
import { PlaybackManifest } from "@/src/lib/data/playback/definitions"

describe("playback client helpers", () => {
	it("normalizes backend playback manifest into player media info", () => {
		const manifest: PlaybackManifest = {
			id: 42,
			title: "Long record",
			streamerName: "Streamer",
			dateStart: 100,
			dateEnd: 200,
			video: {
				name: "record.flv",
				hash: "abc.flv",
				url: "/files/42/abc.flv",
				size: 123,
				contentType: "video/x-flv",
				format: "flv",
				exists: true,
			},
			danmu: null,
		}

		expect(playbackManifestToMediaInfo(manifest)).toEqual({
			site: "local",
			title: "Long record",
			artist: "Streamer",
			live: false,
			streams: [
				{
					url: "/files/42/abc.flv",
					format: "flv",
					quality: "record.flv",
					bitrate: 0,
				},
			],
		})
	})

	it("maps hls manifest format to the player m3u8 custom type", () => {
		expect(normalizePlaybackFormat("hls")).toBe("m3u8")
		expect(normalizePlaybackFormat("mp4")).toBe("mp4")
	})
})
