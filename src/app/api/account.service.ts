import { inject, Injectable } from '@angular/core';
import { AuthCredentials } from '../core/models/auth-credentials.model';
import { AuthenticationUser } from '../core/models/authentication-user.model';
import { AlertService } from '../shared/services/alert.service';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private firebaseAuth = inject(Auth);
  private alerts = inject(AlertService);

  constructor() {}

  public async getIdToken(): Promise<string | null> {
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

  public async login(creds: AuthCredentials): Promise<AuthenticationUser | null> {
    try {
      const credential = await signInWithEmailAndPassword(
        this.firebaseAuth,
        creds.email,
        creds.password
      );

      const fbUser = credential.user;
      const idToken = await fbUser.getIdToken();

      const user: AuthenticationUser = {
        id: fbUser.uid,
        email: fbUser.email ?? creds.email,
        token: idToken ?? undefined
      };

      this.alerts.success('You have been logged in successfully', 'Welcome');
      return user;

    } catch (error: any) {
      const code = error?.code ?? '';

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        this.alerts.warn('Incorrect email or password', 'Login failed');
      } else if (code === 'auth/network-request-failed') {
        this.alerts.warn('Connection failed', 'Error');
      } else {
        this.alerts.warn('User couldn\'t be logged in', 'Error');
      }

      return null;
    }
  }


  public async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser | null> {
    try {
      const credential = await createUserWithEmailAndPassword(
        this.firebaseAuth,
        creds.email,
        creds.password
      );
      const fbUser = credential.user;

      // set displayName if provided (non-blocking)
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

      this.alerts.success('Account created and logged in', 'Welcome');
      return user;

    } catch (err: any) {
      const code = err?.code ?? '';

      if (code === 'auth/email-already-in-use') {
        this.alerts.warn('Email address is already used', 'Error');
      } else {
        this.alerts.warn('Could not reach remote register service', 'Error');
      }

      return null;
    }
  }


  public async logout(): Promise<void> {
    try {
      await signOut(this.firebaseAuth);
      this.alerts.info('You have been logged out');
    } catch (err) {
      console.error('Logout failed', err);
      this.alerts.warn('Logout failed. Please try again.', 'Error');
    }
  }
}
