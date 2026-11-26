import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type NotificationRow = {
  id: string;
  notification_type: "listing" | "procurement" | "offer" | "admin";
  title: string;
  message: string;
  target_path: string;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
};

type Props = {
  userId: string | null;
  onNavigate: (tab: "account" | "requests" | "admin") => void;
};

const palette: Record<NotificationRow["notification_type"], string> = {
  listing: "#60A5FA",
  procurement: "#38D6A0",
  offer: "#C084FC",
  admin: "#FBBF24",
};

const timeLabel = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function NotificationCenter({ userId, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listResult, countResult] = await Promise.all([
      supabase.from("user_notifications")
        .select("id, notification_type, title, message, target_path, entity_id, created_at, read_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_notifications")
        .select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    ]);
    if (currentUserId.current !== userId) return;
    if (listResult.error || countResult.error) {
      const error = listResult.error || countResult.error;
      setFeedback("Não foi possível carregar as notificações.");
      console.error("Falha ao carregar notificações:", error?.message);
    } else {
      setItems((listResult.data ?? []) as NotificationRow[]);
      setUnreadCount(countResult.count ?? 0);
      setFeedback("");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setItems([]);
    setUnreadCount(0);
    setFeedback("");
    void loadNotifications();
    if (!userId) return;
    const channel = supabase
      .channel("user-notifications-" + userId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_notifications",
        filter: "user_id=eq." + userId,
      }, () => { void loadNotifications(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, loadNotifications]);

  async function markRead(id: string) {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    const { error } = await supabase.from("user_notifications")
      .update({ read_at: now }).eq("id", id).eq("user_id", userId);
    if (error) {
      setFeedback("Não foi possível atualizar esta notificação.");
      await loadNotifications();
    }
  }

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }));
    setUnreadCount(0);
    const { error } = await supabase.from("user_notifications")
      .update({ read_at: now }).eq("user_id", userId).is("read_at", null);
    if (error) {
      setFeedback("Não foi possível marcar todas como lidas.");
      await loadNotifications();
    }
  }

  function openNotification(item: NotificationRow) {
    if (!item.read_at) void markRead(item.id);
    const match = item.target_path.match(/tab=(account|requests|admin)/);
    if (match) onNavigate(match[1] as "account" | "requests" | "admin");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) void loadNotifications(); }}
        aria-expanded={open}
        aria-label={userId ? "Notificações" : "Inicie sessão para consultar notificações"}
        title={userId ? "As suas notificações" : "Inicie sessão para consultar notificações"}
        style={{
          position: "relative", display: "inline-flex", alignItems: "center", gap: ".5rem",
          padding: ".55rem .78rem", borderRadius: 999, border: "1px solid rgba(96,165,250,.42)",
          background: "#15233A", color: "#EAF2FF", cursor: "pointer", fontWeight: 750, fontSize: ".8rem",
          whiteSpace: "nowrap",
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        Avisos
        {unreadCount > 0 && <span style={{ minWidth: 19, height: 19, display: "grid", placeItems: "center", padding: "0 4px", borderRadius: 99, background: "#FACC15", color: "#172033", fontSize: ".68rem", fontWeight: 900, boxShadow: "0 0 0 2px #15233A" }}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <section
          aria-label="Centro de notificações"
          style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 100,
            width: "min(390px, calc(100vw - 28px))", maxHeight: "min(70vh, 560px)",
            overflow: "hidden", display: "flex", flexDirection: "column",
            border: "1px solid rgba(96,165,250,.38)", borderRadius: 15,
            background: "#0D1729", boxShadow: "0 22px 60px rgba(0,0,0,.58)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem", padding: ".9rem 1rem", borderBottom: "1px solid rgba(181,195,216,.15)" }}>
            <div>
              <strong style={{ color: "#F8FAFC", fontSize: ".96rem" }}>Centro de notificações</strong>
              <div style={{ color: "#9FB0C8", fontSize: ".72rem", marginTop: 2 }}>{unreadCount ? unreadCount + " por ler" : "Tudo em dia"}</div>
            </div>
            <div style={{ display: "flex", gap: ".35rem" }}>
              {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} style={{ border: 0, background: "transparent", color: "#8EC5FF", fontSize: ".72rem", fontWeight: 750, cursor: "pointer" }}>Marcar todas como lidas</button>}
              <button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} style={{ border: "1px solid rgba(181,195,216,.2)", borderRadius: 7, background: "#18263D", color: "#E2E8F0", padding: ".2rem .48rem", cursor: "pointer" }}>×</button>
            </div>
          </div>
          {!userId ? (
            <div style={{ padding: "1.2rem", color: "#B5C3D8", fontSize: ".84rem" }}>Entre na sua conta para receber avisos sobre os seus anúncios e pedidos.</div>
          ) : loading && items.length === 0 ? (
            <div style={{ padding: "1.2rem", color: "#B5C3D8", fontSize: ".84rem" }}>A carregar notificações…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "1.3rem 1rem", color: "#B5C3D8", fontSize: ".84rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: ".35rem" }}>✦</div>
              Ainda não tem notificações. Avisaremos quando houver novidades.
            </div>
          ) : (
            <div style={{ overflowY: "auto", padding: ".45rem", display: "grid", gap: ".35rem" }}>
              {items.map((item) => {
                const accent = palette[item.notification_type] || "#60A5FA";
                return (
                  <button key={item.id} type="button" onClick={() => openNotification(item)}
                    style={{
                      width: "100%", textAlign: "left", display: "grid", gap: ".28rem",
                      padding: ".75rem .8rem", borderRadius: 10, cursor: "pointer",
                      border: "1px solid " + (item.read_at ? "rgba(181,195,216,.12)" : accent),
                      borderLeft: "4px solid " + accent,
                      background: item.read_at ? "rgba(21,31,51,.55)" : "rgba(30,58,95,.42)",
                      color: "#F8FAFC",
                    }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", alignItems: "center" }}>
                      <strong style={{ fontSize: ".82rem" }}>{item.title}</strong>
                      {!item.read_at && <span style={{ width: 7, height: 7, flex: "0 0 auto", borderRadius: 99, background: accent }} />}
                    </span>
                    <span style={{ color: "#C5D2E3", fontSize: ".77rem", lineHeight: 1.45 }}>{item.message}</span>
                    <span style={{ color: "#8296B2", fontSize: ".67rem" }}>{timeLabel(item.created_at)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {feedback && <div role="status" style={{ padding: ".55rem .85rem", color: "#FCA5A5", fontSize: ".73rem", borderTop: "1px solid rgba(181,195,216,.12)" }}>{feedback}</div>}
          <div style={{ padding: ".55rem .8rem", borderTop: "1px solid rgba(181,195,216,.12)", color: "#8296B2", fontSize: ".68rem" }}>Atualização automática quando chega um novo aviso.</div>
        </section>
      )}
    </div>
  );
}
