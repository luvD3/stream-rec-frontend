import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { globalConfigSchema } from "@/src/lib/data/config/definitions"
import { bilibiliRegex } from "@/src/lib/data/platform/bilibili/constants"
import { PlatformType, platformRegexes } from "@/src/lib/data/platform/definitions"
import { streamerSchema, StreamerState } from "@/src/lib/data/streams/definitions"

const readSource = (relativePath: string) => {
	const fullPath = path.resolve(process.cwd(), relativePath)
	if (!fs.existsSync(fullPath)) {
		throw new Error(`Expected Bilibili frontend production file is not merged: ${relativePath}`)
	}
	return fs.readFileSync(fullPath, "utf8")
}

const importBilibiliDefinitions = async () => {
	try {
		return await import("@/src/lib/data/platform/bilibili/definitions")
	} catch (error) {
		throw new Error("Expected Bilibili platform definitions are not merged", { cause: error })
	}
}

describe("Bilibili platform form contract", () => {
	it("accepts only canonical Bilibili live room urls", () => {
		const regex = new RegExp(bilibiliRegex)

		expect(regex.test("https://live.bilibili.com/22603245")).toBe(true)
		expect(regex.test("https://live.bilibili.com/22603245?live_from=fixture")).toBe(true)
		expect(regex.test("http://live.bilibili.com/22603245")).toBe(false)
		expect(regex.test("https://www.bilibili.com/video/BV1xx411c7mD")).toBe(false)
		expect(platformRegexes).toContainEqual({ platformType: PlatformType.BILIBILI, regex: bilibiliRegex })

		const streamer = streamerSchema.safeParse({
			name: "bilibili fixture",
			url: "https://live.bilibili.com/22603245",
			state: StreamerState.NOT_LIVE,
			isTemplate: false,
			downloadConfig: {
				type: PlatformType.BILIBILI,
			},
		})

		expect(streamer.success).toBe(true)
	})

	it("models Bilibili settings without a user-selectable quality field", async () => {
		const { bilibiliDownloadConfig, bilibiliGlobalConfig } = await importBilibiliDefinitions()

		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "flv", cookies: "SESSDATA=fixture;" }).success).toBe(true)
		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "hls", cookies: null }).success).toBe(true)
		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "mp4" }).success).toBe(false)
		expect(globalConfigSchema.safeParse({ id: 1, engine: "default", minPartSize: 0, maxPartSize: 0, bilibiliConfig: { sourceFormat: "flv" } }).success).toBe(true)

		const shape = bilibiliDownloadConfig.shape as Record<string, unknown>
		expect(shape.sourceFormat).toBeDefined()
		expect(shape.cookies).toBeDefined()
		expect(shape.quality).toBeUndefined()
	})

	it("wires the Bilibili settings tab with cookies and source format controls", () => {
		const platformForm = readSource("src/app/[locale]/(feat)/settings/platform/platform-form.tsx")
		const bilibiliTab = readSource("src/app/[locale]/(feat)/settings/platform/tabs/bilibili-tab.tsx")

		expect(platformForm).toContain("PlatformType.BILIBILI")
		expect(platformForm).toContain("<BilibiliTabContent")
		expect(platformForm).toContain('controlPrefix={"bilibiliConfig"}')
		expect(platformForm).toContain("showCookies")
		expect(platformForm).toContain("showDownloadCheckInterval")
		expect(platformForm).toContain("disabled={!isValid}")
		expect(bilibiliTab).toContain("sourceFormat")
		expect(bilibiliTab).toContain('options={["flv", "hls"].map(format => (')
		expect(bilibiliTab).not.toContain("qualityOptions")
	})

	it("registers Bilibili streamer platform options", () => {
		const streamerForm = readSource("src/app/[locale]/(feat)/streamers/components/streamer-form.tsx")
		const registry = readSource("src/app/[locale]/(feat)/streamers/components/platform-registry.tsx")
		const bilibiliPlatform = readSource("src/app/[locale]/(feat)/streamers/components/platforms/bilibili-platform.tsx")

		expect(streamerForm).toContain("[PlatformType.BILIBILI]: bilibiliDownloadConfig")
		expect(registry).toContain("[PlatformType.BILIBILI]")
		expect(registry).toContain("BilibiliPlatformForm")
		expect(bilibiliPlatform).toContain('controlPrefix={"downloadConfig"}')
		expect(bilibiliPlatform).toContain("showCookies")
		expect(bilibiliPlatform).toContain("showDownloadCheckInterval")
	})

	it("keeps Cookie controls manual and read-only-verification friendly", () => {
		const bilibiliPlatform = readSource("src/app/[locale]/(feat)/streamers/components/platforms/bilibili-platform.tsx")
		const bilibiliTab = readSource("src/app/[locale]/(feat)/settings/platform/tabs/bilibili-tab.tsx")
		const cookiesField = readSource("src/app/[locale]/(feat)/settings/components/form/cookies-formfield.tsx")

		expect(bilibiliPlatform).toContain("showCookies")
		expect(bilibiliTab).toContain("showCookies={showCookies}")
		expect(cookiesField).toContain("extractCookies")
		expect(cookiesField).toContain("field.onChange(cookieString)")
		expect(`${bilibiliPlatform}\n${bilibiliTab}`).not.toMatch(/webview|auto.?import|login|quality/i)
		expect(cookiesField).not.toMatch(/fetch\(|updateConfig|persist/i)
	})
})
