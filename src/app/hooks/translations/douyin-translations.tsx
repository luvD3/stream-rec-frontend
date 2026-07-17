import { useTranslations } from "next-intl"
import React, { useMemo } from "react"
import { PlatformTabContentStrings } from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { useBaseGlobalPlatformTranslations } from "@/src/app/hooks/translations/base-global-platform-translation"
import RichText from "@/src/components/i18n/RichText"
import type { DouyinCookieActionsStrings } from "@/src/app/[locale]/(feat)/settings/platform/components/douyin-cookie-actions"

export const douyinQualityKeys = ["origin", "uhd", "hd", "sd", "ld", "md", "ao"] as const

export type DouyinQuality = {
	quality: string
	description: string
}

export type DouyinTabString = {
	quality: string
	qualityDescription: string
	qualityDefault: string
	sourceFormat: string
	sourceFormatPlaceholder: string
	sourceFormatDescription: string | React.ReactNode
	cookieActions: DouyinCookieActionsStrings
} & PlatformTabContentStrings

export const useDouyinTranslations = () => {
	const t = useTranslations("Douyin")
	const baseTranslations = useBaseGlobalPlatformTranslations()

	return useMemo<DouyinTabString>(
		() => ({
			...baseTranslations,
			platform: t("platform"),
			sourceFormat: t("sourceFormat"),
			sourceFormatPlaceholder: t("sourceFormatPlaceholder"),
			sourceFormatDescription: <RichText>{tags => t.rich("sourceFormatDescription", tags)}</RichText>,
			quality: t("quality"),
			qualityDescription: t("qualityDescription"),
			qualityDefault: t("qualityDefault"),
			cookieDescription: <RichText>{tags => t.rich("cookieDescription", tags)}</RichText>,
			cookieActions: {
				openLogin: t("cookieActions.openLogin"),
				verifyCookie: t("cookieActions.verifyCookie"),
				clearCookie: t("cookieActions.clearCookie"),
				cookieRequired: t("cookieActions.cookieRequired"),
				clearSuccess: t("cookieActions.clearSuccess"),
				verifySuccess: t("cookieActions.verifySuccess"),
				verifyFailed: t("cookieActions.verifyFailed"),
				hasRequiredFields: t("cookieActions.hasRequiredFields"),
				missingFields: t("cookieActions.missingFields"),
			},
		}),
		[t, baseTranslations]
	)
}

export const useDouyinQualityTranslations = () => {
	const t = useTranslations("DouyinQualities")
	return useMemo(
		() =>
			douyinQualityKeys.map(key => ({
				quality: t(`${key}.id`),
				description: t(`${key}.name`),
			})),
		[t]
	)
}
