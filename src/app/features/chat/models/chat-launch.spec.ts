import {convertToParamMap} from '@angular/router';

import {readChatLaunchParams} from './chat-launch';

describe('readChatLaunchParams', () => {
    it('reads the initial target and nullable context from URL parameters', () => {
        const params = convertToParamMap({
            category_id: 'dps',
            stage_id: 'stop_reason',
            variant_id: 'dps_stop_reason_v83',
            context_contract_id: 'dps-context-v2',
            context: JSON.stringify({
                reason_explained: null,
                documents_requested: true,
                recording_blocked: false
            })
        });

        expect(readChatLaunchParams(params)).toEqual({
            category_id: 'dps',
            stage_id: 'stop_reason',
            variant_id: 'dps_stop_reason_v83',
            context_contract_id: 'dps-context-v2',
            context: {
                reason_explained: null,
                documents_requested: true,
                recording_blocked: false
            }
        });
    });

    it('fails closed when context is not paired with a contract id', () => {
        const params = convertToParamMap({
            category_id: 'dps',
            context: JSON.stringify({reason_explained: true})
        });

        expect(readChatLaunchParams(params)).toEqual({category_id: 'dps'});
    });

    it('rejects non-ternary context values without dropping valid launch ids', () => {
        const params = convertToParamMap({
            stage_id: 'stop_reason',
            context_contract_id: 'dps-context-v2',
            context: JSON.stringify({reason_explained: 'unknown'})
        });

        expect(readChatLaunchParams(params)).toEqual({stage_id: 'stop_reason'});
    });
});
