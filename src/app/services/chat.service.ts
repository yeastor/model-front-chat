import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = '/model/chat';

  constructor(private http: HttpClient) {}

  sendMessage(text: string): Observable<string> {
    return this.http.post<any>(this.apiUrl, { q: text }).pipe(
      map(r => r.answer.content.replace(/\n/g, '<br />'))
    );
  }
}
