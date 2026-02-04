const { listarAgendamentos, cancelarAgendamento } = require('../../agendamento');
const { sendJSON, verifyToken } = require('../_utils');

module.exports = async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();

  try {
    const decoded = verifyToken(req);

    if (method === 'GET') {
      if (String(decoded.id) !== String(id)) {
        return sendJSON(res, 403, { error: 'Acesso negado.' });
      }
      const agendamentos = await listarAgendamentos(id);
      return sendJSON(res, 200, agendamentos);
    }

    if (method === 'DELETE') {
      const result = await cancelarAgendamento(id, decoded.id);
      return sendJSON(res, 200, result);
    }

    return sendJSON(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const status = error.statusCode || (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500);
    const message = error.message || 'Erro ao processar solicitação.';
    return sendJSON(res, status, { error: message });
  }
};
