import { describe, expect, it } from "vitest"
import { getForwardedMediaHeaders } from "@/src/lib/utils/media-headers"

describe("media request header forwarding", () => {
	it("keeps byte-range headers needed by browser video playback", () => {
		const headers = new Headers({
			Range: "bytes=100-",
			"If-Range": "\"etag\"",
			"If-Modified-Since": "Wed, 21 Oct 2015 07:28:00 GMT",
			"If-None-Match": "\"etag2\"",
			Authorization: "Bearer secret",
		})

		expect(getForwardedMediaHeaders(headers)).toEqual({
			range: "bytes=100-",
			"if-range": "\"etag\"",
			"if-modified-since": "Wed, 21 Oct 2015 07:28:00 GMT",
			"if-none-match": "\"etag2\"",
		})
	})
})
