"use client";

import { useEffect, useRef, useState } from "react";

export default function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        setError(
          "Camera niet beschikbaar of geen toestemming gegeven. Let op: camera-toegang vereist HTTPS (of localhost)."
        );
      }
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // jsQR wordt dynamisch geladen zodat deze pagina ook zonder camera werkt
          const jsQR = (await import("jsqr")).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            stopped = true;
            stream?.getTracks().forEach((t) => t.stop());
            onResult(code.data);
            return;
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6">
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl">
        <video ref={videoRef} muted playsInline className="w-full" />
        <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-gold" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="mt-4 max-w-xs text-center text-sm text-white">{error}</p>}
      <button onClick={onClose} className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink">
        Annuleren
      </button>
    </div>
  );
}
