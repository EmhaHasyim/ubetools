// Derives the AES-CTR keys used by Suno's public encrypted M4A files.
const encoder = new TextEncoder()

type RightsKeyResponse = { key: string; iv: string; glt: string }

async function aesGcmKey(secret: string): Promise<CryptoKey> {
	const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
	return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt'])
}

function exact(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(bytes)
}

async function unwrap(encrypted: string, key: CryptoKey, contentId: string): Promise<Uint8Array> {
	const bytes = Uint8Array.from(atob(encrypted), (char) => char.charCodeAt(0))
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: exact(bytes.slice(0, 12)), additionalData: encoder.encode(contentId) },
		key,
		exact(bytes.slice(12)),
	)
	return new Uint8Array(plain)
}

export async function deriveSunoMediaKey(
	rights: RightsKeyResponse,
	contentId: string,
): Promise<{ key: Uint8Array; iv: Uint8Array }> {
	const key = await aesGcmKey(rights.glt)
	return {
		key: await unwrap(rights.key, key, contentId),
		iv: await unwrap(rights.iv, key, contentId),
	}
}

export async function decryptSunoAudio(
	bytes: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	const cipherKey = await crypto.subtle.importKey('raw', exact(key), { name: 'AES-CTR' }, false, [
		'decrypt',
	])
	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-CTR', counter: exact(iv), length: 128 },
		cipherKey,
		exact(bytes),
	)
	return new Uint8Array(decrypted)
}
