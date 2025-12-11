import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc
} from '@angular/fire/firestore';

import { Auth } from '@angular/fire/auth';
import { ChatConversation, ChatMessage } from '../core/models/groq-ai.model';

@Injectable({ providedIn: 'root' })
export class GroqAiService {

  private fs = inject(Firestore);
  private auth = inject(Auth);

  private getUserId(): string {
    const user = this.auth.currentUser;
    if (!user) throw new Error("User not authenticated.");
    return user.uid;
  }

  /** Create a new conversation under the user */
  async createConversation(): Promise<string> {
    const uid = this.getUserId();

    const ref = collection(this.fs, `users/${uid}/conversations`);
    const docRef = await addDoc(ref, {
      createdAt: Date.now()
    });

    return docRef.id;
  }

  /** Add new message in the conversation */
  async saveMessage(conversationId: string, msg: ChatMessage): Promise<void> {
    const uid = this.getUserId();

    const msgRef = collection(this.fs, `users/${uid}/conversations/${conversationId}/messages`);
    await addDoc(msgRef, {
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    });
  }

  /** Load ALL conversations of the authenticated user */
  async loadUserConversations(): Promise<ChatConversation[]> {
    const uid = this.getUserId();

    const ref = collection(this.fs, `users/${uid}/conversations`);
    const q = query(ref, orderBy('createdAt', 'desc'));

    const snaps = await getDocs(q);

    return snaps.docs.map(d => ({
      id: d.id,
      createdAt: d.data()['createdAt'],
      messages: [],
      userId: uid
    }));
  }

  /** Load messages of a selected conversation */
  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    const uid = this.getUserId();

    const ref = collection(this.fs, `users/${uid}/conversations/${conversationId}/messages`);
    const q = query(ref, orderBy('timestamp', 'asc'));

    const snaps = await getDocs(q);

    return snaps.docs.map(d => ({
      id: d.id,
      role: d.data()['role'],
      content: d.data()['content'],
      timestamp: d.data()['timestamp']
    }));
  }

  async deleteConversation(id: string): Promise<void> {
    const uid = this.getUserId();
  if (!uid) return;

  const convRef = doc(this.fs, `users/${uid}/conversations/${id}`);
  const messagesRef = collection(convRef, 'messages');

  // delete all messages first
  const messagesSnap = await getDocs(messagesRef);
  messagesSnap.forEach(m => deleteDoc(m.ref));

  // delete conversation document
  await deleteDoc(convRef);
}

}
