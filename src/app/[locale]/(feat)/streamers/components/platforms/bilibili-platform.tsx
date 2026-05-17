import { useFormContext } from "react-hook-form"
import React from "react"
import { BilibiliTabContent } from "@/src/app/[locale]/(feat)/settings/platform/tabs/bilibili-tab"
import { BilibiliTabString } from "@/src/app/[locale]/(feat)/settings/platform/bilibili-translations"

type BilibiliPlatformFormProps = {
	allowNone?: boolean
	strings: BilibiliTabString
}

export const BilibiliPlatformForm = ({ allowNone, strings }: BilibiliPlatformFormProps) => {
	const form = useFormContext()

	return (
		<>
			<BilibiliTabContent
				controlPrefix={"downloadConfig"}
				control={form.control}
				showCookies
				showPartedDownloadRetry
				showFetchDelay
				showDownloadCheckInterval
				strings={strings}
				allowNone={allowNone}
			/>
		</>
	)
}
