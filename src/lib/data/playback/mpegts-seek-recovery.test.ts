import { describe, expect, it } from "vitest"
import {
	jumpToNearbyBufferedStart,
	resetMpegtsLazyLoadStateForUnbufferedSeek,
} from "@/src/lib/data/playback/mpegts-seek-recovery"

function timeRanges(ranges: Array<[number, number]>) {
	return {
		length: ranges.length,
		start: (index: number) => ranges[index][0],
		end: (index: number) => ranges[index][1],
	}
}

describe("mpegts seek recovery", () => {
	it("resets a stale lazy-load pause before an unbuffered seek", () => {
		const loadingController = { _paused: true }
		const player = {
			_player_engine: {
				_loading_controller: loadingController,
			},
		}
		const video = {
			currentTime: 900,
			buffered: timeRanges([[0, 180]]),
		}

		expect(resetMpegtsLazyLoadStateForUnbufferedSeek(player, video)).toBe(true)
		expect(loadingController._paused).toBe(false)
	})

	it("keeps lazy-load paused for an in-buffer seek", () => {
		const loadingController = { _paused: true }
		const player = {
			_player_engine: {
				_loading_controller: loadingController,
			},
		}
		const video = {
			currentTime: 120,
			buffered: timeRanges([[0, 180]]),
		}

		expect(resetMpegtsLazyLoadStateForUnbufferedSeek(player, video)).toBe(false)
		expect(loadingController._paused).toBe(true)
	})

	it("jumps across the small timestamp gap before the recovered buffer", () => {
		const video = {
			currentTime: 1776.786,
			buffered: timeRanges([[1776.946, 1956.855]]),
		}

		expect(jumpToNearbyBufferedStart(video)).toBe(true)
		expect(video.currentTime).toBe(1776.946)
	})

	it("does not hide a large media gap", () => {
		const video = {
			currentTime: 1776,
			buffered: timeRanges([[1778, 1956]]),
		}

		expect(jumpToNearbyBufferedStart(video)).toBe(false)
		expect(video.currentTime).toBe(1776)
	})
})
