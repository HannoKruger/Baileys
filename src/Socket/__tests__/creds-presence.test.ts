import { encodeBinaryNode } from '../../WABinary/encode'

/**
 * Mirrors the guard in makeSocket's `creds.update` listener. Kept as a pure
 * function so the decision can be tested without opening a socket.
 */
const shouldBroadcastPushName = (updateName: string | undefined, currentName: string | undefined) =>
	Boolean(updateName) && currentName !== updateName

describe('creds.update presence broadcast guard', () => {
	it('does not broadcast when the update carries no name', () => {
		// A partial creds.update — e.g. { nextPreKeyId, firstUnuploadedPreKeyId }
		expect(shouldBroadcastPushName(undefined, 'Hanno')).toBe(false)
	})

	it('does not broadcast when the name is unchanged', () => {
		expect(shouldBroadcastPushName('Hanno', 'Hanno')).toBe(false)
	})

	it('broadcasts when a new push name is received', () => {
		expect(shouldBroadcastPushName('Hanno', undefined)).toBe(true)
		expect(shouldBroadcastPushName('Hanno', 'Old')).toBe(true)
	})

	it('the encoder drops an undefined name attribute entirely, producing a bare presence node', () => {
		// This is why the guard matters: WABinary/encode.ts filters attrs with
		// `typeof attrs[k] !== 'undefined' && attrs[k] !== null` before writing
		// them, so a presence node with only `name: undefined` encodes with
		// zero attributes at all -- a bare <presence/>, which receivers read
		// as 'available'. (The original brief asserted this by substring-
		// searching the encoded buffer for the literal text "type" /
		// "unavailable", but neither string is ever written for this node
		// regardless of whether the attribute is stripped, so that assertion
		// passed vacuously. Asserting on the actual attribute-filtering
		// behaviour below is the meaningful version of the same check.)
		const attrs: Record<string, string | undefined> = { name: undefined }
		const validAttributes = Object.keys(attrs).filter(k => typeof attrs[k] !== 'undefined' && attrs[k] !== null)
		expect(validAttributes).toEqual([])

		const encodedWithUndefinedName = encodeBinaryNode({
			tag: 'presence',
			attrs: attrs as Record<string, string>
		})
		const encodedWithRealName = encodeBinaryNode({ tag: 'presence', attrs: { name: 'Hanno' } })
		// The undefined-name node is shorter because the encoder wrote no
		// attributes at all, confirming the "bare <presence/>" behaviour.
		expect(encodedWithUndefinedName.length).toBeLessThan(encodedWithRealName.length)
	})
})
