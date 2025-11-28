/**
 * ファイル名から期待される検出数をパースする
 * 
 * ファイル名の規則:
 * - faces_x.png → x人
 * - faces_x-y.png → x〜y人（範囲）
 * - faces_xover.png → x人以上
 * - faces_x_hoge.png → x人（hogeは条件やバリエーション）
 */
export interface ExpectedCount {
    min: number
    max: number | null // nullの場合は上限なし
}

export function parseExpectedCount(filename: string): ExpectedCount | null {
    // faces_ で始まり、.png で終わるファイル名を想定
    const match = filename.match(/^faces_([^.]+)\.png$/)
    if (!match) {
        return null
    }

    const countPart = match[1]

    // faces_x-y.png の形式（範囲）
    const rangeMatch = countPart.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
        return {
            min: parseInt(rangeMatch[1], 10),
            max: parseInt(rangeMatch[2], 10),
        }
    }

    // faces_xover.png の形式（x以上）
    const overMatch = countPart.match(/^(\d+)over$/)
    if (overMatch) {
        return {
            min: parseInt(overMatch[1], 10),
            max: null, // 上限なし
        }
    }

    // faces_x_hoge.png の形式（x人、hogeは条件）
    const singleMatch = countPart.match(/^(\d+)(?:_|$)/)
    if (singleMatch) {
        const count = parseInt(singleMatch[1], 10)
        return {
            min: count,
            max: count,
        }
    }

    return null
}

/**
 * 検出数が期待範囲内かどうかをチェック
 */
export function isCountInRange(actualCount: number, expected: ExpectedCount): boolean {
    if (actualCount < expected.min) {
        return false
    }
    if (expected.max !== null && actualCount > expected.max) {
        return false
    }
    return true
}

