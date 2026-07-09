import type Artplayer from "artplayer"
import type Hls from "hls.js"

type DisposableMpegtsPlayer = {
	pause?: () => void
	unload?: () => void
	detachMediaElement?: () => void
	destroy?: () => void
}

type DisposableHlsPlayer = Hls & {
	stopLoad?: () => void
	detachMedia?: () => void
}

type ManagedArtplayer = Artplayer & {
	flv?: unknown
	ts?: unknown
	hls?: unknown
	video?: HTMLVideoElement
}

function ignoreCleanupError(cleanup: () => void) {
	try {
		cleanup()
	} catch {
		// Best-effort media cleanup should continue through partially destroyed players.
	}
}

export function releaseMediaElement(video: HTMLMediaElement | null | undefined) {
	if (!video) return

	ignoreCleanupError(() => video.pause())
	ignoreCleanupError(() => video.removeAttribute("src"))
	ignoreCleanupError(() => video.load())
}

export function destroyMpegtsPlayer(player: unknown) {
	if (!player) return

	const mpegtsPlayer = player as DisposableMpegtsPlayer
	ignoreCleanupError(() => mpegtsPlayer.pause?.())
	ignoreCleanupError(() => mpegtsPlayer.unload?.())
	ignoreCleanupError(() => mpegtsPlayer.detachMediaElement?.())
	ignoreCleanupError(() => mpegtsPlayer.destroy?.())
}

export function destroyHlsPlayer(player: unknown) {
	if (!player) return

	const hlsPlayer = player as DisposableHlsPlayer
	ignoreCleanupError(() => hlsPlayer.stopLoad?.())
	ignoreCleanupError(() => hlsPlayer.detachMedia?.())
	ignoreCleanupError(() => hlsPlayer.destroy())
}

export function destroyArtPlayer(art: Artplayer | null | undefined) {
	if (!art) return

	const managedArt = art as ManagedArtplayer
	const video = managedArt.video

	destroyMpegtsPlayer(managedArt.flv)
	managedArt.flv = null

	destroyMpegtsPlayer(managedArt.ts)
	managedArt.ts = null

	destroyHlsPlayer(managedArt.hls)
	managedArt.hls = null

	releaseMediaElement(video)
	ignoreCleanupError(() => art.destroy(false))
}
