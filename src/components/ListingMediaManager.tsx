import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Media = { id: string; url: string; type: "image" | "video"; sort: number };
type Props = { listingId: string; ownerId: string; currentCover: string; onCoverChange: (url: string) => void };

const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"];

export default function ListingMediaManager({ listingId, ownerId, currentCover, onCoverChange }: Props) {
  const [items, setItems] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await supabase.from("listing_media").select("id, media_url, media_type, sort_order").eq("listing_id", listingId).order("sort_order");
    if (error) { setMessage("Não foi possível carregar a galeria: " + error.message); return; }
    setItems((data ?? []).map((row) => ({ id: String(row.id), url: String(row.media_url), type: row.media_type as "image" | "video", sort: Number(row.sort_order) })));
  }

  useEffect(() => { void load(); }, [listingId]);

  async function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (items.length + files.length > 12) { setMessage("O anúncio pode ter no máximo 12 ficheiros."); return; }
    if (files.some((file) => !accepted.includes(file.type) || file.size > 20 * 1024 * 1024)) {
      setMessage("Use imagens JPG, PNG, WEBP, AVIF ou vídeos MP4, WEBM, MOV até 20 MB cada."); return;
    }
    setBusy(true); setMessage("");
    try {
      for (const file of files) {
        const safe = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90);
        const path = ownerId + "/" + listingId + "/" + crypto.randomUUID() + "-" + safe;
        const { error: uploadError } = await supabase.storage.from("listing-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("listing-media").getPublicUrl(path);
        const { error: rowError } = await supabase.from("listing_media").insert({ listing_id: listingId, owner_id: ownerId, media_url: data.publicUrl, media_type: file.type.startsWith("video/") ? "video" : "image", sort_order: items.length });
        if (rowError) throw rowError;
      }
      await load(); setMessage("Galeria atualizada com sucesso.");
    } catch (error) {
      setMessage("Não foi possível concluir o carregamento: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally { setBusy(false); }
  }

  async function remove(item: Media) {
    if (!window.confirm("Remover este ficheiro do anúncio?")) return;
    setBusy(true); setMessage("");
    try {
      const marker = "/object/public/listing-media/";
      const path = decodeURIComponent(item.url.split(marker)[1] ?? "");
      if (path) {
        const { error: storageError } = await supabase.storage.from("listing-media").remove([path]);
        if (storageError) throw storageError;
      }
      const { error } = await supabase.from("listing_media").delete().eq("id", item.id).eq("owner_id", ownerId);
      if (error) throw error;
      if (item.url === currentCover) {
        const nextCover = items.find((candidate) => candidate.id !== item.id && candidate.type === "image")?.url ?? "";
        await supabase.from("listings").update({ image_url: nextCover }).eq("id", listingId).eq("owner_id", ownerId);
        onCoverChange(nextCover);
      }
      await load(); setMessage("Ficheiro removido.");
    } catch (error) {
      setMessage("Não foi possível remover: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally { setBusy(false); }
  }

  async function makeCover(item: Media) {
    if (item.type !== "image") return;
    setBusy(true);
    const { error } = await supabase.from("listings").update({ image_url: item.url }).eq("id", listingId).eq("owner_id", ownerId);
    if (error) setMessage("Não foi possível definir a fotografia principal: " + error.message);
    else { onCoverChange(item.url); setMessage("Fotografia principal atualizada."); }
    setBusy(false);
  }

  return <div style={{ display: "grid", gap: 9, borderTop: "1px solid rgba(181,195,216,0.16)", paddingTop: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <strong style={{ color: "#F8FAFC", fontSize: 13 }}>Galeria do anúncio ({items.length}/12)</strong>
      <label style={{ padding: "8px 11px", borderRadius: 8, background: busy ? "#334155" : "#2563EB", color: "white", fontSize: 12, fontWeight: 650, cursor: busy ? "wait" : "pointer" }}>
        {busy ? "A processar..." : "Adicionar fotos / vídeos"}
        <input type="file" multiple disabled={busy || items.length >= 12} accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" onChange={addFiles} style={{ display: "none" }} />
      </label>
    </div>
    {items.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(105px,1fr))", gap: 8 }}>
      {items.map((item) => <div key={item.id} style={{ border: "1px solid rgba(181,195,216,0.2)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ aspectRatio: "4/3", background: "#0B1220" }}>
          {item.type === "video" ? <video src={item.url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={item.url} alt="Fotografia do anúncio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ padding: 6, display: "grid", gap: 5 }}>
          {item.type === "image" && <button type="button" disabled={busy} onClick={() => makeCover(item)} style={{ border: 0, background: "transparent", color: item.url === currentCover ? "#38D6A0" : "#BFDBFE", textAlign: "left", fontSize: 11, cursor: "pointer" }}>{item.url === currentCover ? "Fotografia principal" : "Definir como principal"}</button>}
          <button type="button" disabled={busy} onClick={() => remove(item)} style={{ border: 0, background: "transparent", color: "#FCA5A5", textAlign: "left", fontSize: 11, cursor: "pointer" }}>Remover</button>
        </div>
      </div>)}
    </div>}
    {message && <span style={{ color: "#B5C3D8", fontSize: 12 }}>{message}</span>}
  </div>;
}
