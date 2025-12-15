import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  orderBy,
  deleteDoc
} from '@angular/fire/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


import { Auth } from '@angular/fire/auth';
import { ChatConversation, ChatMessage } from '../core/models/groq-ai.model';

@Injectable({ providedIn: 'root' })
export class GroqAiService {

  private fs = inject(Firestore);
  private auth = inject(Auth);
  private storage = getStorage();

  private getUserId(): string {
    const user = this.auth.currentUser;
    if (!user) throw new Error("User not authenticated.");
    return user.uid;
  }

  async createConversation(): Promise<string> {
    const uid = this.getUserId();

    const ref = collection(this.fs, `users/${uid}/conversations`);
    const docRef = await addDoc(ref, {
      createdAt: Date.now()
    });

    return docRef.id;
  }

  async saveMessage(conversationId: string, msg: ChatMessage): Promise<void> {
    const uid = this.getUserId();

    const msgRef = collection(this.fs, `users/${uid}/conversations/${conversationId}/messages`);

    await addDoc(msgRef, {
      role: msg.role,
      content: msg.content,
      imageUrl: msg.imageUrl ?? null, 
      timestamp: msg.timestamp
    });
  }

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

  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    const uid = this.getUserId();

    const ref = collection(this.fs, `users/${uid}/conversations/${conversationId}/messages`);
    const q = query(ref, orderBy('timestamp', 'asc'));

    const snaps = await getDocs(q);

    return snaps.docs.map(d => ({
      id: d.id,
      role: d.data()['role'],
      content: d.data()['content'],
      imageUrl: d.data()['imageUrl'] || undefined,
      timestamp: d.data()['timestamp']
    }));
  }

  async uploadChatImage(
  file: File,
  conversationId: string
): Promise<string> {

  const uid = this.getUserId();
  const path = `chat-images/${uid}/${conversationId}/${Date.now()}-${file.name}`;

  const storageRef = ref(this.storage, path);

  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}


  async deleteConversation(id: string): Promise<void> {
    const uid = this.getUserId();
    if (!uid) return;

    const convRef = doc(this.fs, `users/${uid}/conversations/${id}`);
    const messagesRef = collection(convRef, 'messages');

    const messagesSnap = await getDocs(messagesRef);
    messagesSnap.forEach(m => deleteDoc(m.ref));

    await deleteDoc(convRef);
  }

}
