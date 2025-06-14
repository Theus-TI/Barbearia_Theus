const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { criarAgendamento, listarAgendamentos, cancelarAgendamento, listarHorariosDisponiveis } = require('./agendamento.js');

// --- Constantes ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-para-desenvolvimento';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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
    let filePath = path.join(__dirname, safePath === '/' ? 'index.html' : safePath);

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
            const subdirs = ['js', 'css', 'img'];
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
            const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
            const user = users.find(u => u.email === email);
            if (!user || !await bcrypt.compare(password, user.senha)) {
                return sendJSONResponse(res, 401, { error: 'Credenciais inválidas.' });
            }
            const token = jwt.sign({ id: user.id, email: user.email, nome: user.nome }, JWT_SECRET, { expiresIn: '1h' });
            return sendJSONResponse(res, 200, { message: 'Login bem-sucedido!', token });
        }

        if (pathname === '/register' && req.method === 'POST') {
            const { nome, email, senha } = await getJSONBody(req);
            if (!nome || !email || !senha) {
                return sendJSONResponse(res, 400, { error: 'Todos os campos são obrigatórios.' });
            }
            const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
            if (users.find(u => u.email === email)) {
                return sendJSONResponse(res, 409, { error: 'Este email já está em uso.' });
            }
            const hashedPassword = await bcrypt.hash(senha, 10);
            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            const newUser = { id: newId, nome, email, senha: hashedPassword };
            users.push(newUser);
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
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
                // Log do erro no servidor para depuração
                console.error('Erro ao processar agendamento na rota:', error);
                // Retorna um erro genérico para o cliente
                return sendJSONResponse(res, 500, { error: 'Erro interno ao processar o agendamento.' });
            }
        }

        if (pathname.startsWith('/agendamentos/') && req.method === 'GET') {
            const usuario_id = pathname.split('/').pop();
            const agendamentos = await listarAgendamentos(usuario_id);
            return sendJSONResponse(res, 200, agendamentos);
        }
        
        if (pathname === '/horarios-disponiveis' && req.method === 'GET') {
            const { data } = parsedUrl.query;
            const horarios = await listarHorariosDisponiveis(data);
            return sendJSONResponse(res, 200, horarios);
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

