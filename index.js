const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('./supabaseClient');
const { criarAgendamento, listarAgendamentos, cancelarAgendamento, listarHorariosDisponiveis } = require('./agendamento.js');

// --- Constantes ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-para-desenvolvimento';
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
    const s = SERVICOS.find(x => x.id === parseInt(id));
    return s || { id: parseInt(id), nome: `Serviço ${id}`, preco: 0 };
}
function getProfissionalInfo(id) {
    const p = PROFISSIONAIS.find(x => x.id === parseInt(id));
    return p || { id: parseInt(id), nome: `Profissional ${id}` };
}

async function ensureAdminUser() {
    try {
        const { data: existing, error: existingError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', 'admin')
            .limit(1);
        if (existingError) {
            console.error('Falha ao buscar admin na Supabase:', existingError);
            return;
        }
        if (existing && existing.length > 0) return;

        const hashed = await bcrypt.hash('admin', 10);
        const { error: insertError } = await supabase
            .from('users')
            .insert({ nome: 'Administrador', email: 'admin', senha: hashed, role: 'admin' });
        if (insertError) {
            console.error('Falha ao criar usuário admin na Supabase:', insertError);
        } else {
            console.log('Usuário admin criado: login "admin" e senha "admin"');
        }
    } catch (e) {
        console.error('Falha ao semear usuário admin:', e);
    }
}
ensureAdminUser().catch(err => console.error('Falha ao inicializar usuário admin:', err));

// --- Funções Auxiliares ---

/**
 * Lê o corpo de uma requisição e faz o parse como JSON.
 * @param {http.IncomingMessage} req - O objeto da requisição.
 * @returns {Promise<object>} O corpo da requisição como objeto JSON.
 */
function getJSONBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                if (body) {
                    resolve(JSON.parse(body));
                } else {
                    resolve({});
                }
            } catch (error) {
                reject('Invalid JSON');
            }
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Envia uma resposta JSON.
 * @param {http.ServerResponse} res - O objeto da resposta.
 * @param {number} statusCode - O código de status HTTP.
 * @param {object} data - O objeto a ser enviado como JSON.
 */
function sendJSONResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

/**
 * Serve arquivos estáticos (HTML, CSS, JS, imagens).
 * @param {http.IncomingMessage} req - O objeto da requisição.
 * @param {http.ServerResponse} res - O objeto da resposta.
 */
async function serveStaticFile(req, res) {
    const safePath = path.normalize(req.url).replace(/^(\.\.[\\/\\])+/, '');
    let requestPath = safePath === '/' ? 'index.html' : safePath.replace(/^[\/\\]/, '');
    if (!path.extname(requestPath)) {
        requestPath += '.html';
    }
    let filePath = path.join(__dirname, requestPath);

    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    };

    try {
        const fileContent = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Tenta procurar em subdiretórios comuns se não achar na raiz
            const subdirs = ['js', 'css', 'img', 'assets'];
            for (const subdir of subdirs) {
                try {
                    const subPath = path.join(__dirname, subdir, safePath);
                    const fileContent = await fs.readFile(subPath);
                    const ext = path.extname(subPath);
                    const contentType = contentTypes[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(fileContent);
                    return;
                } catch (subError) {
                    // Continua tentando
                }
            }
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
        } else {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>500 Internal Server Error</h1>');
        }
    }
}


// --- Lógica do Servidor ---

