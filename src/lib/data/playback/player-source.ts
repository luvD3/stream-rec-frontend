import type { MediaInfo } from "@/src/lib/data/mediainfo/definitions"

type RecordPlaybackSource = {
	type: string
	recordId?: string
}

export function isRecordPlaybackSourceReady(
	source: RecordPlaybackSource | null,
	mediaInfo: MediaInfo | null,
	recordId: string | null
) {
	return Boolean(
		recordId &&
		source?.type === "server-file" &&
		source.recordId === recordId &&
		mediaInfo?.streams &&
		mediaInfo.streams.length > 0
	)
}
