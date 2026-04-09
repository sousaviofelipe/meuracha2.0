"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Dispositivo = "ios" | "android" | "windows" | "outro";

function detectarDispositivo(): Dispositivo {
  if (typeof navigator === "undefined") return "outro";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows/.test(ua)) return "windows";
  return "outro";
}

const PASSOS = {
  ios: [
    {
      icon: "1️⃣",
      titulo: "Abra o Safari",
      desc: "O PWA só pode ser instalado pelo Safari no iPhone. Chrome e outros navegadores não suportam instalação no iOS.",
    },
    {
      icon: "2️⃣",
      titulo: "Toque no botão Compartilhar",
      desc: "Na barra inferior do Safari, toque no ícone de compartilhar — é um quadrado com uma seta apontando para cima.",
    },
    {
      icon: "3️⃣",
      titulo: 'Role para baixo e toque em "Adicionar à Tela de Início"',
      desc: 'Procure a opção "Adicionar à Tela de Início" na lista de opções do menu compartilhar.',
    },
    {
      icon: "4️⃣",
      titulo: 'Confirme o nome e toque em "Adicionar"',
      desc: 'O nome do app aparecerá como "RachaApp". Toque em Adicionar no canto superior direito para confirmar.',
    },
    {
      icon: "5️⃣",
      titulo: "Pronto!",
      desc: "O ícone do RachaApp aparecerá na sua tela inicial. Toque nele para abrir o app.",
    },
  ],
  android: [
    {
      icon: "1️⃣",
      titulo: "Abra o Chrome",
      desc: "Acesse o RachaApp pelo Google Chrome no seu Android.",
    },
    {
      icon: "2️⃣",
      titulo: "Toque nos 3 pontinhos",
      desc: "No canto superior direito do Chrome, toque no menu de 3 pontinhos (⋮).",
    },
    {
      icon: "3️⃣",
      titulo: 'Toque em "Adicionar à tela inicial"',
      desc: 'Selecione a opção "Adicionar à tela inicial" ou "Instalar app" no menu.',
    },
    {
      icon: "4️⃣",
      titulo: "Confirme a instalação",
      desc: 'Uma janela aparecerá pedindo confirmação. Toque em "Instalar" ou "Adicionar".',
    },
    {
      icon: "5️⃣",
      titulo: "Pronto!",
      desc: "O RachaApp aparecerá na sua tela inicial como um app nativo.",
    },
  ],
  windows: [
    {
      icon: "1️⃣",
      titulo: "Abra o Chrome ou Edge",
      desc: "Acesse o RachaApp pelo Google Chrome ou Microsoft Edge no seu computador.",
    },
    {
      icon: "2️⃣",
      titulo: "Clique no ícone de instalar",
      desc: "Na barra de endereço, clique no ícone de instalar (⊕) que aparece no canto direito.",
    },
    {
      icon: "3️⃣",
      titulo: 'Clique em "Instalar"',
      desc: "Uma janela aparecerá perguntando se deseja instalar o RachaApp. Clique em Instalar.",
    },
    {
      icon: "4️⃣",
      titulo: "Pronto!",
      desc: "O RachaApp abrirá como um app separado e aparecerá no menu Iniciar e na barra de tarefas.",
    },
  ],
  outro: [
    {
      icon: "💻",
      titulo: "Chrome ou Edge (Desktop)",
      desc: "Clique no ícone de instalar (⊕) na barra de endereço.",
    },
    {
      icon: "🤖",
      titulo: "Android",
      desc: 'Toque nos 3 pontinhos do Chrome → "Adicionar à tela inicial".',
    },
    {
      icon: "🍎",
      titulo: "iPhone/iPad",
      desc: 'No Safari, toque em Compartilhar → "Adicionar à Tela de Início".',
    },
  ],
};

const DISPOSITIVO_INFO = {
  ios: {
    label: "iPhone / iPad",
    emoji: "🍎",
    cor: "border-gray-500/30 bg-gray-500/10",
  },
  android: {
    label: "Android",
    emoji: "🤖",
    cor: "border-green-500/30 bg-green-500/10",
  },
  windows: {
    label: "Windows",
    emoji: "💻",
    cor: "border-blue-500/30 bg-blue-500/10",
  },
  outro: {
    label: "Seu dispositivo",
    emoji: "📱",
    cor: "border-gray-500/30 bg-gray-500/10",
  },
};

export default function InstalarPage() {
  const [dispositivo, setDispositivo] = useState<Dispositivo>("outro");
  const [abaSelecionada, setAbaSelecionada] = useState<Dispositivo>("outro");

  useEffect(() => {
    const d = detectarDispositivo();
    setDispositivo(d);
    setAbaSelecionada(d);
  }, []);

  const passos = PASSOS[abaSelecionada];
  const info = DISPOSITIVO_INFO[abaSelecionada];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/login"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-white font-black">📲 Como Instalar</h1>
            <p className="text-gray-500 text-xs">
              Adicione o RachaApp na sua tela inicial
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-6 pb-10">
        {/* Banner dispositivo detectado */}
        <div
          className={`border rounded-2xl p-4 ${DISPOSITIVO_INFO[dispositivo].cor}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {DISPOSITIVO_INFO[dispositivo].emoji}
            </span>
            <div>
              <p className="text-white font-bold">
                Detectamos: {DISPOSITIVO_INFO[dispositivo].label}
              </p>
              <p className="text-gray-400 text-sm">
                Veja as instruções para seu dispositivo abaixo
              </p>
            </div>
          </div>
        </div>

        {/* Abas de dispositivo */}
        <div className="grid grid-cols-3 gap-2">
          {(["ios", "android", "windows"] as Dispositivo[]).map((d) => (
            <button
              key={d}
              onClick={() => setAbaSelecionada(d)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                abaSelecionada === d
                  ? "bg-green-500 border-green-500 text-black"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <span className="text-xl">{DISPOSITIVO_INFO[d].emoji}</span>
              <span className="text-xs">{DISPOSITIVO_INFO[d].label}</span>
            </button>
          ))}
        </div>

        {/* Aviso iOS */}
        {abaSelecionada === "ios" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-yellow-400 font-bold text-sm">
                  Apenas pelo Safari
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  No iPhone e iPad, a instalação só funciona pelo navegador
                  Safari. Se estiver usando Chrome ou outro navegador, abra o
                  Safari primeiro.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passos */}
        <div className="flex flex-col gap-3">
          <h2 className="text-white font-bold text-lg">
            {info.emoji} Passo a passo — {info.label}
          </h2>
          {passos.map((passo, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-4"
            >
              <span className="text-2xl flex-shrink-0">{passo.icon}</span>
              <div>
                <p className="text-white font-bold mb-1">{passo.titulo}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {passo.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Vantagens */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <p className="text-green-400 font-bold mb-3">🚀 Por que instalar?</p>
          <div className="flex flex-col gap-2">
            {[
              { icon: "⚡", text: "Abre mais rápido que pelo navegador" },
              { icon: "📵", text: "Funciona mesmo com internet lenta" },
              { icon: "🖥️", text: "Tela cheia sem barra do navegador" },
              { icon: "🔔", text: "Acesso rápido pela tela inicial" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span className="text-gray-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botão voltar */}
        <Link
          href="/login"
          className="w-full py-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 font-medium text-center transition-colors"
        >
          ← Voltar para o início
        </Link>
      </main>
    </div>
  );
}