const server = http.createServer(async (req, res) => {
    // Configurações de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;

    try {
        // --- Rotas da API ---
        if (pathname === '/login' && req.method === 'POST') {
            const { email, password } = await getJSONBody(req);
            if (!email || !password) {
                return sendJSONResponse(res, 400, { error: 'Email e senha são obrigatórios.' });
            }
            const { data: users, error } = await supabase
                .from('users')
                .select('id, email, nome, senha, role')
                .eq('email', email)
                .limit(1);
            if (error) {
                return sendJSONResponse(res, 500, { error: 'Erro ao buscar usuário.' });
            }
            const user = users?.[0];
            if (!user || !await bcrypt.compare(password, user.senha)) {
                return sendJSONResponse(res, 401, { error: 'Credenciais inválidas.' });
            }
            const token = jwt.sign({ id: user.id, email: user.email, nome: user.nome, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '1h' });
            return sendJSONResponse(res, 200, { message: 'Login bem-sucedido!', token });
        }

        if (pathname === '/register' && req.method === 'POST') {
            const { nome, email, senha } = await getJSONBody(req);
            if (!nome || !email || !senha) {
                return sendJSONResponse(res, 400, { error: 'Todos os campos são obrigatórios.' });
            }
            const { data: existing, error: existingError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .limit(1);
            if (existingError) {
                return sendJSONResponse(res, 500, { error: 'Erro ao validar email.' });
            }
            if (existing && existing.length > 0) {
                return sendJSONResponse(res, 409, { error: 'Este email já está em uso.' });
            }
            const hashedPassword = await bcrypt.hash(senha, 10);
            const { error: insertError } = await supabase
                .from('users')
                .insert({ nome, email, senha: hashedPassword, role: 'user' });
            if (insertError) {
                return sendJSONResponse(res, 500, { error: 'Erro ao criar usuário.' });
            }
            return sendJSONResponse(res, 201, { message: 'Usuário registrado com sucesso!' });
        }

        if (pathname === '/agendamento' && req.method === 'POST') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            }
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded.id;

                const dadosAgendamento = await getJSONBody(req);
                const resultado = await criarAgendamento(dadosAgendamento, userId);

                return sendJSONResponse(res, 201, resultado);
            } catch (error) {
                if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                    return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado. Faça login novamente.' });
                }
                if (error.statusCode) {
                    return sendJSONResponse(res, error.statusCode, { error: error.message });
                }
                // Log do erro no servidor para depuração
                console.error('Erro ao processar agendamento na rota:', error);
                // Retorna um erro genérico para o cliente
                return sendJSONResponse(res, 500, { error: 'Erro interno ao processar o agendamento.' });
            }
        }

        if (pathname.startsWith('/agendamentos/') && req.method === 'GET') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            }
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const usuario_id = pathname.split('/').pop();
                if (String(decoded.id) !== String(usuario_id)) {
                    return sendJSONResponse(res, 403, { error: 'Acesso negado.' });
                }
                const agendamentos = await listarAgendamentos(usuario_id);
                return sendJSONResponse(res, 200, agendamentos);
            } catch (error) {
                if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                    return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado. Faça login novamente.' });
                }
                return sendJSONResponse(res, 500, { error: 'Erro ao listar agendamentos.' });
            }
        }

        if (pathname.startsWith('/agendamentos/') && req.method === 'DELETE') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            }
            const agendamento_id = pathname.split('/').pop();
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const result = await cancelarAgendamento(agendamento_id, decoded.id);
                return sendJSONResponse(res, 200, result);
            } catch (error) {
                if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                    return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado. Faça login novamente.' });
                }
                if (error.statusCode) {
                    return sendJSONResponse(res, error.statusCode, { error: error.message });
                }
                return sendJSONResponse(res, 500, { error: 'Erro ao cancelar agendamento.' });
            }
        }
        
        if (pathname === '/horarios-disponiveis' && req.method === 'GET') {
            const { data, profissional_id } = parsedUrl.query;
            if (!data) {
                return sendJSONResponse(res, 400, { error: 'Parâmetro data é obrigatório.' });
            }
            const horarios = await listarHorariosDisponiveis(data, profissional_id);
            return sendJSONResponse(res, 200, horarios);
        }

        // --- Rotas de Administração ---
        if (pathname === '/admin/agendamentos' && req.method === 'GET') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.role !== 'admin') return sendJSONResponse(res, 403, { error: 'Acesso restrito a administradores.' });

                const { start, end, profissional_id } = parsedUrl.query || {};
                function formatDate(d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
                let startStr = start; let endStr = end;
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
                const { data: raw, error: queryError } = await query;
                if (queryError) {
                    return sendJSONResponse(res, 500, { error: 'Erro ao carregar agendamentos.' });
                }
                const items = (raw || []).map(a => {
                    const s = getServicoInfo(a.servico_id);
                    const p = getProfissionalInfo(a.profissional_id);
                    return { id: a.id, data: a.data_agendamento, usuario_id: a.usuario_id, profissional_id: a.profissional_id, profissional_nome: p.nome, servico_id: a.servico_id, servico_nome: s.nome, preco: s.preco, status: a.status };
                });
                return sendJSONResponse(res, 200, { start: startStr, end: endStr, count: items.length, items });
            } catch (e) {
                if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado.' });
                return sendJSONResponse(res, 500, { error: 'Erro ao obter agenda semanal.' });
            }
        }

        if (pathname === '/admin/insights' && req.method === 'GET') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded.role !== 'admin') return sendJSONResponse(res, 403, { error: 'Acesso restrito a administradores.' });

                const { period = 'week' } = parsedUrl.query || {};
                function formatDate(d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
                const today = new Date();
                let startDate, endDate;
                if (period === 'month') {
                    endDate = new Date(today);
                    startDate = new Date(today); startDate.setDate(today.getDate() - 29);
                } else {
                    const day = today.getDay();
                    const diffToMonday = (day === 0 ? -6 : 1) - day;
                    startDate = new Date(today); startDate.setDate(today.getDate() + diffToMonday);
                    endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
                }
                const startStr = formatDate(startDate); const endStr = formatDate(endDate);
                const { data: raw, error: queryError } = await supabase
                    .from('agendamentos')
                    .select('data_agendamento, servico_id, profissional_id, status')
                    .eq('status', 'agendado')
                    .gte('data_agendamento', `${startStr} 00:00:00`)
                    .lte('data_agendamento', `${endStr} 23:59:59`);
                if (queryError) {
                    return sendJSONResponse(res, 500, { error: 'Erro ao obter insights.' });
                }
                const inRange = raw || [];

                const porDiaMap = new Map();
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
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
                    if (porDiaMap.has(dia)) { const v = porDiaMap.get(dia); v.receita += preco; v.quantidade += 1; }
                    const ks = s.id; const kp = p.id;
                    porServicoMap.set(ks, { servico_id: s.id, nome: s.nome, quantidade: (porServicoMap.get(ks)?.quantidade || 0) + 1, receita: (porServicoMap.get(ks)?.receita || 0) + preco });
                    porProfMap.set(kp, { profissional_id: p.id, nome: p.nome, quantidade: (porProfMap.get(kp)?.quantidade || 0) + 1, receita: (porProfMap.get(kp)?.receita || 0) + preco });
                });
                const porDia = Array.from(porDiaMap.values());
                const porServico = Array.from(porServicoMap.values());
                const porProfissional = Array.from(porProfMap.values());
                return sendJSONResponse(res, 200, { period, start: startStr, end: endStr, totalReceita, totalAgendamentos, porDia, porServico, porProfissional });
            } catch (e) {
                if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado.' });
                return sendJSONResponse(res, 500, { error: 'Erro ao obter insights.' });
            }
        }

        // --- Servir Arquivos Estáticos ---
        await serveStaticFile(req, res);

    } catch (error) {
        console.error('Erro não tratado na requisição:', error);
        // Evita enviar resposta se o cabeçalho já foi enviado (ex: dentro de criarAgendamento)
        if (!res.headersSent) {
            const message = error === 'Invalid JSON' ? error : 'Internal Server Error';
            const statusCode = error === 'Invalid JSON' ? 400 : 500;
            sendJSONResponse(res, statusCode, { error: message });
        }
    }
});

// --- Inicialização do Servidor ---
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Erro: A porta ${PORT} já está em uso.`);
    } else {
        console.error('Erro ao iniciar o servidor:', error);
    }
});

