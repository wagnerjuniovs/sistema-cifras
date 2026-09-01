import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Music2 } from "lucide-react";
import { auth, firebaseErrorMessage } from "../lib/firebase";

type AuthMode = "login" | "register" | "reset";

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title =
    mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage("Enviamos um e-mail com as instruções para redefinir sua senha.");
      }
    } catch (caught) {
      setError(firebaseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Music2 size={28} />
          </span>
          <div>
            <p className="eyebrow">Sistema de Cifras</p>
            <h1 id="auth-title">{title}</h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {mode !== "reset" ? (
            <label>
              <span>Senha</span>
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          ) : null}

          {error ? (
            <p className="form-message error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="form-message success" role="status">
              {message}
            </p>
          ) : null}

          <button className="primary-button wide" disabled={busy} type="submit">
            {busy ? "Aguarde..." : title}
          </button>
        </form>

        <div className="auth-switcher">
          {mode !== "login" ? (
            <button className="link-button" onClick={() => setMode("login")} type="button">
              Já tenho conta
            </button>
          ) : null}
          {mode !== "register" ? (
            <button className="link-button" onClick={() => setMode("register")} type="button">
              Criar conta
            </button>
          ) : null}
          {mode !== "reset" ? (
            <button className="link-button" onClick={() => setMode("reset")} type="button">
              Esqueci minha senha
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
