"use client"

import React, { useState } from "react"
import { ExternalLink, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/new-york/ui/button"
import { LoadingButton } from "@/src/components/new-york/ui/loading-button"
import { Badge } from "@/src/components/new-york/ui/badge"
import { cn } from "@/src/lib/utils"
import {
	BILIBILI_LOGIN_URL,
	BilibiliCookieVerificationResult,
	verifyBilibiliCookie,
} from "@/src/lib/data/platform/bilibili/apis"

type BilibiliCookieActionsStrings = {
	openLogin: string
	verifyCookie: string
	clearCookie: string
	cookieRequired: string
	clearSuccess: string
	verifySuccess: string
	verifyFailed: string
	loggedIn: string
	notLoggedIn: string
	qualityPrefix: string
	offline: string
}

export type BilibiliCookieActionsProps = {
	cookie?: string | null
	roomUrl?: string | null
	onCookieChange?: (value: string | null) => void
	onVerified?: (result: BilibiliCookieVerificationResult) => void
	strings?: Partial<BilibiliCookieActionsStrings>
	className?: string
}

const defaultStrings: BilibiliCookieActionsStrings = {
	openLogin: "Open Bilibili login",
	verifyCookie: "Verify Cookie",
	clearCookie: "Clear Cookie",
	cookieRequired: "Paste a Bilibili Cookie before verification.",
	clearSuccess: "Bilibili Cookie cleared.",
	verifySuccess: "Bilibili Cookie verified.",
	verifyFailed: "Bilibili Cookie is not logged in.",
	loggedIn: "Logged in",
	notLoggedIn: "Not logged in",
	qualityPrefix: "Highest",
	offline: "Room offline",
}

export function BilibiliCookieActions({
	cookie,
	roomUrl,
	onCookieChange,
	onVerified,
	strings,
	className,
}: BilibiliCookieActionsProps) {
	const text = { ...defaultStrings, ...strings }
	const [isVerifying, setIsVerifying] = useState(false)
	const [result, setResult] = useState<BilibiliCookieVerificationResult | null>(null)

	const openLoginPage = () => {
		window.open(BILIBILI_LOGIN_URL, "_blank", "noopener,noreferrer")
	}

	const clearCookie = () => {
		onCookieChange?.(null)
		setResult(null)
		toast.success(text.clearSuccess)
	}

	const verifyCookie = async () => {
		if (!cookie?.trim()) {
			toast.error(text.cookieRequired)
			return
		}

		setIsVerifying(true)
		try {
			const verification = await verifyBilibiliCookie({ cookie, roomUrl })
			setResult(verification)
			onVerified?.(verification)

			if (verification.valid) {
				const quality = verification.highestQuality
				const qualityText = quality ? ` ${text.qualityPrefix}: ${quality.description ?? quality.qn}` : ""
				toast.success(`${text.verifySuccess}${qualityText}`)
			} else {
				toast.error(verification.message || text.verifyFailed)
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text.verifyFailed)
		} finally {
			setIsVerifying(false)
		}
	}

	const qualityLabel = result?.highestQuality
		? `${text.qualityPrefix}: ${result.highestQuality.description ?? result.highestQuality.qn}`
		: result?.live === false
			? text.offline
			: null

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<Button type='button' variant='outline' size='sm' onClick={openLoginPage}>
				<ExternalLink className='mr-2 h-4 w-4' />
				{text.openLogin}
			</Button>
			<LoadingButton type='button' variant='outline' size='sm' loading={isVerifying} onClick={verifyCookie}>
				{text.verifyCookie}
			</LoadingButton>
			<Button type='button' variant='outline' size='sm' onClick={clearCookie} disabled={!cookie && !result}>
				<Trash2 className='mr-2 h-4 w-4' />
				{text.clearCookie}
			</Button>
			{result && (
				<Badge variant={result.valid ? "default" : "destructive"}>
					{result.loggedIn ? text.loggedIn : text.notLoggedIn}
				</Badge>
			)}
			{qualityLabel && <Badge variant='secondary'>{qualityLabel}</Badge>}
		</div>
	)
}
