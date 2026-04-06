"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Racha } from "@/types";

interface Props {
  racha: Racha;
}

export default function CompartilharRacha({ racha }: Props) {
  const [modal, setModal] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/racha/${racha.codigo}`
      : `/racha/${racha.codigo}`;
  const mensagemWhats = encodeURIComponent(
    `Acesse o nosso racha no RachaApp! 🔥\n\n${link}`,
  );

  useEffect(() => {
    if (modal && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, link, {
        width: 200,
        margin: 2,
        color: { dark: "#ffffff", light: "#111827" },
      });
    }
  }, [modal, link]);

  async function handleCopiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => setModal(true)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        🔗 Compartilhar Racha
      </button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-lg">
                Compartilhar Racha
              </h2>
              <button
                onClick={() => setModal(false)}
                className="text-gray-500 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="bg-gray-800 p-3 rounded-2xl">
                <canvas ref={canvasRef} />
              </div>
              <p className="text-gray-500 text-xs">
                Escaneie para acessar o racha
              </p>
            </div>

            {/* Código */}
            <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Código do racha</p>
                <p className="text-green-400 font-mono font-bold">
                  {racha.codigo}
                </p>
              </div>
            </div>

            {/* Link */}
            <div className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">Link direto</p>
              <p className="text-white text-xs break-all font-mono">{link}</p>
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopiar}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  copiado
                    ? "bg-green-500 text-black"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                {copiado ? "✅ Link copiado!" : "📋 Copiar link"}
              </button>
              <a
                href={`https://wa.me/?text=${mensagemWhats}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl font-bold text-sm text-white text-center bg-[#25D366] hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartilhar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
