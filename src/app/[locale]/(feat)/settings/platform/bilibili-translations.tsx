import { useTranslations } from "next-intl"
import React, { useMemo } from "react"
import { PlatformTabContentStrings } from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { useBaseGlobalPlatformTranslations } from "@/src/app/hooks/translations/base-global-platform-translation"
import RichText from "@/src/components/i18n/RichText"
import { BilibiliCookieActionsStrings } from "@/src/app/[locale]/(feat)/settings/platform/components/bilibili-cookie-actions"

const bilibiliQualityKeys = ["dolby", "p4k", "p2k", "origin", "blue", "super", "high", "smooth"] as const

export type BilibiliQualityItem = {
	quality: string
	description: string
}

export type BilibiliTabString = {
	quality: string
	qualityDescription: string
	qualityDefault: string
	sourceFormat: string
	sourceFormatPlaceholder: string
	sourceFormatDescription: string | Readonly<React.ReactNode>
	cookieActions: BilibiliCookieActionsStrings
} & PlatformTabContentStrings

export const useBilibiliTranslations = () => {
	const t = useTranslations("Bilibili")
	const baseTranslations = useBaseGlobalPlatformTranslations()

	return useMemo<BilibiliTabString>(
		() =>
			({
				...baseTranslations,
				platform: t("platform"),
				quality: t("quality"),
				qualityDescription: t("qualityDescription"),
				qualityDefault: t("qualityDefault"),
				sourceFormat: t("sourceFormat"),
				sourceFormatPlaceholder: t("sourceFormatPlaceholder"),
				sourceFormatDescription: <RichText>{tags => t.rich("sourceFormatDescription", tags)}</RichText>,
				cookieDescription: <RichText>{tags => t.rich("cookieDescription", tags)}</RichText>,
				cookieActions: {
					openLogin: t("cookieActions.openLogin"),
					verifyCookie: t("cookieActions.verifyCookie"),
					clearCookie: t("cookieActions.clearCookie"),
					cookieRequired: t("cookieActions.cookieRequired"),
					clearSuccess: t("cookieActions.clearSuccess"),
					verifySuccess: t("cookieActions.verifySuccess"),
					verifyFailed: t("cookieActions.verifyFailed"),
					loggedIn: t("cookieActions.loggedIn"),
					notLoggedIn: t("cookieActions.notLoggedIn"),
					qualityPrefix: t("cookieActions.qualityPrefix"),
					offline: t("cookieActions.offline"),
				},
			}) as BilibiliTabString,
		[t, baseTranslations]
	)
}

export const useBilibiliQualityTranslations = () => {
	const t = useTranslations("BilibiliQualities")
	return useMemo(
		() =>
			bilibiliQualityKeys.map(key => ({
				quality: t(`${key}.id`),
				description: t(`${key}.name`),
			})),
		[t]
	)
}
