import { describe, expect, it, vi } from "vitest"
import { destroyArtPlayer } from "@/src/lib/data/playback/player-lifecycle"

describe("player lifecycle cleanup", () => {
	it("stops mpegts, hls, and the underlying media element before destroying Artplayer", () => {
		const video = {
			pause: vi.fn(),
			removeAttribute: vi.fn(),
			load: vi.fn(),
		}
		const flv = {
			pause: vi.fn(),
			unload: vi.fn(),
			detachMediaElement: vi.fn(),
			destroy: vi.fn(),
		}
		const ts = {
			pause: vi.fn(),
			unload: vi.fn(),
			detachMediaElement: vi.fn(),
			destroy: vi.fn(),
		}
		const hls = {
			stopLoad: vi.fn(),
			detachMedia: vi.fn(),
			destroy: vi.fn(),
		}
		const art = {
			video,
			flv,
			ts,
			hls,
			destroy: vi.fn(),
		}

		destroyArtPlayer(art as never)

		expect(flv.pause).toHaveBeenCalledOnce()
		expect(flv.unload).toHaveBeenCalledOnce()
		expect(flv.detachMediaElement).toHaveBeenCalledOnce()
		expect(flv.destroy).toHaveBeenCalledOnce()
		expect(ts.pause).toHaveBeenCalledOnce()
		expect(ts.unload).toHaveBeenCalledOnce()
		expect(ts.detachMediaElement).toHaveBeenCalledOnce()
		expect(ts.destroy).toHaveBeenCalledOnce()
		expect(hls.stopLoad).toHaveBeenCalledOnce()
		expect(hls.detachMedia).toHaveBeenCalledOnce()
		expect(hls.destroy).toHaveBeenCalledOnce()
		expect(video.pause).toHaveBeenCalledOnce()
		expect(video.removeAttribute).toHaveBeenCalledWith("src")
		expect(video.load).toHaveBeenCalledOnce()
		expect(art.destroy).toHaveBeenCalledWith(false)
		expect(art.flv).toBeNull()
		expect(art.ts).toBeNull()
		expect(art.hls).toBeNull()
	})
})
