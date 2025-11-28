import { describe, it, expect } from 'bun:test'
import { parseExpectedCount, isCountInRange } from './parseExpectedCount'

describe('parseExpectedCount', () => {
    it('単一の数値をパースできる', () => {
        const result = parseExpectedCount('faces_1.png')
        expect(result).toEqual({ min: 1, max: 1 })
    })

    it('範囲をパースできる', () => {
        const result = parseExpectedCount('faces_1-3.png')
        expect(result).toEqual({ min: 1, max: 3 })
    })

    it('over形式をパースできる', () => {
        const result = parseExpectedCount('faces_10over.png')
        expect(result).toEqual({ min: 10, max: null })
    })

    it('条件付きファイル名をパースできる', () => {
        const result = parseExpectedCount('faces_1_mt.png')
        expect(result).toEqual({ min: 1, max: 1 })
    })

    it('無効なファイル名はnullを返す', () => {
        expect(parseExpectedCount('invalid.png')).toBeNull()
        expect(parseExpectedCount('faces.png')).toBeNull()
        expect(parseExpectedCount('faces_abc.png')).toBeNull()
    })
})

describe('isCountInRange', () => {
    it('単一値の範囲内かチェックできる', () => {
        expect(isCountInRange(1, { min: 1, max: 1 })).toBe(true)
        expect(isCountInRange(2, { min: 1, max: 1 })).toBe(false)
    })

    it('範囲内かチェックできる', () => {
        expect(isCountInRange(2, { min: 1, max: 3 })).toBe(true)
        expect(isCountInRange(1, { min: 1, max: 3 })).toBe(true)
        expect(isCountInRange(3, { min: 1, max: 3 })).toBe(true)
        expect(isCountInRange(0, { min: 1, max: 3 })).toBe(false)
        expect(isCountInRange(4, { min: 1, max: 3 })).toBe(false)
    })

    it('上限なしの範囲内かチェックできる', () => {
        expect(isCountInRange(10, { min: 10, max: null })).toBe(true)
        expect(isCountInRange(20, { min: 10, max: null })).toBe(true)
        expect(isCountInRange(9, { min: 10, max: null })).toBe(false)
    })
})

