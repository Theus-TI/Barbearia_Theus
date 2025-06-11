const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAgendamentos, criarAgendamento, listarHorariosDisponiveis } = require('./agendamento.js');

// --- Constantes ---
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-para-desenvolvimento';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// --- Funções Auxiliares ---

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

function sendJSONResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

async function serveStaticFile(req, res) {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
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
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            if (!res.headersSent) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            }
        } else {
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
    console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.url}`);
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
        // --- Roteador da API ---
        if (pathname.startsWith('/login') && req.method === 'POST') {
            const { email, password } = await getJSONBody(req);
            if (!email || !password) {
                sendJSONResponse(res, 400, { error: 'Email e senha são obrigatórios.' });
            } else {
                const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
                const user = users.find(u => u.email === email);
                if (!user || !await bcrypt.compare(password, user.senha)) {
                    sendJSONResponse(res, 401, { error: 'Credenciais inválidas.' });
                } else {
                    const token = jwt.sign({ id: user.id, email: user.email, nome: user.nome }, JWT_SECRET, { expiresIn: '1h' });
                    sendJSONResponse(res, 200, { message: 'Login bem-sucedido!', token });
                }
            }
        } else if (pathname.startsWith('/register') && req.method === 'POST') {
            const { nome, email, senha } = await getJSONBody(req);
            if (!nome || !email || !senha) {
                sendJSONResponse(res, 400, { error: 'Todos os campos são obrigatórios.' });
            } else {
                const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
                if (users.find(u => u.email === email)) {
                    sendJSONResponse(res, 409, { error: 'Este email já está em uso.' });
                } else {
                    const hashedPassword = await bcrypt.hash(senha, 10);
                    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
                    const newUser = { id: newId, nome, email, senha: hashedPassword };
                    users.push(newUser);
                    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
                    sendJSONResponse(res, 201, { message: 'Usuário registrado com sucesso!' });
                }
            }
        } else if (pathname.startsWith('/horarios-disponiveis') && req.method === 'GET') {
            const { profissional_id, data } = parsedUrl.query;
            if (!profissional_id || !data) {
                sendJSONResponse(res, 400, { error: 'profissional_id e data são obrigatórios.' });
            } else {
                try {
                    const horarios = await listarHorariosDisponiveis(profissional_id, data);
                    sendJSONResponse(res, 200, horarios);
                } catch (error) {
                    console.error('Erro ao listar horários:', error);
                    sendJSONResponse(res, 500, { error: 'Erro interno ao buscar horários.' });
                }
            }
        } else if (pathname.startsWith('/agendamentos') && req.method === 'POST') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                sendJSONResponse(res, 401, { error: 'Token de autenticação não fornecido.' });
            } else {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const userId = decoded.id;
                    const agendamentoData = await getJSONBody(req);
                    const newAgendamento = await criarAgendamento({ ...agendamentoData, userId });
                    sendJSONResponse(res, 201, newAgendamento);
                } catch (error) {
                    if (error instanceof jwt.JsonWebTokenError) {
                        sendJSONResponse(res, 401, { error: 'Token inválido ou expirado.' });
                    } else {
                        const statusCode = error.statusCode || 500;
                        const message = error.statusCode ? error.message : 'Erro interno ao criar agendamento.';
                        console.error('Erro ao criar agendamento:', error);
                        sendJSONResponse(res, statusCode, { error: message });
                    }
                }
            }
        } else {
            // --- Servir Arquivos Estáticos se nenhuma rota da API corresponder ---
            await serveStaticFile(req, res);
        }
    } catch (error) {
        console.error('Erro não tratado na requisição:', error);
        if (!res.headersSent) {
            const message = error === 'Invalid JSON' ? 'Corpo da requisição não é um JSON válido.' : 'Erro Interno do Servidor';
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
