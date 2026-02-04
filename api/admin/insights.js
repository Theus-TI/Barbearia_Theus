const { supabase } = require('../../supabaseClient');
const { sendJSON, verifyToken } = require('../_utils');

const SERVICOS = [
  { id: 1, nome: 'Corte de Cabelo', preco: 40 },
  { id: 2, nome: 'Design de Barba', preco: 35 },
  { id: 3, nome: 'Combo (Cabelo + Barba)', preco: 70 },
  { id: 4, nome: 'Tratamento Capilar', preco: 60 }
];
const PROFISSIONAIS = [
  { id: 1, nome: 'Rafa' },
  { id: 2, nome: 'Tteu' }
];

function getServicoInfo(id) {
  return SERVICOS.find(x => x.id === parseInt(id)) || { id: parseInt(id), nome: `Serviço ${id}`, preco: 0 };
}
function getProfissionalInfo(id) {
  return PROFISSIONAIS.find(x => x.id === parseInt(id)) || { id: parseInt(id), nome: `Profissional ${id}` };
}
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  try {
    const decoded = verifyToken(req);
    if (decoded.role !== 'admin') {
      return sendJSON(res, 403, { error: 'Acesso restrito a administradores.' });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const period = url.searchParams.get('period') || 'week';

    const today = new Date();
    let startDate; let endDate;
    if (period === 'month') {
      endDate = new Date(today);
      startDate = new Date(today); startDate.setDate(today.getDate() - 29);
    } else {
      const day = today.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(today); startDate.setDate(today.getDate() + diffToMonday);
      endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
    }

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const { data: raw, error } = await supabase
      .from('agendamentos')
      .select('data_agendamento, servico_id, profissional_id, status')
      .eq('status', 'agendado')
      .gte('data_agendamento', `${startStr} 00:00:00`)
      .lte('data_agendamento', `${endStr} 23:59:59`);

    if (error) {
      return sendJSON(res, 500, { error: 'Erro ao obter insights.' });
    }

    const inRange = raw || [];
    const porDiaMap = new Map();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      porDiaMap.set(formatDate(d), { data: formatDate(d), receita: 0, quantidade: 0 });
    }

    let totalReceita = 0; let totalAgendamentos = 0;
    const porServicoMap = new Map();
    const porProfMap = new Map();

    inRange.forEach(a => {
      const s = getServicoInfo(a.servico_id);
      const p = getProfissionalInfo(a.profissional_id);
      const dia = a.data_agendamento.split(' ')[0];
      const preco = s.preco || 0;
      totalReceita += preco; totalAgendamentos += 1;
      if (porDiaMap.has(dia)) {
        const v = porDiaMap.get(dia);
        v.receita += preco; v.quantidade += 1;
      }
      const ks = s.id; const kp = p.id;
      porServicoMap.set(ks, {
        servico_id: s.id,
        nome: s.nome,
        quantidade: (porServicoMap.get(ks)?.quantidade || 0) + 1,
        receita: (porServicoMap.get(ks)?.receita || 0) + preco
      });
      porProfMap.set(kp, {
        profissional_id: p.id,
        nome: p.nome,
        quantidade: (porProfMap.get(kp)?.quantidade || 0) + 1,
        receita: (porProfMap.get(kp)?.receita || 0) + preco
      });
    });

    return sendJSON(res, 200, {
      period,
      start: startStr,
      end: endStr,
      totalReceita,
      totalAgendamentos,
      porDia: Array.from(porDiaMap.values()),
      porServico: Array.from(porServicoMap.values()),
      porProfissional: Array.from(porProfMap.values())
    });
  } catch (error) {
    const status = error.statusCode || (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500);
    const message = error.message || 'Erro ao obter insights.';
    return sendJSON(res, status, { error: message });
  }
};
