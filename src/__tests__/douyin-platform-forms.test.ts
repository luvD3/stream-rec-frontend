import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { globalConfigSchema } from "@/src/lib/data/config/definitions"
import { DOUYIN_LIVE_LOGIN_URL, douyinRegex } from "@/src/lib/data/platform/douyin/constants"
import { PlatformType, platformRegexes } from "@/src/lib/data/platform/definitions"
import { streamerSchema, StreamerState } from "@/src/lib/data/streams/definitions"

const readSource = (relativePath: string) => {
	const fullPath = path.resolve(process.cwd(), relativePath)
	if (!fs.existsSync(fullPath)) {
		throw new Error(`Expected Douyin frontend production file is not merged: ${relativePath}`)
	}
	return fs.readFileSync(fullPath, "utf8")
}

const importDouyinDefinitions = async () => {
	try {
		return await import("@/src/lib/data/platform/douyin/definitions")
	} catch (error) {
		throw new Error("Expected Douyin platform definitions are not merged", { cause: error })
	}
}

describe("Douyin platform form contract", () => {
	it("accepts canonical Douyin live room urls", () => {
		const regex = new RegExp(douyinRegex)

		expect(regex.test("https://live.douyin.com/123456789")).toBe(true)
		expect(regex.test("https://www.live.douyin.com/example_room")).toBe(true)
		expect(regex.test("https://www.douyin.com/video/123456789")).toBe(false)
		expect(platformRegexes).toContainEqual({ platformType: PlatformType.DOUYIN, regex: douyinRegex })

		const streamer = streamerSchema.safeParse({
			name: "douyin fixture",
			url: "https://live.douyin.com/123456789",
			state: StreamerState.NOT_LIVE,
			isTemplate: false,
			downloadConfig: {
				type: PlatformType.DOUYIN,
			},
		})

		expect(streamer.success).toBe(true)
	})

	it("models Douyin cookies in global config without changing persistence shape", async () => {
		const { douyinDownloadConfig, douyinGlobalConfig } = await importDouyinDefinitions()

		expect(
			douyinGlobalConfig.safeParse({
				sourceFormat: "flv",
				quality: "origin",
				cookies: "__ac_nonce=fixture; __ac_signature=fixture;",
			}).success
		).toBe(true)
		expect(douyinGlobalConfig.safeParse({ sourceFormat: "hls", cookies: null }).success).toBe(true)
		expect(douyinGlobalConfig.safeParse({ sourceFormat: "mp4" }).success).toBe(false)
		expect(
			globalConfigSchema.safeParse({
				id: 1,
				engine: "default",
				minPartSize: 0,
				maxPartSize: 0,
				douyinConfig: { sourceFormat: "flv", quality: "origin" },
			}).success
		).toBe(true)

		const shape = douyinDownloadConfig.shape as Record<string, unknown>
		expect(shape.sourceFormat).toBeDefined()
		expect(shape.cookies).toBeDefined()
		expect(shape.quality).toBeDefined()
	})

	it("wires Douyin global settings with manual Cookie actions", () => {
		const platformForm = readSource("src/app/[locale]/(feat)/settings/platform/platform-form.tsx")
		const douyinTab = readSource("src/app/[locale]/(feat)/settings/platform/tabs/douyin-tab.tsx")
		const cookieActions = readSource("src/app/[locale]/(feat)/settings/platform/components/douyin-cookie-actions.tsx")
		const cookiesField = readSource("src/app/[locale]/(feat)/settings/components/form/cookies-formfield.tsx")

		expect(platformForm).toContain("PlatformType.DOUYIN")
		expect(platformForm).toContain("<DouyinTabContent")
		expect(platformForm).toContain('controlPrefix={"douyinConfig"}')
		expect(platformForm).toContain("showCookies")
		expect(douyinTab).toContain("showCookies={false}")
		expect(douyinTab).toContain("CookiesFormfield")
		expect(douyinTab).toContain("DouyinCookieActions")
		expect(douyinTab).toContain("shouldDirty: true")
		expect(cookieActions).toContain("DOUYIN_LIVE_LOGIN_URL")
		expect(cookieActions).toContain("__ac_nonce")
		expect(cookieActions).toContain("__ac_signature")
		expect(cookieActions).toContain("clearCookie")
		expect(cookiesField).toContain("extractCookies")
		expect(cookiesField).toContain("field.onChange(cookieString)")
		expect(`${douyinTab}\n${cookieActions}`).not.toMatch(/webview|auto.?import/i)
		expect(cookieActions).not.toMatch(/fetch\(|updateConfig|revalidateTag/)
	})

	it("uses the Douyin Live login page as the manual login target", () => {
		expect(DOUYIN_LIVE_LOGIN_URL).toBe("https://live.douyin.com/")
	})
})
