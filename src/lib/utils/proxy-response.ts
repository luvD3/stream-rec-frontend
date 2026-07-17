import { Readable } from "node:stream"

const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
])

type HeaderValue = string | number | string[] | undefined

export function createProxyResponseHeaders(source: Record<string, HeaderValue>): Headers {
	const headers = new Headers()

	for (const [name, value] of Object.entries(source)) {
		if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
			continue
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				headers.append(name, item)
			}
			continue
		}

		headers.set(name, String(value))
	}

	return headers
}

export function nodeReadableToWebStream(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
	if (typeof Readable.toWeb === "function") {
		return Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>
	}

	return new ReadableStream<Uint8Array>({
		start(controller) {
			stream.on("data", chunk => {
				controller.enqueue(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
			})
			stream.on("end", () => controller.close())
			stream.on("error", error => controller.error(error))
		},
		cancel() {
			const destroy = (stream as NodeJS.ReadableStream & { destroy?: () => void }).destroy
			if (destroy) {
				destroy.call(stream)
			}
		},
	})
}
