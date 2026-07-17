const MEDIA_REQUEST_HEADERS = ["range", "if-range", "if-modified-since", "if-none-match"] as const

export function getForwardedMediaHeaders(headers: Headers): Record<string, string> {
	return MEDIA_REQUEST_HEADERS.reduce<Record<string, string>>((result, headerName) => {
		const value = headers.get(headerName)
		if (value) {
			result[headerName] = value
		}
		return result
	}, {})
}
