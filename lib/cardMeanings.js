import { CARD_HASHTAGS } from './cardHashtags';

/** 해시태그에 쓸 키워드 최대 글자 수 (공백 포함) */
export const MAX_KEYWORD_LENGTH = 8;

/**
 * 카드 id와 정·역방향에 맞는 해시태그 3개를 반환합니다.
 */
export const getCardMeaningHashtags = (card, maxCount = 3) => {
    if (!card || card.id == null) return [];

    const entry = CARD_HASHTAGS[card.id];
    if (!entry) return [];

    const tags = card.isReversed ? entry.rev : entry.up;
    return tags.slice(0, maxCount);
};
