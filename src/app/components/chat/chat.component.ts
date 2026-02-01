import { Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { Message } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent {
  messages: Message[] = [];
  input = '';
  loading = false;

  constructor(private chat: ChatService) {}

  send() {
    if (!this.input.trim()) return;
    const text = this.input;
    this.messages.push({ role: 'user', content: text });
    this.input = '';
    this.loading = true;

    this.chat.sendMessage(text).subscribe(ans => this.type(ans));
  }

  type(text: string) {
    const msg: Message = { role: 'assistant', content: '' };
    this.messages.push(msg);
    let i = 0;
    const t = setInterval(() => {
      msg.content += text[i++];
      if (i >= text.length) {
        clearInterval(t);
        this.loading = false;
      }
    }, 15);
  }
}
