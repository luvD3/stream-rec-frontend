type BufferedRanges = Pick<TimeRanges, "length" | "start" | "end">

type MediaElementLike = {
	currentTime: number
	buffered: BufferedRanges
}

type MpegtsRuntimePlayer = {
	currentTime?: number
	_player_engine?: {
		// mpegts.js 1.8.0 restarts IO on seek without clearing this lazy-load flag.
		_loading_controller?: {
			_paused?: boolean
		}
	}
}

const MAX_RECOVERABLE_GAP_SECONDS = 0.5

export function createDeferredMpegtsSeek() {
	let pendingTarget: number | null = null

	return {
		capture(video: MediaElementLike) {
			const target = video.currentTime
			if (!Number.isFinite(target) || target < 0 || isPlaybackPositionBuffered(video)) {
				pendingTarget = null
				return false
			}

			pendingTarget = target
			return true
		},
		replay(player: MpegtsRuntimePlayer) {
			if (pendingTarget === null) return false

			const target = pendingTarget
			pendingTarget = null
			player.currentTime = target
			return true
		},
		clear() {
			pendingTarget = null
		},
	}
}

export function isPlaybackPositionBuffered(video: MediaElementLike) {
	const target = video.currentTime
	if (!Number.isFinite(target)) return false

	for (let index = 0; index < video.buffered.length; index += 1) {
		if (target >= video.buffered.start(index) && target < video.buffered.end(index)) {
			return true
		}
	}

	return false
}

export function jumpToNearbyBufferedStart(video: MediaElementLike, maxGapSeconds = MAX_RECOVERABLE_GAP_SECONDS) {
	const target = video.currentTime
	if (!Number.isFinite(target)) return false
	if (isPlaybackPositionBuffered(video)) return false

	for (let index = 0; index < video.buffered.length; index += 1) {
		const start = video.buffered.start(index)
		const gap = start - target
		if (gap > 0) {
			if (gap > maxGapSeconds) return false
			video.currentTime = start
			return true
		}
	}

	return false
}

export function resetMpegtsLazyLoadStateForUnbufferedSeek(player: MpegtsRuntimePlayer, video: MediaElementLike) {
	if (!Number.isFinite(video.currentTime) || isPlaybackPositionBuffered(video)) return false

	const loadingController = player._player_engine?._loading_controller
	if (loadingController?._paused !== true) return false

	loadingController._paused = false
	return true
}
