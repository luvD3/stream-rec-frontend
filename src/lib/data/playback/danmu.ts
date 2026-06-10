export type DanmuCue = {
	id: string
	time: number
	text: string
	color: string
	mode: "scroll" | "top" | "bottom"
	lane: number
}

const DANMU_ENTRY_PATTERN = /<d\b[^>]*\bp=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/d>/g
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const LANES = 8

export async function fetchDanmuCues(url: string, maxBytes = DEFAULT_MAX_BYTES): Promise<DanmuCue[]> {
	const response = await fetch(url, {
		cache: "no-store",
	})

	if (!response.ok) {
		throw new Error(`Failed to load danmu: ${response.status}`)
	}

	const contentLength = Number(response.headers.get("content-length") ?? "0")
	if (contentLength > maxBytes) {
		throw new Error("Danmu file is too large")
	}

	const xml = await response.text()
	if (xml.length > maxBytes) {
		throw new Error("Danmu file is too large")
	}

	return parseBilibiliDanmuXml(xml)
}

export function parseBilibiliDanmuXml(xml: string): DanmuCue[] {
	const cues: DanmuCue[] = []
	let match: RegExpExecArray | null
	let index = 0

	while ((match = DANMU_ENTRY_PATTERN.exec(xml)) !== null) {
		const cue = parseDanmuEntry(match[2], match[3], index)
		if (cue) {
			cues.push(cue)
			index += 1
		}
	}

	return cues.sort((a, b) => a.time - b.time)
}

function parseDanmuEntry(params: string, rawText: string, index: number): DanmuCue | null {
	const parts = params.split(",")
	const time = Number(parts[0])
	const mode = Number(parts[1])
	const color = Number(parts[3] ?? "16777215")
	const text = decodeXmlText(rawText).trim()

	if (!Number.isFinite(time) || time < 0 || text.length === 0) {
		return null
	}

	return {
		id: `${time}-${index}-${text}`,
		time,
		text,
		color: formatDanmuColor(color),
		mode: mode === 5 ? "top" : mode === 4 ? "bottom" : "scroll",
		lane: index % LANES,
	}
}

function formatDanmuColor(color: number): string {
	const normalized = Math.max(0, Math.min(0xffffff, color))
	return `#${normalized.toString(16).padStart(6, "0")}`
}

function decodeXmlText(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&")
}
