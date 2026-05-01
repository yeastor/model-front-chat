import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {
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
}
