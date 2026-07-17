import { describe, it, expect } from 'vitest'
import { sanitizeUndefined, getChangedFields } from '../../src/utils/data'

describe('sanitizeUndefined', () => {
  it('strips keys whose value is undefined', () => {
    const result = sanitizeUndefined({ a: 1, b: undefined, c: 'x' })
    expect(result).toEqual({ a: 1, c: 'x' })
    expect('b' in result).toBe(false)
  })

  it('keeps null, empty string, and 0 (only undefined is removed)', () => {
    const result = sanitizeUndefined({ a: null, b: '', c: 0, d: false })
    expect(result).toEqual({ a: null, b: '', c: 0, d: false })
  })

  it('returns an empty object unchanged', () => {
    expect(sanitizeUndefined({})).toEqual({})
  })
})

describe('getChangedFields', () => {
  it('returns only keys whose primitive value changed', () => {
    const changed = getChangedFields({ name: 'new', color: 'red' }, { name: 'old', color: 'red' })
    expect(changed).toEqual(['name'])
  })

  it('ignores updates whose value is undefined', () => {
    const changed = getChangedFields({ name: undefined, color: 'blue' }, { name: 'old', color: 'red' })
    expect(changed).toEqual(['color'])
  })

  it('detects array changes by length', () => {
    const changed = getChangedFields({ tags: ['a', 'b'] }, { tags: ['a'] })
    expect(changed).toEqual(['tags'])
  })

  it('detects array changes by element', () => {
    const changed = getChangedFields({ tags: ['a', 'b'] }, { tags: ['a', 'c'] })
    expect(changed).toEqual(['tags'])
  })

  it('treats identical arrays as unchanged', () => {
    const changed = getChangedFields({ tags: ['a', 'b'] }, { tags: ['a', 'b'] })
    expect(changed).toEqual([])
  })

  it('counts a deleteField() sentinel as a change only when an old value existed', () => {
    const deleteSentinel = { _methodName: 'deleteField' }
    expect(getChangedFields({ photoUrl: deleteSentinel }, { photoUrl: 'x' })).toEqual(['photoUrl'])
    expect(getChangedFields({ photoUrl: deleteSentinel }, {})).toEqual([])
    expect(getChangedFields({ photoUrl: deleteSentinel }, { photoUrl: null })).toEqual([])
  })

  it('returns an empty array when nothing changed', () => {
    expect(getChangedFields({ a: 1 }, { a: 1 })).toEqual([])
  })
})
