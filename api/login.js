const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabaseClient');
const { sendJSON, getJSONBody, JWT_SECRET } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { email, password } = await getJSONBody(req);
    if (!email || !password) {
      return sendJSON(res, 400, { error: 'Email e senha são obrigatórios.' });
    }

    try {
      const { data: existingAdmin, error: adminQueryError } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin')
        .limit(1);

      if (!adminQueryError && (!existingAdmin || existingAdmin.length === 0)) {
        const hashed = await bcrypt.hash('admin', 10);
        await supabase
          .from('users')
          .insert({ nome: 'Administrador', email: 'admin', senha: hashed, role: 'admin' });
      }
    } catch (_) {
      // não bloqueia login
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, nome, senha, role')
      .eq('email', email)
      .limit(1);

    if (error) {
      return sendJSON(res, 500, { error: 'Erro ao buscar usuário.' });
    }

    const user = users?.[0];
    if (!user || !await bcrypt.compare(password, user.senha)) {
      return sendJSON(res, 401, { error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return sendJSON(res, 200, { message: 'Login bem-sucedido!', token });
  } catch (error) {
    if (error.message === 'Invalid JSON') {
      return sendJSON(res, 400, { error: 'Invalid JSON' });
    }
    return sendJSON(res, 500, { error: 'Erro ao tentar fazer login.' });
  }
};
