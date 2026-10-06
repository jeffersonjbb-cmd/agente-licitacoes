'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Home() {
  const [segmento, setSegmento] = useState('Desenvolvimento de Software');
  const [budgetMin, setBudgetMin] = useState(50000);
  const [budgetMax, setBudgetMax] = useState(300000);
  const [estado, setEstado] = useState('RR');
  const [loading, setLoading] = useState(false);
  const [licitacoes, setLicitacoes] = useState<any[]>([]);
  const [analise, setAnalise] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const buscar = async () => {
    setLoading(true);
    setLicitacoes([]);
    setAnalise('');
    
    try {
      const response = await fetch('/api/buscar-licitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmento, budgetMin, budgetMax, estado })
      });
      
      if (!response.ok) throw new Error('Erro na requisição');
      
      const data = await response.json();
      setLicitacoes(data.licitacoes || []);
      setAnalise(data.analise || 'Sem análise disponível');
    } catch (error) {
      console.error('Erro:', error);
      setAnalise('Erro ao buscar licitações');
    }
    
    setLoading(false);
  };

  const dadosGrafico = licitacoes.map(lic => ({
    nome: lic.orgao?.substring(0, 20) || 'N/A',
    valor: Math.round(lic.valor / 1000)
  }));

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Agente de Licitações</h1>
        <p className="text-gray-600 mb-8">Encontre oportunidades de negócios para sua MEI</p>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              placeholder="Segmento"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value))}
              placeholder="Budget Mín"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              placeholder="Budget Máx"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="RR">Roraima</option>
              <option value="AM">Amazonas</option>
            </select>
            <button
              onClick={buscar}
              disabled={loading}
              className="bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              {loading ? '🔄 Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-4 font-semibold transition ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('licitacoes')}
              className={`flex-1 py-4 font-semibold transition ${
                activeTab === 'licitacoes' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'
              }`}
            >
              📋 Licitações ({licitacoes.length})
            </button>
            <button
              onClick={() => setActiveTab('analise')}
              className={`flex-1 py-4 font-semibold transition ${
                activeTab === 'analise' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'
              }`}
            >
              🤖 Análise
            </button>
          </div>

          <div className="p-8">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div>
                {licitacoes.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Valores por Órgão</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosGrafico}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value) => `R$ ${value}k`} />
                          <Bar dataKey="valor" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Resumo</h3>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total de Licitações</p>
                          <p className="text-3xl font-bold text-indigo-600">{licitacoes.length}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Valor Médio</p>
                          <p className="text-3xl font-bold text-green-600">
                            R$ {Math.round(licitacoes.reduce((a, b) => a + b.valor, 0) / licitacoes.length / 1000)}k
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Clique em "Buscar" para ver gráficos</p>
                )}
              </div>
            )}

            {/* Licitações */}
            {activeTab === 'licitacoes' && (
              <div className="space-y-4">
                {licitacoes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Clique em "Buscar" para ver licitações</p>
                ) : (
                  licitacoes.map((lic, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                      <h4 className="font-semibold text-gray-900">{lic.orgao}</h4>
                      <p className="text-gray-600 text-sm mt-1">{lic.objeto}</p>
                      <div className="flex gap-6 mt-3 text-sm">
                        <span className="text-indigo-600 font-semibold">R$ {lic.valor.toLocaleString('pt-BR')}</span>
                        <span className="text-gray-500">📍 {lic.cidade}/{lic.uf}</span>
                        <span className="text-red-500">📅 {lic.dataEncerramento}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Análise */}
            {activeTab === 'analise' && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed font-mono">
                  {analise || 'Clique em "Buscar" para ver análise'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}