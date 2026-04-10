'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { dbGetRachaPorCodigo } from '@/lib/db/publico.db'

export default function EstatutoPage() {
  const params = useParams()
  const codigo = params.codigo as string
  const [estatutoUrl, setEstatutoUrl] = useState<string | null>(null)
  const [nomRacha, setNomRacha] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo)
      if (!r) return setNotFound(true)
      setNomRacha(r.nome)
      setEstatutoUrl((r as any).estatuto_url ?? null)
      setLoading(false)
    }
    carregar()
  }, [codigo])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href={`/racha/${codigo}`} className="text-gray-400 hover:text-white transition-colors">←</Link>
          <div className="flex-1">
            <h1 className="text-white font-black">📄 Estatuto</h1>
            <p className="text-gray-500 text-xs">{nomRacha}</p>
          </div>
          {estatutoUrl && (
            
              href={estatutoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              ⬇️ Baixar PDF
            </a>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col">
        {notFound || !estatutoUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
            <p className="text-6xl">📄</p>
            <h2 className="text-white text-xl font-black">Estatuto não disponível</h2>
            <p className="text-gray-400 text-center text-sm">
              O estatuto deste racha ainda não foi publicado.
            </p>
            <Link
              href={`/racha/${codigo}`}
              className="text-green-400 hover:underline text-sm"
            >
              ← Voltar ao dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Visualizador PDF — ocupa toda a tela */}
            <div className="flex-1 w-full" style={{ minHeight: 'calc(100vh - 65px)' }}>
              <iframe
                src={`${estatutoUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full"
                style={{ minHeight: 'calc(100vh - 65px)', border: 'none' }}
                title="Estatuto do Racha"
              />
            </div>

            {/* Fallback para mobile */}
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <p className="text-gray-500 text-xs text-center mb-3">
                Problema para visualizar? Baixe o PDF diretamente.
              </p>
              <a
                href={estatutoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm transition-colors"
              >
                📥 Abrir PDF em nova aba
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}