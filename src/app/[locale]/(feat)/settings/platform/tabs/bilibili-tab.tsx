import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/src/components/new-york/ui/form"
import Select from "@/src/app/components/empty-select"
import { SelectItem } from "@/src/components/new-york/ui/select"
import React from "react"
import { useFormContext } from "react-hook-form"
import {
	PlatformTabContent,
	PlatformTabContentProps,
} from "@/src/app/[locale]/(feat)/settings/platform/tabs/common-platform-tab"
import { Badge } from "@/src/components/new-york/ui/badge"
import { BilibiliTabString } from "@/src/app/[locale]/(feat)/settings/platform/bilibili-translations"
import { CookiesFormfield } from "@/src/app/[locale]/(feat)/settings/components/form/cookies-formfield"
import { BilibiliCookieActions } from "@/src/app/[locale]/(feat)/settings/platform/components/bilibili-cookie-actions"

type BilibiliConfigProps = {
	allowNone?: boolean
} & PlatformTabContentProps<BilibiliTabString>

export const BilibiliTabContent = ({
	controlPrefix,
	control,
	showFetchDelay,
	showCookies,
	showPartedDownloadRetry,
	showDownloadCheckInterval,
	allowNone = false,
	strings,
}: BilibiliConfigProps) => {
	const form = useFormContext()
	const cookieFieldName = controlPrefix ? `${controlPrefix}.cookies` : "cookies"
	const cookieValue = form.watch(cookieFieldName) as string | null | undefined
	const roomUrl = form.watch("url") as string | null | undefined

	const setCookieValue = (value: string | null) => {
		form.setValue(cookieFieldName, value, {
			shouldDirty: true,
			shouldTouch: true,
			shouldValidate: true,
		})
	}

	return (
		<>
			<PlatformTabContent
				control={control}
				controlPrefix={controlPrefix}
				showCookies={false}
				showPartedDownloadRetry={showPartedDownloadRetry}
				strings={strings}
				showFetchDelay={showFetchDelay}
				showDownloadCheckInterval={showDownloadCheckInterval}
			>
				<FormField
					control={control}
					name={controlPrefix ? `${controlPrefix}.sourceFormat` : "sourceFormat"}
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<div className={"flex flex-row items-center gap-x-3"}>
									{strings.sourceFormat}
									<Badge>Experimental</Badge>
								</div>
							</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value}
								placeholder={strings.sourceFormatPlaceholder}
								options={["flv", "hls"].map(format => (
									<SelectItem key={format} value={format}>
										{format}
									</SelectItem>
								))}
								allowNone={allowNone}
							/>
							<FormDescription>{strings.sourceFormatDescription}</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</PlatformTabContent>

			{showCookies && (
				<div className='mt-6 space-y-3 fade-in'>
					<CookiesFormfield
						title={strings.cookieTitle}
						description={strings.cookieDescription}
						name={cookieFieldName}
						control={control}
					/>
					<BilibiliCookieActions
						cookie={cookieValue}
						roomUrl={roomUrl}
						onCookieChange={setCookieValue}
						strings={strings.cookieActions}
					/>
				</div>
			)}
		</>
	)
}
