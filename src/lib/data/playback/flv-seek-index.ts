import type { PlaybackFlvSeekIndex } from "@/src/lib/data/playback/definitions"

type MpegtsRuntimeMediaInfo = {
	hasKeyframesIndex?: boolean
	keyframesIndex?: {
		times: number[]
		filepositions: number[]
	}
	segments?: MpegtsRuntimeMediaInfo[]
}

type MpegtsRuntimePlayer = {
	_player_engine?: {
		_transmuxer?: {
			_controller?: {
				_mediaInfo?: MpegtsRuntimeMediaInfo | null
			}
		}
	}
}

export function isUsableFlvSeekIndex(index: PlaybackFlvSeekIndex): boolean {
	return index.format === "flv" && index.times.length > 0 && index.times.length === index.filepositions.length
}

export function injectMpegtsFlvSeekIndex(player: unknown, index: PlaybackFlvSeekIndex): boolean {
	if (!isUsableFlvSeekIndex(index)) return false

	const mediaInfo = (player as MpegtsRuntimePlayer)?._player_engine?._transmuxer?._controller?._mediaInfo
	const segmentInfo = mediaInfo?.segments?.[0]
	if (!mediaInfo || !segmentInfo) return false

	const keyframesIndex = {
		times: index.times,
		filepositions: index.filepositions,
	}

	mediaInfo.hasKeyframesIndex = true
	mediaInfo.keyframesIndex = keyframesIndex
	segmentInfo.hasKeyframesIndex = true
	segmentInfo.keyframesIndex = keyframesIndex

	return true
}
