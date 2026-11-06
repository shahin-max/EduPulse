"use client";

import { useRef, useState } from "react";

type Format = "png" | "jpg";

export default function DownloadControls() {
  const [format, setFormat] = useState<Format | null>(null);
  const [message, setMessage] = useState("");
  const exporting = useRef(false);

  async function downloadImage(nextFormat: Format) {
    if (exporting.current) return;
    exporting.current = true;
    setFormat(nextFormat);
    setMessage("");
    try {
      const brochure = document.getElementById("edupulse-brochure");
      if (!brochure) throw new Error("Pamphlet unavailable");
      await document.fonts.ready;
      await Promise.all(Array.from(brochure.querySelectorAll("img")).map(image => image.decode()));
      const { toCanvas } = await import("html-to-image");
      const canvas = await toCanvas(brochure, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: true,
        filter: node => !(node instanceof HTMLElement && node.hasAttribute("data-export-ignore")),
        style: { boxShadow: "none", margin: "0" },
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image export failed")), nextFormat === "png" ? "image/png" : "image/jpeg", 0.95);
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `edupulse-aissee-2027.${nextFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(`${nextFormat.toUpperCase()} download ready.`);
    } catch {
      setMessage("Could not download the image. Please try again.");
    } finally {
      exporting.current = false;
      setFormat(null);
    }
  }

  return (
    <div className="download-toolbar" aria-label="Download pamphlet">
      <span className="download-label">SAVE & SHARE THE PAMPHLET</span>
      <div className="download-actions">
        <span className="download-status" role="status">{message}</span>
        <button type="button" disabled={format !== null} onClick={() => downloadImage("png")}>{format === "png" ? "Preparing PNG…" : "Download PNG"}<span aria-hidden="true">↓</span></button>
        <button type="button" disabled={format !== null} onClick={() => downloadImage("jpg")}>{format === "jpg" ? "Preparing JPG…" : "Download JPG"}<span aria-hidden="true">↓</span></button>
      </div>
    </div>
  );
}
