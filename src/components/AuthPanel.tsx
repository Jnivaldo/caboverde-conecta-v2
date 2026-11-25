import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const AUTH_REDIRECT_URL = "https://caboverde-conecta-v2-git-feat-legac-1b7fb4-jnivaldoliveira-3917.vercel.app";

interface AuthPanelProps {
  user: User | null;
  onSignedOut: () => void;
}

export default function AuthPanel({ user, onSignedOut }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(() => typeof window !== "undefined" && window.location.hash.includes("type=recovery"));
  const [newPassword, setNewPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        if (error) throw error;
        setFeedback(
          data.session
            ? "Conta criada e sessão iniciada."
            : "Conta criada. Verifique o seu email e confirme o endereço antes de iniciar sessão."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setFeedback("Sessão iniciada com sucesso.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
    } finally {
      setLoading(false);
    }
  }

  async function sendRecovery() {
    if (!email.trim()) {
      setFeedback("Indique primeiro o email da sua conta.");
      return;
    }
    setLoading(true);
    setFeedback("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: AUTH_REDIRECT_URL,
    });
    setLoading(false);
    setFeedback(error ? error.message : "Enviámos um link de recuperação para o seu email.");
  }

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setFeedback(error.message);
      return;
    }
    setRecoveryMode(false);
    setNewPassword("");
    setFeedback("Palavra-passe atualizada com sucesso.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  async function signOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      setFeedback(error.message);
      return;
    }
    setFeedback("Sessão terminada.");
    onSignedOut();
  }

  if (user && recoveryMode) {
    return (
      <div style={{ display: "grid", gap: "0.65rem" }}>
        <form onSubmit={updateRecoveredPassword} style={{ display: "grid", gap: "0.65rem" }}>
          <label style={labelStyle}>
            Nova palavra-passe
            <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" style={inputStyle} />
          </label>
          <button type="submit" disabled={loading} style={activeButtonStyle}>{loading ? "Aguarde..." : "Guardar nova palavra-passe"}</button>
        </form>
        {feedback && <p role="status" style={messageStyle}>{feedback}</p>}
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ display: "grid", gap: "0.65rem" }}>
        <div style={{ color: "#38D6A0", fontSize: "0.88rem", fontWeight: 700 }}>
          Sessão autenticada
        </div>
        <div style={{ color: "#F8FAFC", fontSize: "0.9rem" }}>{user.email}</div>
        <button type="button" onClick={signOut} disabled={loading} style={buttonStyle}>
          {loading ? "Aguarde..." : "Terminar sessão"}
        </button>
        {feedback && <p role="status" style={messageStyle}>{feedback}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => { setMode("signin"); setFeedback(""); }} style={mode === "signin" ? activeButtonStyle : buttonStyle}>
          Entrar
        </button>
        <button type="button" onClick={() => { setMode("signup"); setFeedback(""); }} style={mode === "signup" ? activeButtonStyle : buttonStyle}>
          Criar conta
        </button>
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.65rem" }}>
        <label style={labelStyle}>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Palavra-passe
          <input type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" style={inputStyle} />
        </label>
        <button type="submit" disabled={loading} style={activeButtonStyle}>
          {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar na minha conta"}
        </button>
        {mode === "signin" && (
          <button type="button" disabled={loading} onClick={sendRecovery} style={{ ...buttonStyle, textAlign: "left" }}>
            Esqueci a palavra-passe
          </button>
        )}
      </form>
      {feedback && <p role="status" style={messageStyle}>{feedback}</p>}
      <p style={{ margin: 0, color: "#B5C3D8", fontSize: "0.78rem", lineHeight: 1.45 }}>
        A confirmação do email é necessária para ativar uma conta nova. A palavra-passe é gerida pelo serviço seguro de autenticação.
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.64rem 0.82rem",
  borderRadius: 10,
  border: "1px solid rgba(181,195,216,0.2)",
  backgroundColor: "#151F33",
  color: "#F8FAFC",
  fontSize: "0.88rem",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  color: "#F8FAFC",
  fontSize: "0.84rem",
  fontWeight: 600,
};

const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderRadius: 10,
  border: "1px solid rgba(181,195,216,0.2)",
  backgroundColor: "#151F33",
  color: "#F8FAFC",
  cursor: "pointer",
  fontWeight: 600,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#2563EB",
  border: "1px solid rgba(96,165,250,0.65)",
};

const messageStyle: React.CSSProperties = {
  margin: 0,
  padding: "0.75rem",
  borderRadius: 10,
  backgroundColor: "#151F33",
  border: "1px solid rgba(56,214,160,0.45)",
  color: "#F8FAFC",
  fontSize: "0.84rem",
  lineHeight: 1.45,
};
