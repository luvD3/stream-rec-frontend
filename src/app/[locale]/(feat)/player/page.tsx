"use client"

import { usePlayerStore } from "@/src/lib/stores/player-store"
import { useEffect, useRef, useCallback, useState } from "react"
import { useRouter } from "@/src/i18n/routing"
import { useSearchParams } from "next/navigation"
import type Artplayer from "artplayer"
import { ContentLayout } from "@/src/components/dashboard/content-layout"
import { MediaInfo, StreamInfo } from "@/src/lib/data/mediainfo/definitions"
import { encodeParams } from "@/src/lib/utils/proxy"
import { getTrueUrl } from "@/src/lib/data/mediainfo/extractor-apis"
import { BASE_PATH } from "@/src/lib/routes"
import type { PlayerSource } from "@/src/lib/stores/player-store"
import {
	fetchPlaybackFlvSeekIndex,
	fetchPlaybackManifest,
	playbackManifestToMediaInfo,
} from "@/src/lib/data/playback/client"
import { injectMpegtsFlvSeekIndex, isUsableFlvSeekIndex } from "@/src/lib/data/playback/flv-seek-index"
import { getMpegtsPlayerConfig } from "@/src/lib/data/playback/player-config"
import {
	createDeferredMpegtsSeek,
	isPlaybackPositionBuffered,
	jumpToNearbyBufferedStart,
	resetMpegtsLazyLoadStateForUnbufferedSeek,
} from "@/src/lib/data/playback/mpegts-seek-recovery"
import {
	DanmuCue,
	fetchDanmuCues,
	formatDanmuTime,
	getNextDanmuCue,
	getVisibleDanmuCues,
} from "@/src/lib/data/playback/danmu"
import { Button } from "@/src/components/new-york/ui/button"
import {
	destroyArtPlayer,
	destroyHlsPlayer,
	destroyMpegtsPlayer,
	releaseMediaElement,
} from "@/src/lib/data/playback/player-lifecycle"
import { isRecordPlaybackSourceReady } from "@/src/lib/data/playback/player-source"

// Utility function to find stream by URL
const findStreamByUrl = (streams: StreamInfo[], url: string) => {
	return streams.find(stream => stream.url === url)
}

// Utility function to handle stream switching
const handleStreamSwitch = async (
	streamInfo: StreamInfo | null,
	url: string,
	mediaInfo: MediaInfo | null
): Promise<StreamInfo | null> => {
	if (!streamInfo) return null

	// fix cases when switching quality
	if (streamInfo.url !== url) {
		const stream = findStreamByUrl(mediaInfo?.streams || [], url)
		if (stream) {
			return stream
		}
	}
	return streamInfo
}

// Utility function to get proxy URL
const getProxyUrlForStream = async (
	streamInfo: StreamInfo,
	source: PlayerSource | null,
	buildProxyUrl: (url: string) => string,
	getUrlAndSwitch: (streamInfo: StreamInfo, art: Artplayer) => Promise<string | null>,
	art: Artplayer
): Promise<string | null> => {
	let proxyUrl: string | null = streamInfo.url

	if (source?.type === "server-file") {
		// check if the url is already a proxy url
		if (!streamInfo.url.startsWith("/api/proxy")) {
			proxyUrl = buildProxyUrl(streamInfo.url)
		}
	} else {
		proxyUrl = await getUrlAndSwitch(streamInfo, art)
		if (!proxyUrl) {
			art.notice.show = "Error getting true url"
			return null
		}
	}
	return proxyUrl
}

