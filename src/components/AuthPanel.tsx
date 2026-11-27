import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

function getAuthRedirectUrl() {
  return window.location.origin;
}

interface AuthPanelProps {
  user: User | null;
  onSignedIn: (user: User) => void;
  onSignedOut: () => void;
}

export default function AuthPanel({ user, onSignedIn, onSignedOut }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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
          options: { emailRedirectTo: getAuthRedirectUrl() },
        });
        if (error) throw error;
        if (data.session?.user) onSignedIn(data.session.user);
        setFeedback(
          data.session
            ? "Conta criada e sessão iniciada."
            : "Conta criada. Verifique o seu email e confirme o endereço antes de iniciar sessão."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user) onSignedIn(data.user);
        setFeedback("Sessão iniciada com sucesso.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível concluir a autenticação.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setFeedback("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível iniciar a ligação ao Google.");
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
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUrl(),
      });
      if (error) throw error;
      setFeedback("Enviámos um link de recuperação para o seu email. Verifique também a pasta de spam.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível enviar o link de recuperação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function updateRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setRecoveryMode(false);
      setNewPassword("");
      setFeedback("Palavra-passe atualizada com sucesso.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar a palavra-passe. Solicite um novo link de recuperação.");
    } finally {
      setLoading(false);
    }
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
            <div style={passwordFieldStyle}><input type={showNewPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" style={passwordInputStyle} /><button type="button" aria-label={showNewPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((value) => !value)} style={eyeButtonStyle}>{showNewPassword ? "Ocultar" : "Mostrar"} <span aria-hidden="true">◉</span></button></div>
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
        <button type="button" onClick={signOut} disabled={loading} style={logoutButtonStyle}>
          {loading ? "Aguarde..." : "Sair da conta"}
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
      <button type="button" onClick={signInWithGoogle} disabled={loading} className="google-auth-button" style={googleButtonStyle}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="21" height="21" focusable="false">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"/>
          <path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7v-5.2H5.8a20 20 0 0 0 0 17.4l6.8-5.2Z"/>
          <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15.3l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"/>
        </svg>
        <span>{loading ? "A ligar ao Google..." : "Continuar com Google"}</span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", color: "#8FA2BD", fontSize: "0.75rem" }}><span style={{ height: 1, background: "rgba(181,195,216,.2)", flex: 1 }} />ou com email<span style={{ height: 1, background: "rgba(181,195,216,.2)", flex: 1 }} /></div>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.65rem" }}>
        <label style={labelStyle}>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Palavra-passe
          <div style={passwordFieldStyle}><input type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" style={passwordInputStyle} /><button type="button" aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} style={eyeButtonStyle}>{showPassword ? "Ocultar" : "Mostrar"} <span aria-hidden="true">◉</span></button></div>
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

const passwordFieldStyle: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center" };
const passwordInputStyle: React.CSSProperties = { ...inputStyle, paddingRight: "5.5rem" };
const eyeButtonStyle: React.CSSProperties = { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#93C5FD", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", padding: "0.3rem" };
const googleButtonStyle: React.CSSProperties = { padding: "0.78rem 1rem", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem", width: "100%", background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)", color: "#202124", border: "1px solid #DADCE0", minHeight: 50, cursor: "pointer", fontWeight: 650, fontSize: "0.92rem", letterSpacing: "0.005em", boxShadow: "0 2px 5px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)", transition: "background 160ms ease, box-shadow 160ms ease, transform 160ms ease" };

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

const logoutButtonStyle: React.CSSProperties = { ...buttonStyle, width: "100%", minHeight: 48, padding: "0.78rem 1rem", borderRadius: 11, border: "1px solid rgba(248,113,113,.72)", background: "linear-gradient(180deg,#991B1B 0%,#7F1D1D 100%)", color: "#FFFFFF", fontSize: "0.95rem", fontWeight: 850, letterSpacing: ".02em", boxShadow: "0 5px 16px rgba(127,29,29,.25)" };

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
