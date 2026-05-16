import { useTranslations } from "next-intl"
import React, { useMemo } from "react"
import { PlatformTabContentStrings } from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { useBaseGlobalPlatformTranslations } from "@/src/app/hooks/translations/base-global-platform-translation"
import RichText from "@/src/components/i18n/RichText"
import { BilibiliCookieActionsStrings } from "@/src/app/[locale]/(feat)/settings/platform/components/bilibili-cookie-actions"

export type BilibiliTabString = {
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
