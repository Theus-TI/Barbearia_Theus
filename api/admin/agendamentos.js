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
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const profissional_id = url.searchParams.get('profissional_id');

    let startStr = start;
    let endStr = end;
    if (!startStr || !endStr) {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today); monday.setDate(today.getDate() + diffToMonday);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      startStr = startStr || formatDate(monday);
      endStr = endStr || formatDate(sunday);
    }

    let query = supabase
      .from('agendamentos')
      .select('id, data_agendamento, usuario_id, profissional_id, servico_id, status')
      .eq('status', 'agendado')
      .gte('data_agendamento', `${startStr} 00:00:00`)
      .lte('data_agendamento', `${endStr} 23:59:59`);

    if (profissional_id) {
      query = query.eq('profissional_id', parseInt(profissional_id));
    }

    const { data: raw, error } = await query;
    if (error) {
      return sendJSON(res, 500, { error: 'Erro ao carregar agendamentos.' });
    }

    const items = (raw || []).map(a => {
      const s = getServicoInfo(a.servico_id);
      const p = getProfissionalInfo(a.profissional_id);
      return {
        id: a.id,
        data: a.data_agendamento,
        usuario_id: a.usuario_id,
        profissional_id: a.profissional_id,
        profissional_nome: p.nome,
        servico_id: a.servico_id,
        servico_nome: s.nome,
        preco: s.preco,
        status: a.status
      };
    });

    return sendJSON(res, 200, { start: startStr, end: endStr, count: items.length, items });
  } catch (error) {
    const status = error.statusCode || (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500);
    const message = error.message || 'Erro ao obter agenda semanal.';
    return sendJSON(res, status, { error: message });
  }
};
