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

	it("models Bilibili global quality while keeping streamer quality hidden", async () => {
		const { bilibiliDownloadConfig, bilibiliGlobalConfig } = await importBilibiliDefinitions()

		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "flv", quality: 10000, cookies: "SESSDATA=fixture;" }).success).toBe(true)
		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "hls", cookies: null }).success).toBe(true)
		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "flv", quality: null }).success).toBe(true)
		expect(bilibiliGlobalConfig.safeParse({ sourceFormat: "mp4" }).success).toBe(false)
		expect(bilibiliGlobalConfig.safeParse({ quality: 99999 }).success).toBe(false)
		expect(globalConfigSchema.safeParse({ id: 1, engine: "default", minPartSize: 0, maxPartSize: 0, bilibiliConfig: { sourceFormat: "flv", quality: 10000 } }).success).toBe(true)

		const shape = bilibiliDownloadConfig.shape as Record<string, unknown>
		expect(shape.sourceFormat).toBeDefined()
		expect(shape.cookies).toBeDefined()
		expect(shape.quality).toBeDefined()
	})

	it("wires the Bilibili settings tab with global quality, cookies, and source format controls", () => {
		const platformForm = readSource("src/app/[locale]/(feat)/settings/platform/platform-form.tsx")
		const platformFormWrapper = readSource("src/app/[locale]/(feat)/settings/platform/platform-form-wrapper.tsx")
		const bilibiliTab = readSource("src/app/[locale]/(feat)/settings/platform/tabs/bilibili-tab.tsx")

		expect(platformForm).toContain("PlatformType.BILIBILI")
		expect(platformForm).toContain("<BilibiliTabContent")
		expect(platformForm).toContain('controlPrefix={"bilibiliConfig"}')
		expect(platformForm).toContain("showCookies")
		expect(platformForm).toContain("showDownloadCheckInterval")
		expect(platformForm).toContain("qualityOptions={bilibiliQualityOptions}")
		expect(platformFormWrapper).toContain("useBilibiliQualityTranslations")
		expect(platformForm).toContain("disabled={!isValid}")
		expect(bilibiliTab).toContain("qualityOptions &&")
		expect(bilibiliTab).toContain(".quality")
		expect(bilibiliTab).toContain("parseInt(value, 10)")
		expect(bilibiliTab).toContain("sourceFormat")
		expect(bilibiliTab).toContain('options={["flv", "hls"].map(format => (')
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
		expect(bilibiliPlatform).toContain("showFetchDelay")
		expect(bilibiliPlatform).toContain("showPartedDownloadRetry")
		expect(bilibiliPlatform).toContain("showDownloadCheckInterval")
		expect(bilibiliPlatform).not.toContain("qualityOptions")
	})

	it("keeps Cookie controls manual and read-only-verification friendly", () => {
		const bilibiliPlatform = readSource("src/app/[locale]/(feat)/streamers/components/platforms/bilibili-platform.tsx")
		const bilibiliTab = readSource("src/app/[locale]/(feat)/settings/platform/tabs/bilibili-tab.tsx")
		const cookieActions = readSource("src/app/[locale]/(feat)/settings/platform/components/bilibili-cookie-actions.tsx")
		const cookieApi = readSource("src/lib/data/platform/bilibili/apis.ts")
		const cookiesField = readSource("src/app/[locale]/(feat)/settings/components/form/cookies-formfield.tsx")

		expect(bilibiliPlatform).toContain("showCookies")
		expect(bilibiliTab).toContain("BilibiliCookieActions")
		expect(bilibiliTab).toContain("showCookies &&")
		expect(cookieActions).toContain("BILIBILI_LOGIN_URL")
		expect(cookieActions).toContain("verifyBilibiliCookie")
		expect(cookieActions).toContain("clearCookie")
		expect(cookieApi).toContain("/platforms/bilibili/cookie/verify")
		expect(cookiesField).toContain("extractCookies")
		expect(cookiesField).toContain("field.onChange(cookieString)")
		expect(`${bilibiliPlatform}\n${cookieActions}`).not.toMatch(/webview|auto.?import|qualityOptions/i)
		expect(bilibiliTab).not.toMatch(/webview|auto.?import/i)
		expect(cookieApi).not.toMatch(/updateConfig|revalidateTag/)
		expect(cookiesField).not.toMatch(/fetch\(|updateConfig|persist/i)
	})
})
