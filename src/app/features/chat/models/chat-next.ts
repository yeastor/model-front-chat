import {ChatAnswerKey, ChatNextAnswerDto, ChatNextQuestionDto} from './chat.model';

const answerKeys: ChatAnswerKey[] = ['yes', 'no'];

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const readText = (value: unknown): string | null => {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const normalizeChatNextQuestion = (value: unknown): ChatNextQuestionDto | null => {
    if (!isRecord(value) || value['type'] !== 'chips_yes_no') {
        return null;
    }

    const id = readText(value['id']);
    const question = readText(value['question']);
    const rawAnswers = value['answers'];
    if (!id || !question || !Array.isArray(rawAnswers) || rawAnswers.length !== answerKeys.length) {
        return null;
    }

    const answers = new Map<ChatAnswerKey, ChatNextAnswerDto>();
    for (const rawAnswer of rawAnswers) {
        if (!isRecord(rawAnswer)) {
            return null;
        }

        const key = rawAnswer['key'];
        const label = readText(rawAnswer['label']);
        if (!answerKeys.includes(key as ChatAnswerKey) || !label || answers.has(key as ChatAnswerKey)) {
            return null;
        }

        answers.set(key as ChatAnswerKey, {key: key as ChatAnswerKey, label});
    }

    if (answers.size !== answerKeys.length) {
        return null;
    }

    return {
        id,
        question,
        type: 'chips_yes_no',
        answers: answerKeys.map((key) => answers.get(key) as ChatNextAnswerDto)
    };
};
