const { listarHorariosDisponiveis } = require('../agendamento');
const { sendJSON } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const data = url.searchParams.get('data');
  const profissional_id = url.searchParams.get('profissional_id');

  if (!data) {
    return sendJSON(res, 400, { error: 'Parâmetro data é obrigatório.' });
  }

  try {
    const horarios = await listarHorariosDisponiveis(data, profissional_id);
    return sendJSON(res, 200, horarios);
  } catch (error) {
    return sendJSON(res, 500, { error: error.message || 'Erro ao listar horários disponíveis.' });
  }
};
