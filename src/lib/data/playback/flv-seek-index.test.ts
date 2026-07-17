import { injectMpegtsFlvSeekIndex, isUsableFlvSeekIndex } from "@/src/lib/data/playback/flv-seek-index"
import type { PlaybackFlvSeekIndex } from "@/src/lib/data/playback/definitions"
import { describe, expect, it } from "vitest"

const seekIndex = (overrides: Partial<PlaybackFlvSeekIndex> = {}): PlaybackFlvSeekIndex => ({
	format: "flv",
	duration: 10,
	fileSize: 1024,
	times: [0, 5000],
	filepositions: [13, 512],
	keyframeCount: 2,
	...overrides,
})

describe("FLV seek index injection", () => {
	it("accepts non-empty matching keyframe arrays", () => {
		expect(isUsableFlvSeekIndex(seekIndex())).toBe(true)
		expect(isUsableFlvSeekIndex(seekIndex({ times: [] }))).toBe(false)
		expect(isUsableFlvSeekIndex(seekIndex({ filepositions: [13] }))).toBe(false)
	})

	it("injects keyframes into mpegts runtime media info and first segment", () => {
		const player = {
			_player_engine: {
				_transmuxer: {
					_controller: {
						_mediaInfo: {
							segments: [{}],
						},
					},
				},
			},
		}

		expect(injectMpegtsFlvSeekIndex(player, seekIndex())).toBe(true)
		const mediaInfo = player._player_engine._transmuxer._controller._mediaInfo
		expect(mediaInfo.hasKeyframesIndex).toBe(true)
		expect(mediaInfo.keyframesIndex).toEqual({ times: [0, 5000], filepositions: [13, 512] })
		expect(mediaInfo.segments[0].hasKeyframesIndex).toBe(true)
		expect(mediaInfo.segments[0].keyframesIndex).toEqual({ times: [0, 5000], filepositions: [13, 512] })
	})

	it("returns false before mpegts media info is ready", () => {
		expect(injectMpegtsFlvSeekIndex({}, seekIndex())).toBe(false)
	})
})