export default function PlayerPage() {
	const { source, mediaInfo, headers, setSource, setMediaInfo, clearPlayer } = usePlayerStore()
	const router = useRouter()
	const searchParams = useSearchParams()
	const recordId = searchParams.get("recordId")
	const artRef = useRef<HTMLDivElement>(null)
	const mpegts = useRef<any>(null)
	const playerRef = useRef<Artplayer | null>(null)
	const playerInitRef = useRef(0)
	const flvSeekRecoveryCleanupRef = useRef<(() => void) | null>(null)
	const [recordLoading, setRecordLoading] = useState(false)
	const [recordLoadError, setRecordLoadError] = useState<string | null>(null)
	const [playerError, setPlayerError] = useState<string | null>(null)
	const [danmuCues, setDanmuCues] = useState<DanmuCue[]>([])
	const [danmuEnabled, setDanmuEnabled] = useState(true)
	const [danmuLoading, setDanmuLoading] = useState(false)
	const [danmuError, setDanmuError] = useState<string | null>(null)
	const [currentTime, setCurrentTime] = useState(0)
	const recordSourceReady = isRecordPlaybackSourceReady(source, mediaInfo, recordId)

	// Consolidated player state
	const playerState = useRef({
		cdn: "",
		format: "",
		bitrate: 0,
		streamInfo: null as StreamInfo | null,
	})

	const buildProxyUrl = useCallback(
		(url: string) => {
			const encodedParams = encodeParams(url, headers)
			return `${BASE_PATH}/api/proxy?data=${encodedParams}`
		},
		[headers]
	)

	const getUrlAndSwitch = useCallback(
		async (streamInfo: StreamInfo, art: Artplayer) => {
			try {
				const newInfo = await getTrueUrl(source!.url!, streamInfo)
				return newInfo ? buildProxyUrl(newInfo.url) : null
			} catch (error) {
				art.notice.show = "Error getting true url"
				return null
			}
		},
		[source, buildProxyUrl]
	)

	const destroyFlvPlayer = (art: Artplayer) => {
		try {
			flvSeekRecoveryCleanupRef.current?.()
			flvSeekRecoveryCleanupRef.current = null
			if (art.flv) {
				destroyMpegtsPlayer(art.flv)
				art.flv = null
				console.log("flv player destroyed")
			}
		} catch (error) {
			console.error("Error destroying FLV player:", error)
		}
	}

	const destroyTsPlayer = (art: Artplayer) => {
		try {
			if (art.ts) {
				destroyMpegtsPlayer(art.ts)
				art.ts = null
				console.log("ts player destroyed")
			}
		} catch (error) {
			console.error("Error destroying TS player:", error)
		}
	}

	const destroyHlsPlayerForArt = (art: Artplayer) => {
		try {
			if (art.hls) {
				destroyHlsPlayer(art.hls)
				art.hls = null
				console.log("hls player destroyed")
			}
		} catch (error) {
			console.error("Error destroying HLS player:", error)
		}
	}

	const getQualities = useCallback(
		(format: string, cdn: string | undefined) => {
			if (!mediaInfo?.streams) return undefined

			if (mediaInfo.streams.length === 1) {
				return [
					{
						default: true,
						html: `${mediaInfo.streams[0].quality || "Default"}`,
						url: mediaInfo.streams[0].url,
					},
				]
			}

			return mediaInfo.streams
				.filter(stream => stream.format === format && (!cdn || cdn === "" || stream.extras?.cdn === cdn))
				.map((stream: StreamInfo) => ({
					default: stream.url === mediaInfo.streams![0].url,
					html: `${stream.quality || "Default"}`,
					url: stream.url,
				}))
		},
		[mediaInfo]
	)

	const playFlv = useCallback(
		async (video: HTMLVideoElement, streamInfo: StreamInfo | null, url: string, art: Artplayer, initId: number) => {
			const isCurrentInit = () => initId === playerInitRef.current

			if (!mpegts.current.isSupported()) {
				art.notice.show = "Unsupported playback format : flv"
				return
			}

			destroyFlvPlayer(art)

			if (!streamInfo) {
				art.notice.show = "No stream info"
				return
			}

			const updatedStreamInfo = await handleStreamSwitch(streamInfo, url, mediaInfo)
			if (!updatedStreamInfo || !isCurrentInit()) return

			const proxyUrl = await getProxyUrlForStream(updatedStreamInfo, source, buildProxyUrl, getUrlAndSwitch, art)
			if (!proxyUrl || !isCurrentInit()) return

			const flv = mpegts.current.createPlayer(
				{
					type: "flv",
					url: proxyUrl,
					isLive: source?.type === "stream",
					cors: true,
				},
				{
					...getMpegtsPlayerConfig(source?.type === "stream"),
				}
			)

			let flvSeekIndexApplied = false
			let flvSeekIndexFailed = false
			const deferredSeek = createDeferredMpegtsSeek()
			const markFlvSeekIndexFailed = () => {
				flvSeekIndexFailed = true
				deferredSeek.clear()
				if (isCurrentInit()) {
					art.notice.show = "Fast seeking is unavailable for this recording"
				}
			}
			const flvSeekIndexPromise =
				source?.type === "server-file" && recordId
					? fetchPlaybackFlvSeekIndex(recordId).catch(error => {
							console.warn("Failed to load FLV seek index:", error)
							markFlvSeekIndexFailed()
							return null
						})
					: null
			const applyFlvSeekIndex = (index: Awaited<typeof flvSeekIndexPromise>) => {
				if (!index || flvSeekIndexApplied || !isCurrentInit() || art.flv !== flv) return
				if (!isUsableFlvSeekIndex(index)) {
					markFlvSeekIndexFailed()
					return
				}
				flvSeekIndexApplied = injectMpegtsFlvSeekIndex(flv, index)
				if (flvSeekIndexApplied) {
					console.log("FLV seek index loaded", index.keyframeCount)
					resetMpegtsLazyLoadStateForUnbufferedSeek(flv, video)
					if (deferredSeek.replay(flv)) {
						art.notice.show = "Seeking..."
					}
				}
			}

			flvSeekIndexPromise?.then(applyFlvSeekIndex)
			flv.on(mpegts.current.Events?.MEDIA_INFO || "media_info", () => {
				flvSeekIndexPromise?.then(applyFlvSeekIndex)
			})

			if (!isCurrentInit()) {
				destroyMpegtsPlayer(flv)
				releaseMediaElement(video)
				return
			}

			flv.attachMediaElement(video)
			if (source?.type === "server-file") {
				let seekGapRecoveryTimer: number | null = null
				const handleSeeking = () => {
					if (!flvSeekIndexApplied) {
						if (flvSeekIndexFailed) {
							deferredSeek.clear()
							art.notice.show = "Fast seeking is unavailable for this recording"
						} else if (deferredSeek.capture(video)) {
							art.notice.show = "Preparing seek index..."
						}
						return
					}

					deferredSeek.clear()
					if (isPlaybackPositionBuffered(video)) return

					resetMpegtsLazyLoadStateForUnbufferedSeek(flv, video)
					if (seekGapRecoveryTimer !== null) window.clearTimeout(seekGapRecoveryTimer)

					let remainingAttempts = 50
					const recoverSeekGap = () => {
						seekGapRecoveryTimer = null
						if (jumpToNearbyBufferedStart(video)) return

						remainingAttempts -= 1
						if (remainingAttempts > 0) {
							seekGapRecoveryTimer = window.setTimeout(recoverSeekGap, 100)
						}
					}

					seekGapRecoveryTimer = window.setTimeout(recoverSeekGap, 100)
				}
				video.addEventListener("seeking", handleSeeking)
				flvSeekRecoveryCleanupRef.current = () => {
					video.removeEventListener("seeking", handleSeeking)
					if (seekGapRecoveryTimer !== null) window.clearTimeout(seekGapRecoveryTimer)
					deferredSeek.clear()
				}
			}
			flv.load()
			art.flv = flv
			flv.on("error", () => {
				console.log("error", flv.error)
				art.notice.show = "Error playing flv"
			})
			art.on("destroy", () => destroyFlvPlayer(art))
		},
		[buildProxyUrl, getUrlAndSwitch, mediaInfo, recordId, source]
	)

	const playTs = useCallback(
		async (video: HTMLVideoElement, streamInfo: StreamInfo | null, url: string, art: Artplayer, initId: number) => {
			const isCurrentInit = () => initId === playerInitRef.current

			if (!mpegts.current.isSupported()) {
				art.notice.show = "Unsupported playback format : ts"
				return
			}

			destroyTsPlayer(art)

			if (!streamInfo) {
				art.notice.show = "No stream info"
				return
			}

			const updatedStreamInfo = await handleStreamSwitch(streamInfo, url, mediaInfo)
			if (!updatedStreamInfo || !isCurrentInit()) return

			const proxyUrl = await getProxyUrlForStream(updatedStreamInfo, source, buildProxyUrl, getUrlAndSwitch, art)
			if (!proxyUrl || !isCurrentInit()) return

			const ts = mpegts.current.createPlayer(
				{
					type: "mpegts",
					url: proxyUrl,
					isLive: source?.type === "stream",
					cors: true,
				},
				{
					...getMpegtsPlayerConfig(source?.type === "stream"),
				}
			)

			if (!isCurrentInit()) {
				destroyMpegtsPlayer(ts)
				releaseMediaElement(video)
				return
			}

			ts.attachMediaElement(video)
			ts.load()
			art.ts = ts
			art.on("destroy", () => destroyTsPlayer(art))
		},
		[buildProxyUrl, getUrlAndSwitch, mediaInfo, source]
	)

	const playM3U8 = useCallback(
		async (video: HTMLVideoElement, streamInfo: StreamInfo | null, url: string, art: Artplayer, initId: number) => {
			const isCurrentInit = () => initId === playerInitRef.current

			destroyFlvPlayer(art)
			destroyTsPlayer(art)
			destroyHlsPlayerForArt(art)

			if (!streamInfo) {
				art.notice.show = "No stream info"
				return
			}

			const updatedStreamInfo = await handleStreamSwitch(streamInfo, url, mediaInfo)
			if (!updatedStreamInfo || !isCurrentInit()) return

			const proxyUrl = await getProxyUrlForStream(updatedStreamInfo, source, buildProxyUrl, getUrlAndSwitch, art)
			if (!proxyUrl || !isCurrentInit()) {
				return
			}

			const Hls = (await import("hls.js")).default
			if (!isCurrentInit()) return

			if (Hls.isSupported()) {
				destroyHlsPlayerForArt(art)

				const hls = new Hls()
				if (!isCurrentInit()) {
					destroyHlsPlayer(hls)
					return
				}
				hls.loadSource(proxyUrl)
				hls.attachMedia(video)
				art.hls = hls
				art.on("destroy", () => destroyHlsPlayerForArt(art))
			} else if (video.canPlayType("application/vnd.apple.mpegurl")) {
				video.src = proxyUrl
			} else {
				art.notice.show = "Unsupported playback format : m3u8"
			}
		},
		[buildProxyUrl, getUrlAndSwitch, mediaInfo, source]
	)

	const playMp4 = useCallback(
		async (video: HTMLVideoElement, streamInfo: StreamInfo | null, url: string, art: Artplayer, initId: number) => {
			const isCurrentInit = () => initId === playerInitRef.current

			destroyFlvPlayer(art)
			destroyTsPlayer(art)
			destroyHlsPlayerForArt(art)

			if (!streamInfo) {
				art.notice.show = "No stream info"
				return
			}

			const updatedStreamInfo = await handleStreamSwitch(streamInfo, url, mediaInfo)
			if (!updatedStreamInfo || !isCurrentInit()) return

			const proxyUrl = await getProxyUrlForStream(updatedStreamInfo, source, buildProxyUrl, getUrlAndSwitch, art)
			if (!proxyUrl || !isCurrentInit()) {
				return
			}
			video.src = proxyUrl
		},
		[buildProxyUrl, getUrlAndSwitch, mediaInfo, source]
	)

	const initializePlayer = useCallback(
		async (initId: number) => {
			if (!source || !artRef.current || !mediaInfo) return null
			setPlayerError(null)

			const Artplayer = (await import("artplayer")).default

			if (typeof window !== "undefined") {
				mpegts.current = require("mpegts.js")
			}

			if (initId !== playerInitRef.current || !artRef.current) return null

			if (playerRef.current) {
				destroyArtPlayer(playerRef.current)
				playerRef.current = null
			}

			let initialStream
			const customTypeHandlers = {
				flv: (video: HTMLVideoElement, url: string, art: Artplayer) => {
					playFlv(video, playerState.current.streamInfo, url, art, initId)
				},
				m3u8: (video: HTMLVideoElement, url: string, art: Artplayer) => {
					playM3U8(video, playerState.current.streamInfo, url, art, initId)
				},
				mp4: (video: HTMLVideoElement, url: string, art: Artplayer) => {
					playMp4(video, playerState.current.streamInfo, url, art, initId)
				},
				ts: (video: HTMLVideoElement, url: string, art: Artplayer) => {
					playTs(video, playerState.current.streamInfo, url, art, initId)
				},
			}

			if (source.type === "stream" && mediaInfo?.streams) {
				initialStream = mediaInfo.streams.find(stream => stream.extras?.cdn) || mediaInfo.streams[0]
			} else if (source.type === "server-file") {
				initialStream = mediaInfo!.streams![0]
			}

			if (!initialStream) return null

			const state = playerState.current

			state.cdn = initialStream.extras?.cdn || ""
			state.format = initialStream.format
			state.bitrate = initialStream.bitrate || 0
			state.streamInfo = initialStream

			console.log("state", state)

			let controls: any[] = []
			let settings: any[] = []

			if (source.type === "server-file") {
				controls = []
			} else {
				settings = [
					{
						html: "Format",
						selector: [...new Set(mediaInfo!.streams!.map(stream => stream.format))].map((format: string) => ({
							html: format.toUpperCase(),
							value: format,
							default: format === state.format,
						})),
						onSelect: async (item: { html: string; value: string }) => {
							console.log("onSelect", item)
							let newStream = mediaInfo!.streams!.find(
								(stream: StreamInfo) =>
									stream.format === item.value &&
									(!state.cdn || state.cdn === "" || stream.extras?.cdn === state.cdn) &&
									(stream.bitrate === state.bitrate || !stream.bitrate)
							)

							// if the stream is not found, try to find the next stream with the same format and cdn
							if (!newStream) {
								newStream = mediaInfo!.streams!.find(
									(stream: StreamInfo) =>
										stream.format === item.value && (!state.cdn || state.cdn === "" || stream.extras?.cdn === state.cdn)
								)
							}

							console.log("newStream", newStream)

							if (newStream) {
								console.log("switching to", newStream)
								state.format = item.value
								state.bitrate = newStream.bitrate
								if (newStream.extras?.cdn) {
									state.cdn = newStream.extras?.cdn
								}
								state.streamInfo = newStream

								// clear qualities
								art.quality = []

								let finalFormat = newStream.format
								if (finalFormat === "hls") {
									finalFormat = "m3u8"
								}

								art.type = finalFormat

								art
									.switchQuality(newStream.url)
									.then(() => {
										const newQualities = getQualities(item.value, state.cdn)
										if (newQualities && art) {
											art.quality = newQualities
										}
									})
									.catch((error: any) => {
										console.error("Error switching to ", item.value, error)
									})
							}
							return item.html
						},
					},
				]

				// Only add CDN control if there are streams with CDNs
				if (mediaInfo!.streams!.some(stream => stream.extras?.cdn)) {
					controls.push({
						position: "right",
						html: state.cdn || "Default CDN",
						index: 1,
						style: {
							marginRight: "20px",
						},
						selector: [
							...new Set(
								mediaInfo!
									.streams!.filter(stream => stream.format === state.format)
									.map(stream => stream.extras?.cdn || "Default")
							),
						].map((cdn: string) => ({
							html: cdn,
							value: cdn === "Default" ? "" : cdn,
							default: (cdn === "Default" && !state.cdn) || cdn === state.cdn,
						})),
						onSelect: async (item: { html: string; value: string }) => {
							let newStream = mediaInfo!.streams!.find(
								(stream: StreamInfo) =>
									stream.format === state.format &&
									((!item.value && !stream.extras?.cdn) || stream.extras?.cdn === item.value) &&
									(stream.bitrate === state.bitrate || !stream.bitrate)
							)

							if (!newStream) {
								newStream = mediaInfo!.streams!.find(
									(stream: StreamInfo) =>
										stream.format === state.format &&
										((!item.value && !stream.extras?.cdn) || stream.extras?.cdn === item.value)
								)
							}

							if (newStream) {
								state.cdn = item.value
								state.bitrate = newStream.bitrate || 0
								state.streamInfo = newStream

								art.quality = []
								await art.switchQuality(newStream.url)
								const newQualities = getQualities(state.format, item.value)
								if (newQualities && art) {
									art.quality = newQualities
								}
							}
							return item.html
						},
					})
				}
			}

			let proxyUrl = initialStream.url
			if (source.type === "server-file") {
				console.log("building proxy url for server file", initialStream.url)
				proxyUrl = buildProxyUrl(initialStream.url)
				console.log("proxy url", proxyUrl)
			}

			let finalFormat: string = state.format

			if (finalFormat === "hls") {
				finalFormat = "m3u8"
			}

			if (!["flv", "m3u8", "mp4", "ts"].includes(finalFormat)) {
				setPlayerError(`Unsupported playback format: ${finalFormat}`)
				return null
			}

			const art = new Artplayer({
				container: artRef.current,
				url: proxyUrl,
				customType: customTypeHandlers,
				type: finalFormat,
				volume: 0.3,
				isLive: source.type === "stream",
				muted: false,
				autoplay: false,
				pip: true,
				autoSize: true,
				autoMini: true,
				screenshot: false,
				setting: true,
				settings: settings,
				loop: source.type === "stream",
				flip: true,
				playbackRate: true,
				aspectRatio: true,
				fullscreen: true,
				fullscreenWeb: true,
				subtitleOffset: true,
				miniProgressBar: true,
				mutex: true,
				backdrop: true,
				playsInline: true,
				autoPlayback: true,
				airplay: true,
				useSSR: false,
				quality: getQualities(state.format, state.cdn),
				lang: navigator.language.toLowerCase(),
				controls: controls,
			})

			if (initId !== playerInitRef.current) {
				destroyArtPlayer(art)
				return null
			}

			playerRef.current = art
			return art
			// eslint-disable-next-line react-hooks/exhaustive-deps
		},
		[buildProxyUrl, getQualities, mediaInfo, playFlv, playM3U8, playMp4, playTs, source]
	)

	useEffect(() => {
		if (!recordId) return

		let cancelled = false
		clearPlayer()
		setRecordLoading(true)
		setRecordLoadError(null)
		setPlayerError(null)
		setDanmuCues([])
		setDanmuError(null)

		fetchPlaybackManifest(recordId)
			.then(manifest => {
				if (cancelled) return
				setMediaInfo(playbackManifestToMediaInfo(manifest), {})
				setSource({
					type: "server-file",
					recordId,
					url: manifest.video.url,
					danmuUrl: manifest.danmu?.url,
				})
			})
			.catch(error => {
				if (cancelled) return
				setRecordLoadError(error instanceof Error ? error.message : "Failed to load record")
			})
			.finally(() => {
				if (!cancelled) {
					setRecordLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [clearPlayer, recordId, setMediaInfo, setSource])

	useEffect(() => {
		if (source?.type !== "server-file" || !source.danmuUrl) {
			setDanmuCues([])
			setDanmuLoading(false)
			setDanmuError(null)
			return
		}

		let cancelled = false
		setDanmuLoading(true)
		setDanmuError(null)

		fetchDanmuCues(buildProxyUrl(source.danmuUrl))
			.then(cues => {
				if (!cancelled) {
					setDanmuCues(cues)
				}
			})
			.catch(error => {
				if (!cancelled) {
					setDanmuCues([])
					setDanmuError(error instanceof Error ? error.message : "Failed to load danmu")
				}
			})
			.finally(() => {
				if (!cancelled) {
					setDanmuLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [buildProxyUrl, source?.danmuUrl, source?.type])

	useEffect(() => {
		const timer = window.setInterval(() => {
			const video = playerRef.current?.video as HTMLVideoElement | undefined
			if (video) {
				setCurrentTime(video.currentTime)
			}
		}, 250)

		return () => window.clearInterval(timer)
	}, [])

	useEffect(() => {
		return () => {
			playerInitRef.current += 1

			if (playerRef.current) {
				console.log("destroying player...")
				destroyArtPlayer(playerRef.current)
				playerRef.current = null
				console.log("player destroyed")
			}

			clearPlayer()
		}
	}, [clearPlayer])

	useEffect(() => {
		if (!source) {
			if (recordId || recordLoading) {
				return
			}
			router.back()
			return
		}

		if (recordId && !recordSourceReady) {
			return
		}

		// Only require mediaInfo for streaming sources
		if (source.type === "stream" && (!mediaInfo?.streams || !headers)) {
			router.back()
			return
		}

		const initId = playerInitRef.current + 1
		playerInitRef.current = initId

		initializePlayer(initId).catch(error => {
			if (initId === playerInitRef.current) {
				console.error("Error initializing player:", error)
				setPlayerError(error instanceof Error ? error.message : "Failed to initialize player")
			}
		})

		return () => {
			if (initId === playerInitRef.current) {
				playerInitRef.current += 1
			}

			if (playerRef.current) {
				console.log("destroying player...")
				destroyArtPlayer(playerRef.current)
				playerRef.current = null
				console.log("player destroyed")
			}
		}
	}, [headers, initializePlayer, mediaInfo, recordId, recordLoading, recordSourceReady, router, source])

	if ((recordId && !recordSourceReady) || !source || (source.type === "stream" && (!mediaInfo?.streams || !headers))) {
		if (recordLoadError) {
			return (
				<ContentLayout title='Player'>
					<div className='mx-auto flex aspect-video w-full max-w-[1280px] items-center justify-center rounded-md bg-muted text-sm text-destructive'>
						{recordLoadError}
					</div>
				</ContentLayout>
			)
		}

		if (recordLoading || (recordId && !recordSourceReady)) {
			return (
				<ContentLayout title='Player'>
					<div className='mx-auto flex aspect-video w-full max-w-[1280px] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground'>
						Loading record...
					</div>
				</ContentLayout>
			)
		}

		return null
	}

	const hasDanmuTrack = source.type === "server-file" && Boolean(source.danmuUrl)
	const visibleDanmu = getVisibleDanmuCues(danmuCues, currentTime, danmuEnabled)
	const nextDanmu = danmuEnabled ? getNextDanmuCue(danmuCues, currentTime) : null
	const danmuStatus = hasDanmuTrack
		? danmuLoading
			? "Loading danmu..."
			: danmuCues.length === 0
				? "No danmu entries"
				: visibleDanmu.length > 0
					? `${danmuCues.length} loaded`
					: nextDanmu
						? `${danmuCues.length} loaded · next ${formatDanmuTime(nextDanmu.time)}`
						: `${danmuCues.length} loaded`
		: null

	return (
		<ContentLayout title='Player'>
			<div className='relative mx-auto aspect-video w-full max-w-[1280px] overflow-hidden rounded-md bg-black sm:w-[98%] md:w-[95%] lg:w-[90%]'>
				<div ref={artRef} className='h-full w-full' />
				{playerError && (
					<div className='absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white'>
						{playerError}
					</div>
				)}
				{visibleDanmu.map(cue => (
					<span
						key={cue.id}
						className='pointer-events-none absolute whitespace-nowrap text-sm font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] md:text-base'
						style={{
							top: cue.mode === "bottom" ? `${72 + cue.lane * 2}%` : `${6 + cue.lane * 8}%`,
							left: cue.mode === "scroll" ? "100%" : "50%",
							color: cue.color,
							zIndex: 20,
							transform: cue.mode === "scroll" ? undefined : "translateX(-50%)",
							animation: cue.mode === "scroll" ? "stream-rec-danmu-scroll 7s linear forwards" : undefined,
						}}
					>
						{cue.text}
					</span>
				))}
				{source.type === "server-file" && source.danmuUrl && (
					<Button
						type='button'
						variant='secondary'
						size='sm'
						className='absolute right-3 top-3 z-30 h-8 bg-background/85 px-3 text-xs'
						onClick={() => setDanmuEnabled(value => !value)}
					>
						{danmuEnabled ? `Danmu on${danmuCues.length > 0 ? ` (${danmuCues.length})` : ""}` : "Danmu off"}
					</Button>
				)}
				{danmuStatus && (
					<div className='absolute right-3 top-12 z-30 rounded bg-background/85 px-3 py-1 text-xs text-muted-foreground'>
						{danmuStatus}
					</div>
				)}
				{danmuError && (
					<div className='absolute bottom-3 left-3 z-30 max-w-[70%] rounded bg-background/85 px-3 py-2 text-xs text-muted-foreground'>
						{danmuError}
					</div>
				)}
			</div>
			<style jsx global>{`
				@keyframes stream-rec-danmu-scroll {
					from {
						transform: translateX(0);
					}
					to {
						transform: translateX(calc(-100vw - 100%));
					}
				}
			`}</style>
		</ContentLayout>
	)
}
