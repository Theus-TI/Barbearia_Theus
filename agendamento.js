const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const DATA_DIR = path.join(__dirname, 'data');
const AGENDAMENTOS_FILE = path.join(DATA_DIR, 'agendamentos.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Função para ler os dados do arquivo JSON
async function readData(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return []; // Retorna array vazio se o arquivo não existir
        throw error;
    }
}

// Função para escrever os dados no arquivo JSON
async function writeData(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Função para criar um novo agendamento (ROUTE HANDLER)
async function criarAgendamento(dadosAgendamento, userId) {
    console.log('\n--- Nova Requisição de Agendamento Recebida ---');
    try {


        // 2. Obter dados do corpo da requisição
        const { profissional_id, servico_id, data, hora, observacao } = dadosAgendamento;
        console.log('Dados do agendamento recebidos:', JSON.stringify(dadosAgendamento, null, 2));

        if (!profissional_id || !servico_id || !data || !hora) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Dados incompletos para o agendamento.' }));
        }

        // 3. Ler agendamentos existentes e criar novo agendamento
        const agendamentos = await readData(AGENDAMENTOS_FILE);
        const newId = agendamentos.length > 0 ? Math.max(...agendamentos.map(a => a.id)) + 1 : 1;

        const newAgendamento = {
            id: newId,
            usuario_id: userId,
            profissional_id: parseInt(profissional_id),
            servico_id: parseInt(servico_id),
            data_agendamento: `${data} ${hora}`,
            observacao: observacao || '',
            status: 'agendado',
            criado_em: new Date().toISOString()
        };

        // 4. Salvar o novo agendamento
        agendamentos.push(newAgendamento);
        await writeData(AGENDAMENTOS_FILE, agendamentos);
        console.log('Agendamento salvo com sucesso no arquivo JSON.');

        // 5. Retornar sucesso
        return { success: true, message: 'Agendamento criado com sucesso!', agendamento: newAgendamento };

    } catch (error) {
        console.error('ERRO DETALHADO AO CRIAR AGENDAMENTO:', error);
        
        // Propaga o erro para ser tratado pelo handler de rota no index.js
        throw error;
    }
}


// Função para listar agendamentos de um usuário
async function listarAgendamentos(usuario_id) {
    const agendamentos = await readData(AGENDAMENTOS_FILE);
    return agendamentos.filter(a => a.usuario_id == usuario_id);
}

// Função para cancelar um agendamento
async function cancelarAgendamento(agendamento_id) {
    const agendamentos = await readData(AGENDAMENTOS_FILE);
    const index = agendamentos.findIndex(a => a.id == agendamento_id);

    if (index === -1) {
        throw new Error('Agendamento não encontrado.');
    }

    agendamentos[index].status = 'cancelado';
    agendamentos[index].atualizado_em = new Date().toISOString();

    await writeData(AGENDAMENTOS_FILE, agendamentos);
    return { success: true, message: 'Agendamento cancelado com sucesso' };
}

// Função para listar horários disponíveis
async function listarHorariosDisponiveis(data) {
    const horariosTrabalho = [
        '09:00:00', '10:00:00', '11:00:00',
        '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'
    ];

    const agendamentos = await readData(AGENDAMENTOS_FILE);
    const agendamentosNaData = agendamentos.filter(a => 
        a.data_agendamento.startsWith(data) && a.status === 'agendado'
    );

    const horariosOcupados = agendamentosNaData.map(a => a.data_agendamento.split(' ')[1]);
    const horariosDisponiveis = horariosTrabalho.filter(h => !horariosOcupados.includes(h));

    return horariosDisponiveis;
}

module.exports = {
    criarAgendamento,
    listarAgendamentos,
    cancelarAgendamento,
    listarHorariosDisponiveis
};
