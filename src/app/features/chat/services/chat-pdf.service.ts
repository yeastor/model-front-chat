import { Injectable } from '@angular/core';

export interface ChatExport {
    chat: { id: string; name: string };
    message: { text: string; direction: number }[];
}

@Injectable({ providedIn: 'root' })
export class ChatPdfService {
    async create(data: ChatExport): Promise<File> {
        // Local lazy dependencies: no chat text is sent to an external converter.
        const [{ PDFDocument, rgb }, fontkit] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')]);
        const fontResponse = await fetch(new URL('assets/fonts/Manrope-VariableFont_wght.ttf', document.baseURI));
        if (!fontResponse.ok) throw new Error('Не удалось загрузить шрифт PDF.');
        const pdf = await PDFDocument.create();
        pdf.registerFontkit(fontkit.default);
        const font = await pdf.embedFont(await fontResponse.arrayBuffer(), { subset: true });
        pdf.setTitle('Диалог АЙзащита');
        pdf.setCreator('АЙзащита');
        const supported = new Set(font.getCharacterSet());
        let substituted = false;
        const clean = (text: string) => Array.from(text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    '))
            .map((char) => {
                if (char === '\n' || supported.has(char.codePointAt(0)!)) return char;
                substituted = true;
                return '?';
            }).join('');
        const wrap = (text: string, size: number): string[] => {
            const lines: string[] = [];
            for (const paragraph of clean(text).split('\n')) {
                let line = '';
                for (const word of paragraph.split(/\s+/u)) {
                    const candidate = line ? `${line} ${word}` : word;
                    if (font.widthOfTextAtSize(candidate, size) <= 499) { line = candidate; continue; }
                    if (line) { lines.push(line); line = ''; }
                    for (const char of Array.from(word)) {
                        if (line && font.widthOfTextAtSize(line + char, size) > 499) { lines.push(line); line = ''; }
                        line += char;
                    }
                }
                lines.push(line);
            }
            return lines;
        };
        const navy = rgb(11 / 255, 31 / 255, 59 / 255);
        const muted = rgb(100 / 255, 116 / 255, 139 / 255);
        let page = pdf.addPage([595, 842]);
        let y = 766;
        const header = () => page.drawText('АЙзащита | Диалог', { x: 48, y: 795, font, size: 11, color: navy });
        header();
        const write = (text: string, size = 11, color = navy, leading = 18) => {
            for (const line of wrap(text, size)) {
                if (y < 62) { page = pdf.addPage([595, 842]); y = 766; header(); }
                if (line) page.drawText(line, { x: 48, y, size, font, color });
                y -= leading;
            }
        };
        write(data.chat.name === 'New chat' ? 'Новый чат' : data.chat.name, 17, navy, 24);
        write(`Сохранено: ${new Date().toLocaleString('ru-RU')}`, 9, muted, 16);
        y -= 14;
        for (const message of data.message) {
            if (y < 108) { page = pdf.addPage([595, 842]); y = 766; header(); }
            write(message.direction === 1 ? 'Ваш вопрос' : 'Ответ помощника', 10, muted, 18);
            write(message.direction === 1 ? message.text : this.plainAnswer(message.text));
            y -= 14;
        }
        write('Ответы помощника могут содержать неточности. Проверяйте важную информацию.', 9, muted, 15);
        if (substituted) write('Символы, отсутствующие в шрифте, заменены знаком ?.', 9, muted, 15);
        const pages = pdf.getPages();
        pages.forEach((item, index) => item.drawText(`${index + 1} / ${pages.length}`, { x: 510, y: 32, size: 9, font, color: muted }));
        const bytes = await pdf.save();
        // Neutral filename and metadata: no personal data or private chat URL.
        return new File([new Uint8Array(bytes)], 'aizaschita-chat.pdf', { type: 'application/pdf' });
    }

    private plainAnswer(text: string): string {
        const withoutTags = text.replace(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '$2 ($1)')
            .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, '');
        const decoder = document.createElement('textarea');
        decoder.innerHTML = withoutTags;
        return decoder.value;
    }

    download(file: File): void {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
}
