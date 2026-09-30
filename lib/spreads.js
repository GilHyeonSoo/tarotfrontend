export const SPREAD_TYPES = {
    ONE: 'one',
    THREE: 'three',
    CELTIC: 'celtic',
};

export const SPREAD_CARD_COUNTS = {
    [SPREAD_TYPES.ONE]: 1,
    [SPREAD_TYPES.THREE]: 3,
    [SPREAD_TYPES.CELTIC]: 10,
};

export const getSpreadCardCount = (spread) => SPREAD_CARD_COUNTS[spread] ?? 10;

export const getSummaryCardIndex = (spread) => getSpreadCardCount(spread);
