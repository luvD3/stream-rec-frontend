import { describe, expect, it } from "vitest"
import { getMpegtsPlayerConfig } from "@/src/lib/data/playback/player-config"

describe("mpegts player config", () => {
	it("loads recorded files in bounded range-backed chunks", () => {
		expect(getMpegtsPlayerConfig(false)).toMatchObject({
			lazyLoad: true,
			lazyLoadMaxDuration: 180,
			lazyLoadRecoverDuration: 30,
			seekType: "range",
			rangeLoadZeroStart: true,
			enableStashBuffer: true,
			autoCleanupSourceBuffer: true,
		})
	})

	it("keeps live streams in low-latency continuous mode", () => {
		expect(getMpegtsPlayerConfig(true)).toMatchObject({
			lazyLoad: false,
			enableStashBuffer: false,
			stashInitialSize: 128,
			autoCleanupSourceBuffer: true,
		})
	})
})
