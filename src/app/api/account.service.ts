import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from '../shared/services/local-storage.service';
import { environment } from '../../environments/environment';
import { AuthCredentials } from '../core/models/auth-credentials.model';
import { AuthenticationUser } from '../core/models/authentication-user.model';
import { AlertService } from '../shared/services/alert.service';
import { Router } from '@angular/router';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from '@angular/fire/auth';
import { UserService } from './user.service';
import { UserProfile } from '../core/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private readonly authKey = environment.authKey;

  private firebaseAuth = inject(Auth);
  private ls = inject(LocalStorageService); 
  private router = inject(Router);
  private alerts = inject(AlertService);
  private userService = inject(UserService);

  constructor() {}

 

   // fetch a fresh ID token
  async getIdToken(): Promise<string | null> {
    const user = this.firebaseAuth.currentUser;
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      return token;
    } catch (err) {
      console.error('Failed to get ID token', err);
      return null;
    }
  }



  async login(creds: AuthCredentials): Promise<AuthenticationUser | null> {
    try {
      const credential = await signInWithEmailAndPassword(this.firebaseAuth, creds.email, creds.password);
      const fbUser = credential.user;

      const idToken = await fbUser.getIdToken();

      const user: AuthenticationUser = {
        id: fbUser.uid,
        email: fbUser.email ?? creds.email,
        token: idToken ?? undefined
      };
      
      this.ls.set(this.authKey, user);

      this.alerts.success('You have been logged in successfully', 'Welcome');
      this.router.navigate(['/']);

      return user;
    } catch(error:any) {
      const code = error?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        this.alerts.warn('Incorrect Email or Passwrod', 'Login Failed');
      } else if (code === 'auth/network-request-failed') {
        this.alerts.warn('Connection Faied', 'Error');
      } else {
        this.alerts.warn('User couldn\'t be logged in', 'Error');
      }
      return null;
    }
  }


    async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser | null> {
    try {
      const credential = await createUserWithEmailAndPassword(this.firebaseAuth, creds.email, creds.password);
      const fbUser = credential.user;

      // set displayName if provided
      if (creds.fullName) {
        try {
          await updateProfile(fbUser, { displayName: creds.fullName });
        } catch (e) {
          console.warn('Failed to set displayName', e);
        }
      }

      const idToken = await fbUser.getIdToken();

      const user: AuthenticationUser = {
        id: fbUser.uid,
        email: fbUser.email ?? creds.email,
        fullName: creds.fullName,
        token: idToken ?? undefined
      };

      this.ls.set(this.authKey, user);
      this.alerts.success('Account created and logged in', 'Welcome');
      this.router.navigate(['/']);

      return user;
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        this.alerts.warn('Email address is already used', 'Error');
      } else {
        this.alerts.warn('Could not reach remote register service, created local account', 'Error');
      }
      return null;
    }
  }
  


 async logout() {
  try{
    await signOut(this.firebaseAuth);
    this.ls.remove(this.authKey);
    this.alerts.info('You have been logged out');
    this.router.navigate(['/login']);
  } catch (err){
    console.error('Logout failed', err);
    this.alerts.warn('Logout failed. Please try again.', 'Error');
    this.ls.remove(this.authKey);
    this.router.navigate(['/login']);
  }
  }
}
