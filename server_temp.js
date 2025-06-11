const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { criarAgendamento, listarHorariosDisponiveis } = require('./agendamento.js');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-para-desenvolvimento';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---

// POST /login - Autenticação de usuário
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }
        const usersData = await fs.readFile(USERS_FILE, 'utf-8');
        const users = JSON.parse(usersData);
        const user = users.find(u => u.email === email);
        if (!user || !await bcrypt.compare(password, user.senha)) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }
        const token = jwt.sign({ id: user.id, email: user.email, nome: user.nome }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login bem-sucedido!', token });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// POST /register - Registro de novo usuário
app.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }
        const usersData = await fs.readFile(USERS_FILE, 'utf-8');
        const users = JSON.parse(usersData);
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: 'Este email já está em uso.' });
        }
        const hashedPassword = await bcrypt.hash(senha, 10);
        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const newUser = { id: newId, nome, email, senha: hashedPassword };
        users.push(newUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// GET /horarios-disponiveis - Lista horários disponíveis para um profissional em uma data
app.get('/horarios-disponiveis', async (req, res) => {
    try {
        const { profissional_id, data } = req.query;
        if (!profissional_id || !data) {
            return res.status(400).json({ error: 'profissional_id e data são obrigatórios.' });
        }
        const horarios = await listarHorariosDisponiveis(profissional_id, data);
        res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao listar horários:', error);
        res.status(500).json({ error: 'Erro interno ao buscar horários.' });
    }
});

// POST /agendamentos - Cria um novo agendamento
app.post('/agendamentos', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        const agendamentoData = { ...req.body, userId };
        const newAgendamento = await criarAgendamento(agendamentoData);
        res.status(201).json(newAgendamento);
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token inválido ou expirado.' });
        }
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro interno ao criar agendamento.' });
    }
});

// --- Servir Arquivos Estáticos ---
app.use(express.static(__dirname));

// --- Rota Catch-all para SPA ---
// Deve vir depois das rotas da API e do middleware de arquivos estáticos
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- Inicialização do Servidor ---
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
