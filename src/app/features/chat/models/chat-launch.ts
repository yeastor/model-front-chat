import {ParamMap} from '@angular/router';

import {ChatContextValue, ChatLaunchParams} from './chat.model';

const maximumIdentifierLength = 160;
const maximumContextFields = 100;
const maximumContextLength = 16_384;
const contextFieldPattern = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

const readIdentifier = (paramMap: ParamMap, name: string): string | undefined => {
    const value = paramMap.get(name)?.trim();

    if (!value || value.length > maximumIdentifierLength) {
        return undefined;
    }

    return value;
};

const parseContext = (rawContext: string): Record<string, ChatContextValue> | undefined => {
    if (rawContext.length > maximumContextLength) {
        return undefined;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(rawContext);
    } catch {
        return undefined;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
    }

    const entries = Object.entries(parsed);
    if (entries.length === 0 || entries.length > maximumContextFields) {
        return undefined;
    }

    const context: Record<string, ChatContextValue> = {};
    for (const [fieldId, value] of entries) {
        if (!contextFieldPattern.test(fieldId) || fieldId.length > maximumIdentifierLength) {
            return undefined;
        }
        if (value !== null && typeof value !== 'boolean') {
            return undefined;
        }

        context[fieldId] = value;
    }

    return context;
};

export const readChatLaunchParams = (paramMap: ParamMap): ChatLaunchParams | undefined => {
    const categoryId = readIdentifier(paramMap, 'category_id');
    const stageId = readIdentifier(paramMap, 'stage_id');
    const variantId = readIdentifier(paramMap, 'variant_id');
    const contextContractId = readIdentifier(paramMap, 'context_contract_id');
    const rawContext = paramMap.get('context');
    const context = rawContext && contextContractId ? parseContext(rawContext) : undefined;

    const launch: ChatLaunchParams = {
        ...(categoryId ? {category_id: categoryId} : {}),
        ...(stageId ? {stage_id: stageId} : {}),
        ...(variantId ? {variant_id: variantId} : {}),
        ...(context ? {context, context_contract_id: contextContractId} : {})
    };

    return Object.keys(launch).length > 0 ? launch : undefined;
};
