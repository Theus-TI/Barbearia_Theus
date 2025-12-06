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
    await fs.mkdir(path.dirname(filePath), { recursive: true });
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
            const err = new Error('Dados incompletos para o agendamento.');
            err.statusCode = 400;
            throw err;
        }

        // 3. Ler agendamentos existentes e criar novo agendamento
        const agendamentos = await readData(AGENDAMENTOS_FILE);

        // 3.1 Validar formato de data e hora
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegexShort = /^\d{2}:\d{2}$/;
        const timeRegexLong = /^\d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(data)) {
            const err = new Error('Formato de data inválido. Use YYYY-MM-DD.');
            err.statusCode = 400;
            throw err;
        }
        if (!timeRegexShort.test(hora) && !timeRegexLong.test(hora)) {
            const err = new Error('Formato de hora inválido. Use HH:mm ou HH:mm:ss.');
            err.statusCode = 400;
            throw err;
        }
        const horaNormalizada = timeRegexShort.test(hora) ? `${hora}:00` : hora;

        const dateTime = `${data} ${horaNormalizada}`;
        const conflict = agendamentos.some(a => a.profissional_id === parseInt(profissional_id) && a.data_agendamento === dateTime && a.status === 'agendado');
        if (conflict) {
            const err = new Error('Horário indisponível para este profissional.');
            err.statusCode = 409;
            throw err;
        }
        const newId = agendamentos.length > 0 ? Math.max(...agendamentos.map(a => a.id)) + 1 : 1;

        const newAgendamento = {
            id: newId,
            usuario_id: userId,
            profissional_id: parseInt(profissional_id),
            servico_id: parseInt(servico_id),
            data_agendamento: dateTime,
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
async function cancelarAgendamento(agendamento_id, userId) {
    const agendamentos = await readData(AGENDAMENTOS_FILE);
    const index = agendamentos.findIndex(a => a.id == agendamento_id);

    if (index === -1) {
        throw new Error('Agendamento não encontrado.');
    }

    if (userId && agendamentos[index].usuario_id != userId) {
        const err = new Error('Não autorizado a cancelar este agendamento.');
        err.statusCode = 403;
        throw err;
    }

    agendamentos[index].status = 'cancelado';
    agendamentos[index].atualizado_em = new Date().toISOString();

    await writeData(AGENDAMENTOS_FILE, agendamentos);
    return { success: true, message: 'Agendamento cancelado com sucesso' };
}

// Função para listar horários disponíveis
async function listarHorariosDisponiveis(data, profissional_id) {
    const horariosTrabalho = [
        '09:00:00', '10:00:00', '11:00:00',
        '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'
    ];

    const agendamentos = await readData(AGENDAMENTOS_FILE);
    const agendamentosNaData = agendamentos.filter(a => 
        a.data_agendamento.startsWith(data) && a.status === 'agendado' && (!profissional_id || a.profissional_id === parseInt(profissional_id))
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
