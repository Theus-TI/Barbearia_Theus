const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAgendamentos, criarAgendamento } = require('./agendamento.js');

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
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    // Previne ataques de travessia de diretório
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);

    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
    };

    try {
        const fileContent = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileContent);
    } catch (error) {
        // Se o arquivo não existe ou é um diretório, retorna 404
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            if (!res.headersSent) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            }
        } else {
            // Para outros erros (ex: permissão), retorna 500
            console.error(`Erro ao servir o arquivo ${filePath}:`, error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 Internal Server Error</h1>');
            }
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

        if (pathname === '/agendamentos' && req.method === 'POST') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded.id;

                const agendamentoData = await getJSONBody(req);
                
                const newAgendamento = await criarAgendamento({ ...agendamentoData, userId });

                return sendJSONResponse(res, 201, newAgendamento);

            } catch (error) {
                if (error instanceof jwt.JsonWebTokenError) {
                    return sendJSONResponse(res, 401, { error: 'Token inválido ou expirado.' });
                }
                const statusCode = error.statusCode || 500;
                const message = error.statusCode ? error.message : 'Erro interno ao criar agendamento.';
                console.error('Erro ao criar agendamento:', error);
                return sendJSONResponse(res, statusCode, { error: message });
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

