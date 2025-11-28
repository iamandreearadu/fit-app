import { inject, Injectable } from "@angular/core";
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc, addDoc, collection, serverTimestamp, getDocs, query, orderBy, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { AlertService } from "../../shared/services/alert.service";
import { Auth } from '@angular/fire/auth';
import { BlogPost } from "../models/blog.model";

@Injectable({
    providedIn: 'root'
})

export class BlogService {
private firestore = inject(Firestore);
private alerts = inject(AlertService);
private auth = inject<Auth>(Auth);

    async getPost(id: string): Promise<BlogPost | null> {
        if (!id) return null;
        try {
            const ref = doc(this.firestore as any, `blog/${id}`);
            const snap = await getDoc(ref as any);
            if (!snap.exists()) return null;
            const d = snap.data() as any;
            // map Firestore document to BlogPost
            const post: BlogPost = {
                id: Number(d.id ?? Date.now()),
                title: d.title ?? '',
                caption: d.caption ?? '',
                description: d.description ?? '',
                image: d.image ?? '',
                category: d.category ?? '',
                date: d.date ?? ''
            };
            return post;
        } catch (err) {
            console.error('BlogService.getPost error', err);
            this.alerts?.warn('Failed to load blog post', (err as any)?.message ?? String(err));
            return null;
        }
    }


    async listPosts(): Promise<BlogPost[]> {
        try {
            const coll = collection(this.firestore as any, 'blog');
            const q = query(coll as any, orderBy('createdAt', 'desc')) as any;
            const snaps = await getDocs(q as any);
            const posts: BlogPost[] = [];
            snaps.forEach((s: any) => {
                const d = s.data();
                posts.push({
                    id: Number(d.id ?? Date.now()),
                    title: d.title ?? '',
                    caption: d.caption ?? '',
                    description: d.description ?? '',
                    image: d.image ?? '',
                    category: d.category ?? '',
                    date: d.date ?? ''
                });
            });
            return posts;
        } catch (err) {
            console.error('BlogService.listPosts error', err);
            this.alerts?.warn('Failed to load posts', (err as any)?.message ?? String(err));
            return [];
        }
    }

    async updatePost(docId: string, payload: Partial<BlogPost>): Promise<BlogPost | null> {
        try {
            if (!docId) return null;
            const ref = doc(this.firestore as any, `blog/${docId}`) as any;
            await updateDoc(ref, {
                ...payload,
                updatedAt: serverTimestamp()
            } as any);
            const snap = await getDoc(ref as any);
            if (!snap.exists()) return null;
            const d = snap.data() as any;
            const post: BlogPost = {
                id: Number(d.id ?? Date.now()),
                title: d.title ?? '',
                caption: d.caption ?? '',
                description: d.description ?? '',
                image: d.image ?? '',
                category: d.category ?? '',
                date: d.date ?? ''
            };
            return post;
        } catch (err) {
            console.error('BlogService.updatePost error', err);
            this.alerts?.warn('Failed to update post', (err as any)?.message ?? String(err));
            return null;
        }
    }

    async updatePostByNumericId(id: number, payload: Partial<BlogPost>): Promise<BlogPost | null> {
        try {
            const coll = collection(this.firestore as any, 'blog');
            const q = query(coll as any, where('id', '==', id)) as any;
            const snaps = await getDocs(q as any);
            if (snaps.empty) return null;
            // update first matching document
            const s = snaps.docs[0];
            const ref = s.ref as any;
            await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() } as any);
            const snap = await getDoc(ref as any);
            if (!snap.exists()) return null;
            const d = snap.data() as any;
            const post: BlogPost = {
                id: Number(d.id ?? Date.now()),
                title: d.title ?? '',
                caption: d.caption ?? '',
                description: d.description ?? '',
                image: d.image ?? '',
                category: d.category ?? '',
                date: d.date ?? ''
            };
            return post;
        } catch (err) {
            console.error('BlogService.updatePostByNumericId error', err);
            this.alerts?.warn('Failed to update post', (err as any)?.message ?? String(err));
            return null;
        }
    }


    async addPost(payload: Partial<BlogPost>): Promise<BlogPost | null> {
        try {
            // quick auth check: many projects require authenticated users to write to Firestore
            const user = this.auth.currentUser as any;
            if (!user) {
                this.alerts?.warn('You must be signed in to add a blog post');
                return null;
            }

            const coll = collection(this.firestore as any, 'blog');
            // ensure we have an id (use timestamp if not provided)
            const data = {
                ...payload,
                id: payload.id ?? Date.now(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            } as any;

            const ref = await addDoc(coll as any, data);
            const snap = await getDoc(ref as any);
            if (!snap.exists()) return null;
            const d = snap.data() as any;
            const post: BlogPost = {
                id: Number(d.id ?? Date.now()),
                title: d.title ?? '',
                caption: d.caption ?? '',
                description: d.description ?? '',
                image: d.image ?? '',
                category: d.category ?? '',
                date: d.date ?? ''
            };
            return post;
        } catch (err) {
            console.error('BlogService.addPost error', err);
            const code = (err as any)?.code ?? '';
            this.alerts?.warn(`Failed to add blog post${code ? ` (${code})` : ''}`, (err as any)?.message ?? String(err));
            return null;
        }
    }

   async deletePost(id: number): Promise<boolean>{
    try{
        if(!id) return false;
        const ref = doc(this.firestore as any, `blog/${id}`) as any;
        await deleteDoc(ref);
        this.alerts?.success('Blog post deleted');
        return true;
    } catch(err){
        console.error('BlogService.deletePost error', err);
        this.alerts?.warn('Failed to delete blog post', (err as any)?.message ?? String(err));
        return false;
    }    }
}