export const randomID = (length) => {
	let result = '';
	const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

export const getEpochUTC = () => new Date().getTime();

export const sanitizeNickname = nickname => {
	const alphanumericWithSpace = nickname.replace(/[^\w\s]/gi, "").substring(0, 22);
	if (!(/[a-zA-Z0-9_]/g).test(alphanumericWithSpace)) {
		return "anonymous";
	}
	return alphanumericWithSpace;
}