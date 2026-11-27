import React, { useEffect, useMemo } from "react";

const MAX_FILES = 12;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm", "video/quicktime"];

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

export default function ListingMediaPicker({ files, onChange, disabled = false }: Props) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file), video: file.type.startsWith("video/") })),
    [files]
  );

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!incoming.length) return;
    const valid = incoming.filter((file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES);
    if (valid.length !== incoming.length) {
      window.alert("Alguns ficheiros foram ignorados. Use JPG, PNG, WEBP, AVIF, MP4, WEBM ou MOV, até 20 MB cada.");
    }
    onChange([...files, ...valid].slice(0, MAX_FILES));
  }

  return (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "#F8FAFC", fontSize: "0.92rem" }}>Fotografias e vídeos</strong>
          <div style={{ color: "#B5C3D8", fontSize: "0.78rem", marginTop: 3 }}>Até 12 ficheiros · 20 MB por ficheiro</div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0.65rem 0.9rem", borderRadius: 9, background: disabled ? "#334155" : "#2563EB", color: "#FFFFFF", fontWeight: 650, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
          + Adicionar ficheiros
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" multiple disabled={disabled || files.length >= MAX_FILES} onChange={addFiles} style={{ display: "none" }} />
        </label>
      </div>
      {previews.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(115px,1fr))", gap: 9 }}>
          {previews.map(({ file, url, video }, index) => (
            <div key={file.name + file.lastModified + index} style={{ border: "1px solid rgba(181,195,216,0.2)", borderRadius: 10, overflow: "hidden", background: "#0B1220" }}>
              <div style={{ aspectRatio: "4 / 3", background: "#111827" }}>
                {video ? <video src={url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={url} alt={"Pré-visualização da fotografia " + (index + 1)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ padding: 7 }}>
                <div style={{ color: "#E2E8F0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video ? "Vídeo" : "Fotografia"} · {(file.size / 1024 / 1024).toFixed(1)} MB</div>
                <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} style={{ marginTop: 5, border: 0, background: "transparent", color: "#FCA5A5", cursor: "pointer", padding: 0, fontSize: 12 }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: "1px dashed rgba(181,195,216,0.35)", borderRadius: 10, padding: "1rem", color: "#94A3B8", fontSize: "0.84rem", textAlign: "center" }}>
          Adicione pelo menos uma fotografia para publicar o anúncio. Os vídeos são opcionais.
        </div>
      )}
    </div>
  );
}
