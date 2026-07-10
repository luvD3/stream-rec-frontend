import { afterEach, describe, expect, it, vi } from "vitest"
import {
	fetchPlaybackFlvSeekIndex,
	normalizePlaybackFormat,
	playbackManifestToMediaInfo,
} from "@/src/lib/data/playback/client"
import type { PlaybackManifest } from "@/src/lib/data/playback/definitions"

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

const seekIndex = {
	format: "flv",
	duration: 3600,
	fileSize: 1024,
	times: [0, 1000],
	filepositions: [13, 512],
	keyframeCount: 2,
} as const

function indexResponse() {
	return new Response(JSON.stringify(seekIndex), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	})
}

describe("playback FLV seek index client", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("shares one in-flight request for concurrent callers of the same record", async () => {
		const resolvers: Array<(response: Response) => void> = []
		const fetchMock = vi.fn(
			() =>
				new Promise<Response>(resolve => {
					resolvers.push(resolve)
				})
		)
		vi.stubGlobal("fetch", fetchMock)

		const first = fetchPlaybackFlvSeekIndex("220")
		const second = fetchPlaybackFlvSeekIndex("220")

		expect(fetchMock).toHaveBeenCalledTimes(1)
		resolvers.forEach(resolve => resolve(indexResponse()))
		await expect(Promise.all([first, second])).resolves.toEqual([seekIndex, seekIndex])
	})

	it("removes a failed in-flight request so a later caller can retry", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response("index failed", { status: 500 }))
			.mockResolvedValueOnce(indexResponse())
		vi.stubGlobal("fetch", fetchMock)

		await expect(fetchPlaybackFlvSeekIndex("220")).rejects.toThrow("500 index failed")
		await expect(fetchPlaybackFlvSeekIndex("220")).resolves.toEqual(seekIndex)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})
})
