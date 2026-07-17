export type MpegtsPlayerConfig = {
	autoCleanupSourceBuffer?: boolean
	autoCleanupMaxBackwardDuration?: number
	autoCleanupMinBackwardDuration?: number
	lazyLoad?: boolean
	lazyLoadMaxDuration?: number
	lazyLoadRecoverDuration?: number
	enableStashBuffer?: boolean
	stashInitialSize?: number
	seekType?: "range" | "param" | "custom"
	rangeLoadZeroStart?: boolean
}

export function getMpegtsPlayerConfig(isLive: boolean): MpegtsPlayerConfig {
	if (isLive) {
		return {
			autoCleanupSourceBuffer: true,
			autoCleanupMaxBackwardDuration: 2 * 60,
			lazyLoad: false,
			enableStashBuffer: false,
			stashInitialSize: 128,
		}
	}

	return {
		autoCleanupSourceBuffer: true,
		autoCleanupMaxBackwardDuration: 5 * 60,
		autoCleanupMinBackwardDuration: 3 * 60,
		lazyLoad: true,
		lazyLoadMaxDuration: 3 * 60,
		lazyLoadRecoverDuration: 30,
		enableStashBuffer: true,
		seekType: "range",
		rangeLoadZeroStart: true,
	}
}
