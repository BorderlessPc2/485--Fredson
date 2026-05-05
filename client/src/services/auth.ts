import {
  createUserWithEmailAndPassword,
  type AuthError,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'E-mail já cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/invalid-credential': 'Credenciais inválidas.',
  'auth/user-not-found': 'Credenciais inválidas.',
  'auth/wrong-password': 'Credenciais inválidas.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'Erro inesperado. Tente novamente.';
  }

  const code = (error as AuthError).code;
  if (code && AUTH_ERRORS[code]) {
    return AUTH_ERRORS[code];
  }

  return 'Erro inesperado. Tente novamente.';
}

async function upsertUserProfile(user: AuthUser): Promise<void> {
  await setDoc(
    doc(db, 'users', user.id),
    {
      name: user.name,
      email: user.email,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function resolveCurrentUser(): Promise<AuthUser> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuário não autenticado.');
  }

  const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
  const profile = profileDoc.data();

  return {
    id: currentUser.uid,
    name: (profile?.name as string | undefined) ?? currentUser.displayName ?? 'Usuário',
    email: currentUser.email ?? '',
  };
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  await signInWithEmailAndPassword(auth, payload.email, payload.password);
  const user = await resolveCurrentUser();
  await upsertUserProfile(user);
  return { user };
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const credential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  await updateProfile(credential.user, { displayName: payload.name });
  const user: AuthUser = {
    id: credential.user.uid,
    name: payload.name,
    email: payload.email,
  };
  await upsertUserProfile(user);
  return { user };
}

export async function getMe(): Promise<AuthUser> {
  return resolveCurrentUser();
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  await sendPasswordResetEmail(auth, payload.email);
  return { message: 'Se o e-mail existir em nossa base, enviaremos as instruções de recuperação.' };
}

export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}
