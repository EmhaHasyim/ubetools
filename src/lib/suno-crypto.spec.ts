import { describe, expect, test, vi } from 'vitest'
import { decryptSunoAudio, deriveSunoMediaKey } from './suno-crypto.ts'

function exact(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(bytes)
}

const CLIP_ID = 'a1d29d70-62dd-4992-b657-c9ab18eae336'

describe('Suno media key derivation', () => {
	test('unwraps the AES-CTR key and IV from public rights data', async () => {
		const glt = 'test-guest-token'
		const wrapKey = await crypto.subtle.importKey(
			'raw',
			new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(glt))),
			{ name: 'AES-GCM' },
			false,
			['encrypt'],
		)
		const wrap = async (value: Uint8Array) => {
			const iv = new Uint8Array(12).fill(7)
			const encrypted = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(CLIP_ID) },
				wrapKey,
				new Uint8Array(value),
			)
			const bytes = new Uint8Array(encrypted)
			return Buffer.concat([Buffer.from(iv), Buffer.from(bytes)]).toString('base64')
		}
		const key = new Uint8Array(16).fill(1)
		const iv = new Uint8Array(16).fill(2)
		const rights = { key: await wrap(key), iv: await wrap(iv), glt }
		const derived = await deriveSunoMediaKey(rights, CLIP_ID)
		expect(derived.key).toEqual(key)
		expect(derived.iv).toEqual(iv)
	})

	test('decrypts multi-block audio in one WebCrypto call', async () => {
		const plaintext = Uint8Array.from({ length: 1024 }, (_, index) => index % 251)
		const key = new Uint8Array(16).fill(3)
		const iv = new Uint8Array(16).fill(4)
		const wrapKey = await crypto.subtle.importKey(
			'raw',
			new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wrap'))),
			{ name: 'AES-GCM' },
			false,
			['encrypt'],
		)
		const wrap = async (value: Uint8Array) => {
			const nonce = new Uint8Array(12).fill(7)
			const encrypted = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv: nonce, additionalData: new TextEncoder().encode('x') },
				wrapKey,
				exact(value),
			)
			return Buffer.concat([Buffer.from(nonce), Buffer.from(new Uint8Array(encrypted))])
		}
		const rights = {
			key: (await wrap(key)).toString('base64'),
			iv: (await wrap(iv)).toString('base64'),
			glt: 'wrap',
		}
		const derived = await deriveSunoMediaKey(rights, 'x')
		const cipherKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CTR' }, false, [
			'encrypt',
		])
		const encrypted = new Uint8Array(
			await crypto.subtle.encrypt(
				{ name: 'AES-CTR', counter: iv, length: 128 },
				cipherKey,
				plaintext,
			),
		)
		const originalDecrypt = crypto.subtle.decrypt.bind(crypto.subtle)
		let calls = 0
		vi.spyOn(crypto.subtle, 'decrypt').mockImplementation(async (...args) => {
			calls += 1
			return originalDecrypt(...args)
		})
		const decrypted = await decryptSunoAudio(encrypted, derived.key, derived.iv)
		expect(decrypted).toEqual(plaintext)
		expect(calls).toBeLessThan(10)
		vi.restoreAllMocks()
	})

	test('decrypts AES-CTR audio with a block counter starting at zero', async () => {
		const plaintext = Uint8Array.from([
			0,
			0,
			0,
			0x1c,
			0x66,
			0x74,
			0x79,
			0x70,
			...Array.from({ length: 24 }, () => 0),
		])
		const key = new Uint8Array(16).fill(3)
		const iv = new Uint8Array(16).fill(4)
		const cipherKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CTR' }, false, [
			'encrypt',
		])
		const encrypted = new Uint8Array(
			await crypto.subtle.encrypt(
				{ name: 'AES-CTR', counter: iv, length: 128 },
				cipherKey,
				plaintext,
			),
		)
		const decrypted = await decryptSunoAudio(encrypted, key, iv)
		expect(decrypted).toEqual(plaintext)
	})
})
