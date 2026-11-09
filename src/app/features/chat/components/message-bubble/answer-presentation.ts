import type { AnswerIconName } from '../answer-icon/answer-icon.component';

export type AnswerSectionKind = 'question' | 'now' | 'steps' | 'dont' | 'say' | 'documents' | 'contacts' | 'laws';
export interface AnswerItem { html: string; href?: string; }
export interface AnswerSection {
    kind: AnswerSectionKind;
    title: string;
    icon: AnswerIconName;
    itemIcon: AnswerIconName;
    items: AnswerItem[];
}

const sections: Record<AnswerSectionKind, { title: string; icon: AnswerIconName; itemIcon: AnswerIconName }> = {
    question: { title: 'Уточнение', icon: 'question', itemIcon: 'question' },
    now: { title: 'Сейчас', icon: 'priority_high', itemIcon: 'chevron_forward' },
    steps: { title: 'Шаги', icon: 'list_alt_check', itemIcon: 'chevron_forward' },
    dont: { title: 'Нельзя', icon: 'do_not_disturb_on', itemIcon: 'cancel' },
    say: { title: 'Что говорить', icon: 'chat_bubble', itemIcon: 'chevron_forward' },
    documents: { title: 'Документы', icon: 'folder_filled', itemIcon: 'chevron_forward' },
    contacts: { title: 'Куда обратиться?', icon: 'where-to-call', itemIcon: 'chevron_forward' },
    laws: { title: 'Законы', icon: 'laws', itemIcon: 'link' },
};

/** Presentation of the adapter's existing paragraph format, without changing saved answers.
 * Input is ChatService.formatContent output; Angular still sanitizes every HTML binding.
 * Unknown prose and single line breaks are preserved, including paragraphs after known sections.
 */
export function presentAnswer(content: string): AnswerSection[] {
    const paragraphs = content.split(/(?:<br\s*\/?\s*>\s*){2,}/i).map(value => value.trim()).filter(Boolean);
    const classified = paragraphs.map(paragraph => {
        let kind: AnswerSectionKind = 'now';
        let html = paragraph;
        let href: string | undefined;
        if (/^Вопрос:\s*/.test(paragraph)) { kind = 'question'; html = paragraph.replace(/^Вопрос:\s*/, ''); }
        else if (/^•\s/.test(paragraph)) { kind = 'steps'; html = paragraph.replace(/^•\s/, ''); }
        else if (/^Не следует:\s*/.test(paragraph)) { kind = 'dont'; html = paragraph.replace(/^Не следует:\s*/, ''); }
        else if (/^Можно сказать:\s*/.test(paragraph)) { kind = 'say'; html = paragraph.replace(/^Можно сказать:\s*/, ''); }
        else if (/^<a\b[^>]*href=["']\/documents\//i.test(paragraph)) kind = 'documents';
        else if (/^<a\b[^>]*href=["']\/laws\//i.test(paragraph)) kind = 'laws';
        // Reserved for a future explicit contact paragraph; no inferred contact is added.
        else if (/^Куда обратиться:\s*/.test(paragraph)) { kind = 'contacts'; html = paragraph.replace(/^Куда обратиться:\s*/, ''); }

        // A row with one destination is one real anchor, including its explanation.
        // Multiple independent links keep their inline anchors rather than nesting anchors.
        const link = html.match(/^([\s\S]*?)<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>([\s\S]*)$/i);
        if (link && !/<a\b/i.test(link[1] + link[3] + link[4])
            && /^(?:\/(?!\/)|https?:\/\/|tel:)/i.test(link[2])) {
            href = link[2].replace(/&amp;/g, '&');
            html = link[1] + '<span class="answer-link-label">' + link[3] + '</span>' + link[4];
        }
        return { kind, item: { html, ...(href ? { href } : {}) } };
    });
    // Plain clarification and fallback messages keep their ordinary presentation.
    if (!classified.some(value => value.kind !== 'now')) return [];
    const result: AnswerSection[] = [];
    for (const { kind, item } of classified) {
        const previous = result.at(-1);
        if (previous?.kind === kind) previous.items.push(item);
        else result.push({ kind, ...sections[kind], items: [item] });
    }
    return result;
}
