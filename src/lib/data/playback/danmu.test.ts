import { describe, expect, it } from "vitest"
import { parseBilibiliDanmuXml } from "@/src/lib/data/playback/danmu"

describe("Bilibili danmu parser", () => {
	it("parses valid XML rows into timed cues", () => {
		const cues = parseBilibiliDanmuXml(`
			<i>
				<d p="1.5,1,25,16711680,0,0,0,0">hello &amp; world</d>
				<d p="3,5,25,65280,0,0,0,0">top</d>
				<d p="4,4,25,255,0,0,0,0">bottom</d>
			</i>
		`)

		expect(cues).toHaveLength(3)
		expect(cues[0]).toMatchObject({ time: 1.5, text: "hello & world", color: "#ff0000", mode: "scroll" })
		expect(cues[1]).toMatchObject({ time: 3, text: "top", color: "#00ff00", mode: "top" })
		expect(cues[2]).toMatchObject({ time: 4, text: "bottom", color: "#0000ff", mode: "bottom" })
	})

	it("skips malformed or empty rows", () => {
		const cues = parseBilibiliDanmuXml(`
			<i>
				<d p="not-time,1,25,16777215,0,0,0,0">bad</d>
				<d p="2,1,25,16777215,0,0,0,0">   </d>
				<d p="5,1,25,16777215,0,0,0,0">good</d>
			</i>
		`)

		expect(cues).toHaveLength(1)
		expect(cues[0]).toMatchObject({ time: 5, text: "good" })
	})
})
