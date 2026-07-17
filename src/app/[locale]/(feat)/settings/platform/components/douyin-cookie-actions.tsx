"use client"

import React, { useState } from "react"
import { ExternalLink, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/src/components/new-york/ui/badge"
import { Button } from "@/src/components/new-york/ui/button"
import { cn } from "@/src/lib/utils"
import { DOUYIN_LIVE_LOGIN_URL } from "@/src/lib/data/platform/douyin/constants"

const requiredCookieFields = ["__ac_nonce", "__ac_signature"] as const

export type DouyinCookieActionsStrings = {
	openLogin: string
	verifyCookie: string
	clearCookie: string
	cookieRequired: string
	clearSuccess: string
	verifySuccess: string
	verifyFailed: string
	hasRequiredFields: string
	missingFields: string
}

export type DouyinCookieActionsProps = {
	cookie?: string | null
	onCookieChange?: (value: string | null) => void
	strings?: Partial<DouyinCookieActionsStrings>
	className?: string
}

type DouyinCookieCheckResult = {
	valid: boolean
	missingFields: string[]
}

const defaultStrings: DouyinCookieActionsStrings = {
	openLogin: "Open Douyin Live login",
	verifyCookie: "Check Cookie",
	clearCookie: "Clear Cookie",
	cookieRequired: "Paste a Douyin Cookie before checking.",
	clearSuccess: "Douyin Cookie cleared.",
	verifySuccess: "Douyin Cookie has the required fields.",
	verifyFailed: "Douyin Cookie is missing required fields.",
	hasRequiredFields: "Required fields present",
	missingFields: "Missing",
}

function hasCookieField(cookie: string, field: string) {
	return new RegExp(`(?:^|;\\s*)${field}=`).test(cookie)
}

function checkDouyinCookie(cookie: string): DouyinCookieCheckResult {
	const missingFields = requiredCookieFields.filter(field => !hasCookieField(cookie, field))
	return {
		valid: missingFields.length === 0,
		missingFields,
	}
}

export function DouyinCookieActions({ cookie, onCookieChange, strings, className }: DouyinCookieActionsProps) {
	const text = { ...defaultStrings, ...strings }
	const [result, setResult] = useState<DouyinCookieCheckResult | null>(null)

	const openLoginPage = () => {
		window.open(DOUYIN_LIVE_LOGIN_URL, "_blank", "noopener,noreferrer")
	}

	const clearCookie = () => {
		onCookieChange?.(null)
		setResult(null)
		toast.success(text.clearSuccess)
	}

	const verifyCookie = () => {
		if (!cookie?.trim()) {
			setResult(null)
			toast.error(text.cookieRequired)
			return
		}

		const checkResult = checkDouyinCookie(cookie)
		setResult(checkResult)

		if (checkResult.valid) {
			toast.success(text.verifySuccess)
		} else {
			toast.error(`${text.verifyFailed} ${text.missingFields}: ${checkResult.missingFields.join(", ")}`)
		}
	}

	const resultLabel = result?.valid
		? text.hasRequiredFields
		: result
			? `${text.missingFields}: ${result.missingFields.join(", ")}`
			: null

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<Button type='button' variant='outline' size='sm' onClick={openLoginPage}>
				<ExternalLink className='mr-2 h-4 w-4' />
				{text.openLogin}
			</Button>
			<Button type='button' variant='outline' size='sm' onClick={verifyCookie}>
				{text.verifyCookie}
			</Button>
			<Button type='button' variant='outline' size='sm' onClick={clearCookie} disabled={!cookie && !result}>
				<Trash2 className='mr-2 h-4 w-4' />
				{text.clearCookie}
			</Button>
			{result && <Badge variant={result.valid ? "default" : "destructive"}>{resultLabel}</Badge>}
		</div>
	)
}
