import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"
import { createProxyResponseHeaders, nodeReadableToWebStream } from "@/src/lib/utils/proxy-response"

describe("proxy response helpers", () => {
	it("keeps media range headers while dropping hop-by-hop headers", () => {
		const headers = createProxyResponseHeaders({
			"content-type": "video/x-flv",
			"content-length": 4,
			"content-range": "bytes 100-103/1000",
			"accept-ranges": "bytes",
			connection: "keep-alive",
			"transfer-encoding": "chunked",
		})

		expect(headers.get("content-type")).toBe("video/x-flv")
		expect(headers.get("content-length")).toBe("4")
		expect(headers.get("content-range")).toBe("bytes 100-103/1000")
		expect(headers.get("accept-ranges")).toBe("bytes")
		expect(headers.has("connection")).toBe(false)
		expect(headers.has("transfer-encoding")).toBe(false)
	})

	it("converts node readable streams for route responses", async () => {
		const reader = nodeReadableToWebStream(Readable.from([Buffer.from("ok")])).getReader()
		const chunk = await reader.read()
		const done = await reader.read()

		expect(Buffer.from(chunk.value ?? []).toString("utf-8")).toBe("ok")
		expect(done.done).toBe(true)
	})
})
