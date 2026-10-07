const splitByPunctuation = (text) => {
    const sentences = [];
    const pattern = /[^.!?…。]+[.!?…。]+/g;
    let lastIndex = 0;
    let match = pattern.exec(text);

    while (match) {
        const sentence = match[0].trim();
        if (sentence) sentences.push(sentence);
        lastIndex = pattern.lastIndex;
        match = pattern.exec(text);
    }

    const remainder = text.slice(lastIndex).trim();
    if (remainder) sentences.push(remainder);

    return sentences;
};

const splitOrdinaryText = (text) => {
    if (!text?.trim()) return [];

    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    if (lines.length >= 3) {
        return lines;
    }

    return splitByPunctuation(text);
};

export const splitIntoSentences = splitOrdinaryText;
