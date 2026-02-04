const { criarAgendamento } = require('../agendamento');
const { sendJSON, getJSONBody, verifyToken } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  try {
    const decoded = verifyToken(req);
    const dadosAgendamento = await getJSONBody(req);
    const result = await criarAgendamento(dadosAgendamento, decoded.id);
    return sendJSON(res, 201, result);
  } catch (error) {
    const status = error.statusCode || (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500);
    const message = error.message || 'Erro interno ao processar o agendamento.';
    return sendJSON(res, status, { error: message });
  }
};
