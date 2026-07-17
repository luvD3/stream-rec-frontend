import { describe, expect, it } from "vitest"
import { isRecordPlaybackSourceReady } from "@/src/lib/data/playback/player-source"

describe("record playback source readiness", () => {
	const mediaInfo = {
		site: "server-file",
		title: "video.flv",
		artist: "stream-rec",
		live: false,
		streams: [
			{
				url: "/files/76/video.flv",
				format: "flv",
				quality: "video.flv",
				bitrate: 0,
			},
		],
	}

	it("rejects a stale server-file source from another record", () => {
		expect(
			isRecordPlaybackSourceReady(
				{
					type: "server-file",
					recordId: "76",
				},
				mediaInfo,
				"75"
			)
		).toBe(false)
	})

	it("accepts the server-file source only when it matches the route record", () => {
		expect(
			isRecordPlaybackSourceReady(
				{
					type: "server-file",
					recordId: "76",
				},
				mediaInfo,
				"76"
			)
		).toBe(true)
	})
})
