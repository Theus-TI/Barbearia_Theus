const bcrypt = require('bcryptjs');
const { supabase } = require('../supabaseClient');
const { sendJSON, getJSONBody } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { nome, email, senha } = await getJSONBody(req);
    if (!nome || !email || !senha) {
      return sendJSON(res, 400, { error: 'Todos os campos são obrigatórios.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingError) {
      return sendJSON(res, 500, { error: 'Erro ao validar email.' });
    }
    if (existing && existing.length > 0) {
      return sendJSON(res, 409, { error: 'Este email já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const { error: insertError } = await supabase
      .from('users')
      .insert({ nome, email, senha: hashedPassword, role: 'user' });

    if (insertError) {
      return sendJSON(res, 500, { error: 'Erro ao criar usuário.' });
    }

    return sendJSON(res, 201, { message: 'Usuário registrado com sucesso!' });
  } catch (error) {
    if (error.message === 'Invalid JSON') {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
    return sendJSON(res, 500, { error: 'Erro ao tentar registrar.' });
  }
};
