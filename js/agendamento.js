const fs = require('fs').promises;
const path = require('path');

const AGENDAMENTOS_FILE = path.join(__dirname, 'data', 'agendamentos.json');

// Função para ler os agendamentos do arquivo JSON
async function lerAgendamentos() {
    try {
        const data = await fs.readFile(AGENDAMENTOS_FILE, 'utf8');
        // Se o arquivo estiver vazio, retorna um array vazio
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir, cria um e retorna um array vazio
        if (error.code === 'ENOENT') {
            await fs.writeFile(AGENDAMENTOS_FILE, '[]', 'utf8');
            return [];
        }
        // Para outros erros, relança
        console.error("Erro ao ler o arquivo de agendamentos:", error);
        throw error;
    }
}

// Função para escrever os agendamentos no arquivo JSON
async function escreverAgendamentos(agendamentos) {
    try {
        await fs.writeFile(AGENDAMENTOS_FILE, JSON.stringify(agendamentos, null, 2));
    } catch (error) {
        console.error("Erro ao escrever no arquivo de agendamentos:", error);
        throw error;
    }
}

// Função para listar os horários disponíveis
async function listarHorariosDisponiveis(profissional_id, data) {
    // Define todos os horários de trabalho possíveis
    const todosOsHorarios = [
        '09:00', '10:00', '11:00', '12:00',
        '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    const agendamentos = await lerAgendamentos();

    // Filtra os horários já agendados para o profissional e a data especificados
    const horariosAgendados = agendamentos
        .filter(ag => ag.profissional_id === profissional_id && ag.data === data)
        .map(ag => ag.hora);

    // Retorna apenas os horários que não estão na lista de agendados
    const horariosDisponiveis = todosOsHorarios.filter(h => !horariosAgendados.includes(h));

    return horariosDisponiveis;
}

// Função para criar um novo agendamento
async function criarAgendamento(novoAgendamento) {
    if (!novoAgendamento.profissional_id || !novoAgendamento.data || !novoAgendamento.hora || !novoAgendamento.servico || !novoAgendamento.userId) {
        const error = new Error('Todos os campos são obrigatórios para o agendamento.');
        error.statusCode = 400;
        throw error;
    }

    const agendamentos = await lerAgendamentos();

    // Verifica se o horário já está ocupado
    const horarioOcupado = agendamentos.some(
        ag => ag.profissional_id === novoAgendamento.profissional_id &&
              ag.data === novoAgendamento.data &&
              ag.hora === novoAgendamento.hora
    );

    if (horarioOcupado) {
        const error = new Error('Este horário já está agendado.');
        error.statusCode = 409; // 409 Conflict
        throw error;
    }

    // Adiciona o novo agendamento
    const id = agendamentos.length > 0 ? Math.max(...agendamentos.map(a => a.id)) + 1 : 1;
    const agendamentoParaSalvar = { id, ...novoAgendamento };
    agendamentos.push(agendamentoParaSalvar);

    await escreverAgendamentos(agendamentos);

    return agendamentoParaSalvar;
}

module.exports = {
    criarAgendamento,
    listarHorariosDisponiveis
};