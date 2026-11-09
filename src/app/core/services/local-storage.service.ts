import {Injectable} from '@angular/core';
import {GuidedState} from '../../features/chat/models/chat.model';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {
    public getGuidedState(chatId: string): GuidedState | undefined {
        try {
            const state = JSON.parse(localStorage.getItem('guided:' + chatId) || 'null');
            if (!state || typeof state !== 'object' || !state.context || typeof state.context !== 'object') return undefined;
            return state as GuidedState;
        } catch { return undefined; }
    }

    public setGuidedState(chatId: string, state?: GuidedState): void {
        if (state) localStorage.setItem('guided:' + chatId, JSON.stringify(state));
        else localStorage.removeItem('guided:' + chatId);
    }
    private chatIdKey = 'chatId';
    private categoryIdKey = 'categoryId';

    public getChatId(): string | null {
        return localStorage.getItem(this.chatIdKey);
    }

    public setChatId(chatId: string): void {
        localStorage.setItem(this.chatIdKey, chatId);
    }

    public getCategoryId(): string | null {
        return localStorage.getItem(this.categoryIdKey);
    }

    public setCategoryId(categoryId: string): void {
        localStorage.setItem(this.categoryIdKey, categoryId);
    }

    public flushCategoryId(): void {
        localStorage.removeItem(this.categoryIdKey);
    }

    public replaceCategoryId(categoryId?: string | null): void {
        if (categoryId?.trim()) {
            this.setCategoryId(categoryId.trim());
        } else {
            this.flushCategoryId();
        }
    }
}
