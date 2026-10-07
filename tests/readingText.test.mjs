import test from 'node:test';
import assert from 'node:assert/strict';
import { splitIntoSentences } from '../lib/readingText.mjs';

test('splits Korean advice into sentences', () => {
    assert.deepEqual(splitIntoSentences('카드의 상징을 살펴보세요. 잠시 쉬어보세요.'), ['카드의 상징을 살펴보세요.', '잠시 쉬어보세요.']);
});
test('keeps separate advice paragraphs when at least three are present', () => {
    assert.deepEqual(splitIntoSentences('조언 하나.\n\n조언 둘.\n조언 셋.'), ['조언 하나.', '조언 둘.', '조언 셋.']);
});
test('supports English, Chinese and Japanese advice punctuation', () => {
    assert.deepEqual(splitIntoSentences('Take a pause. Choose one action!'), ['Take a pause.', 'Choose one action!']);
    assert.deepEqual(splitIntoSentences('慢慢来。留意小事。'), ['慢慢来。', '留意小事。']);
    assert.deepEqual(splitIntoSentences('少し休みましょう。できることから始めましょう。'), ['少し休みましょう。', 'できることから始めましょう。']);
});
test('handles empty text and unfinished trailing advice', () => {
    assert.deepEqual(splitIntoSentences(''), []);
    assert.deepEqual(splitIntoSentences('   '), []);
    assert.deepEqual(splitIntoSentences('카드를 살펴보세요. 이어지는 조언'), ['카드를 살펴보세요.', '이어지는 조언']);
});
