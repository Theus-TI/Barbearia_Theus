const mysql = require('mysql2/promise');
const dbConfig = require('./config/database.js');

// Conexão com o banco de dados
let connection;

async function connectToDatabase() {
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao banco de dados com sucesso!');
        
        // Testar a conexão fazendo uma consulta simples
        const [rows] = await connection.execute('SELECT 1 + 1 AS resultado');
        console.log('✅ Teste de conexão bem-sucedido:', rows[0].resultado);
    } catch (error) {
        console.error('❌ Erro ao conectar ao banco de dados:', error.message);
        throw error;
    }
}

// Inicializar a conexão com o banco de dados
connectToDatabase().catch(console.error);

async function connectToDatabase() {
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado ao banco de dados');
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        throw error;
    }
}

// Função para agendar um horário
async function agendarHorario(dados) {
    try {
        // Verificar se os dados são válidos
        const { usuario_id, profissional_id, servico_id, data_agendamento, observacao } = dados;
        
        if (!usuario_id || !profissional_id || !servico_id || !data_agendamento) {
            throw new Error('Dados obrigatórios não fornecidos');
        }

        // Verificar se o horário está disponível
        const [existingAppointments] = await connection.execute(
            'SELECT COUNT(*) as count FROM agendamentos WHERE profissional_id = ? AND DATE(data_agendamento) = ?',
            [profissional_id, data_agendamento]
        );

        if (existingAppointments[0].count >= 8) { // Limitando a 8 agendamentos por dia
            throw new Error('Horário indisponível');
        }

        // Inserir o novo agendamento
        const [result] = await connection.execute(
            'INSERT INTO agendamentos (usuario_id, profissional_id, servico_id, data_agendamento, observacao) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, profissional_id, servico_id, data_agendamento, observacao]
        );

        return { id: result.insertId, ...dados };
    } catch (error) {
        console.error('Erro ao agendar horário:', error);
        throw error;
    }
}

// Função para listar agendamentos
async function listarAgendamentos(usuario_id) {
    try {
        const [agendamentos] = await connection.execute(
            'SELECT a.*, s.nome as servico_nome, p.especialidade, u.nome as profissional_nome FROM agendamentos a ' +
            'JOIN servicos s ON a.servico_id = s.id ' +
            'JOIN profissionais p ON a.profissional_id = p.id ' +
            'JOIN usuarios u ON p.usuario_id = u.id ' +
            'WHERE a.usuario_id = ? ORDER BY a.data_agendamento',
            [usuario_id]
        );

        return agendamentos;
    } catch (error) {
        console.error('Erro ao listar agendamentos:', error);
        throw error;
    }
}

// Função para cancelar agendamento
async function cancelarAgendamento(id, usuario_id) {
    try {
        const [result] = await connection.execute(
            'UPDATE agendamentos SET status = "cancelado", atualizado_em = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?',
            [id, usuario_id]
        );

        if (result.affectedRows === 0) {
            throw new Error('Agendamento não encontrado ou não pertence ao usuário');
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        throw error;
    }
}

module.exports = {
    connectToDatabase,
    agendarHorario,
    listarAgendamentos,
    cancelarAgendamento
};
