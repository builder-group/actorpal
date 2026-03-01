export function hexToRgba(hexColor: string, alpha: number): string {
	const hex = hexColor.replace('#', '');
	const hasValidHexLength = hex.length === 6;

	if (!hasValidHexLength) {
		return hexColor;
	}

	const red = Number.parseInt(hex.slice(0, 2), 16);
	const green = Number.parseInt(hex.slice(2, 4), 16);
	const blue = Number.parseInt(hex.slice(4, 6), 16);

	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
