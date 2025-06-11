const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do CORS
app.use(cors());

// Servindo arquivos estáticos
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para serviços
app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para equipe
app.get('/team', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para agendamento
app.get('/agendamento', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para cadastro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
