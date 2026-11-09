import assert from 'node:assert/strict';
import test from 'node:test';
import {guidedLaunch, resumedGuidedMessages, savedGuidedText} from './guided-launch.ts';

const articleParams = () => new URLSearchParams({
    chat_id: 'article-chat',
    guided_entry: 'article',
    article_slug: 'article-topic',
    variant_id: 'specific_variant_v01',
    category_id: 'untrusted-category',
    stage_id: 'untrusted-stage',
});

test('pilot article sends only the exact variant; server resolves topic without assumed facts', () => {
    assert.deepEqual(guidedLaunch(articleParams(), 'article-chat', 0), {variantId: 'specific_variant_v01'});
});

test('variant entry works without category or stage metadata', () => {
    const params = articleParams();
    params.delete('category_id');
    params.delete('stage_id');
    assert.deepEqual(guidedLaunch(params, 'article-chat', 0), {variantId: 'specific_variant_v01'});
});

test('restored explicit state wins over article URL even before first message is persisted', () => {
    const stored = {
        entryVariantId: 'original_variant',
        categoryId: 'verified-category',
        stageId: 'verified-stage',
        context: {confirmed: false, unknown: null},
    };
    const launch = guidedLaunch(articleParams(), 'article-chat', 0, stored);
    assert.deepEqual(launch, {guided: stored});
    assert.equal(launch.guided, stored);
});

test('saved history restores the server session without reusing the article entry', () => {
    assert.deepEqual(guidedLaunch(articleParams(), 'article-chat', 4), {});
});

test('existing chats can restore their own guided state without consuming article URL', () => {
    const stored = {categoryId: 'another-topic', context: {confirmed: true}};
    assert.deepEqual(guidedLaunch(articleParams(), 'existing-chat', 4, stored), {guided: stored});
});

test('switching to another empty chat does not reuse article or stage seed', () => {
    assert.equal(guidedLaunch(articleParams(), 'different-chat', 0), undefined);
});

test('nonpilot article keeps its existing stage entry with no confirmed facts', () => {
    const params = articleParams();
    params.delete('guided_entry');
    assert.deepEqual(guidedLaunch(params, 'article-chat', 0), {
        guided: {categoryId: 'untrusted-category', stageId: 'untrusted-stage', context: {}},
    });
});

test('pilot flag without an article does not enable the exact variant entry', () => {
    const params = articleParams();
    params.delete('article_slug');
    assert.equal(guidedLaunch(params, 'article-chat', 0).variantId, undefined);
});

test('unknown variant reaches server for recoverable entry_unavailable choices', () => {
    const params = articleParams();
    params.set('variant_id', 'unknown_variant');
    assert.deepEqual(guidedLaunch(params, 'article-chat', 0), {variantId: 'unknown_variant'});
    assert.deepEqual(guidedLaunch(params, 'article-chat', 0, {context: {}}), {guided: {context: {}}});
});

test('saved question marker is removed from rendering without changing the question', () => {
    assert.equal(savedGuidedText('Есть документ?\n[Уточнение; выберите ответ в чате]'), 'Есть документ?');
    assert.equal(savedGuidedText('Обычный ответ'), 'Обычный ответ');
});

test('reload restores current controls without repeating saved question or final answer', () => {
    for (const content of ['Есть документ?', 'Подходящий ответ с нормой права']) {
        const history = [{id: 'saved', sender: 'ai', content}];
        const controls = {id: 'controls', sender: 'ai', content: 'Выберите ответ', views: [{value: 'Неизвестно'}]};
        const response = [{id: 'fresh', sender: 'ai', content}, controls];
        assert.deepEqual(resumedGuidedMessages(history, response), [controls]);
        assert.equal(history.length, 1);
    }
});

test('a new or unmatched resumed prompt remains visible', () => {
    const response = [{id: 'fresh', sender: 'ai', content: 'Новый вопрос?'}];
    assert.deepEqual(resumedGuidedMessages([], response), response);
    assert.deepEqual(resumedGuidedMessages([{sender: 'ai', content: 'Другой вопрос?'}], response), response);
    assert.deepEqual(resumedGuidedMessages([{sender: 'user', content: 'Новый вопрос?'}], response), response);
});
