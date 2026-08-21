import {normalizeChatNextQuestion} from './chat-next';

describe('normalizeChatNextQuestion', () => {
    it('keeps only the public question id, answer keys, and labels', () => {
        const question = normalizeChatNextQuestion({
            id: 'q_dps_stop_reason_reason_explained',
            question: 'Причину остановки назвали?',
            type: 'chips_yes_no',
            field_id: 'reason_explained',
            answers: [
                {
                    key: 'yes',
                    label: 'Да',
                    set_context_value: true,
                    go_to_variant: 'dps_stop_reason_v99'
                },
                {
                    key: 'no',
                    label: 'Нет',
                    set_context_value: false,
                    go_to_variant: 'dps_stop_reason_v100'
                }
            ]
        });

        expect(question).toEqual({
            id: 'q_dps_stop_reason_reason_explained',
            question: 'Причину остановки назвали?',
            type: 'chips_yes_no',
            answers: [
                {key: 'yes', label: 'Да'},
                {key: 'no', label: 'Нет'}
            ]
        });
    });

    it('rejects a question without one unique yes and no answer', () => {
        expect(normalizeChatNextQuestion({
            id: 'q_invalid',
            question: 'Invalid?',
            type: 'chips_yes_no',
            answers: [
                {key: 'yes', label: 'Да'},
                {key: 'yes', label: 'Да ещё раз'}
            ]
        })).toBeNull();
    });
});
