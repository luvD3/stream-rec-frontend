import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("record player deferred seek wiring", () => {
	it("captures early seeks and replays them after the FLV index is injected", () => {
		const playerPage = fs.readFileSync(path.resolve(process.cwd(), "src/app/[locale]/(feat)/player/page.tsx"), "utf8")

		expect(playerPage).toContain("createDeferredMpegtsSeek")
		expect(playerPage).toContain("deferredSeek.capture(video)")
		expect(playerPage).toContain("deferredSeek.replay(flv)")
		expect(playerPage).toContain("deferredSeek.clear()")
		expect(playerPage).toContain("Preparing seek index...")

		const lazyLoadReset = playerPage.indexOf("resetMpegtsLazyLoadStateForUnbufferedSeek(flv, video)")
		const deferredReplay = playerPage.indexOf("deferredSeek.replay(flv)")
		expect(lazyLoadReset).toBeGreaterThanOrEqual(0)
		expect(lazyLoadReset).toBeLessThan(deferredReplay)
	})
})
