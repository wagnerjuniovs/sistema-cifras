import { FirebaseError, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQxdgZfXUpczb6fW4ngRV9WebWWJLAEcM",
  authDomain: "cifras-a7ad7.firebaseapp.com",
  projectId: "cifras-a7ad7",
  storageBucket: "cifras-a7ad7.firebasestorage.app",
  messagingSenderId: "908747350896",
  appId: "1:908747350896:web:569cefb8d7f77200b525b5",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export function firebaseErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (rawMessage.includes("CONFIGURATION_NOT_FOUND")) {
    return "A configuração do Firebase Authentication não foi encontrada. Verifique se o projeto está ativo e se Email/Password foi habilitado.";
  }

  if (rawMessage.includes("SERVICE_DISABLED") || rawMessage.includes("firestore.googleapis.com")) {
    return "O Cloud Firestore ainda não está ativado neste projeto Firebase.";
  }

  const code = error instanceof FirebaseError ? error.code : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado.";
    case "auth/invalid-email":
      return "Digite um e-mail válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/user-not-found":
      return "Não existe uma conta com este e-mail.";
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Não foi possível conectar ao Firebase. Verifique sua internet.";
    case "auth/configuration-not-found":
      return "A configuração do Firebase Authentication não foi encontrada. Verifique se o projeto está ativo e se Email/Password foi habilitado.";
    case "auth/operation-not-allowed":
      return "O login por e-mail e senha ainda não está ativado no Firebase.";
    case "auth/requires-recent-login":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Você não tem permissão para acessar estes dados.";
    case "unavailable":
    case "firestore/unavailable":
      return "O Firebase está temporariamente indisponível. Tente novamente em instantes.";
    case "not-found":
    case "firestore/not-found":
      return "O item solicitado não foi encontrado.";
    default:
      return "Algo não saiu como esperado. Tente novamente.";
  }
}
