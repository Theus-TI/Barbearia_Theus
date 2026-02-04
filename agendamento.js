const { supabase } = require('./supabaseClient');

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
        const { data: existing, error: existingError } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('profissional_id', parseInt(profissional_id))
            .eq('data_agendamento', dateTime)
            .eq('status', 'agendado')
            .limit(1);
        if (existingError) {
            const err = new Error(existingError.message || 'Erro ao validar horário.');
            err.statusCode = 500;
            throw err;
        }
        if (existing && existing.length > 0) {
            const err = new Error('Horário indisponível para este profissional.');
            err.statusCode = 409;
            throw err;
        }

        const { data: created, error: insertError } = await supabase
            .from('agendamentos')
            .insert({
                usuario_id: userId,
                profissional_id: parseInt(profissional_id),
                servico_id: parseInt(servico_id),
                data_agendamento: dateTime,
                observacao: observacao || '',
                status: 'agendado'
            })
            .select('*')
            .single();
        if (insertError) {
            const err = new Error(insertError.message || 'Erro ao salvar agendamento.');
            err.statusCode = 500;
            throw err;
        }
        console.log('Agendamento salvo com sucesso na Supabase.');

        return { success: true, message: 'Agendamento criado com sucesso!', agendamento: created };

    } catch (error) {
        console.error('ERRO DETALHADO AO CRIAR AGENDAMENTO:', error);
        
        // Propaga o erro para ser tratado pelo handler de rota no index.js
        throw error;
    }
}


// Função para listar agendamentos de um usuário
async function listarAgendamentos(usuario_id) {
    const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('usuario_id', usuario_id)
        .order('data_agendamento', { ascending: true });
    if (error) {
        throw new Error(error.message || 'Erro ao listar agendamentos.');
    }
    return data || [];
}

// Função para cancelar um agendamento
async function cancelarAgendamento(agendamento_id, userId) {
    const { data: agendamento, error: findError } = await supabase
        .from('agendamentos')
        .select('id, usuario_id')
        .eq('id', agendamento_id)
        .single();
    if (findError || !agendamento) {
        throw new Error('Agendamento não encontrado.');
    }
    if (userId && String(agendamento.usuario_id) !== String(userId)) {
        const err = new Error('Não autorizado a cancelar este agendamento.');
        err.statusCode = 403;
        throw err;
    }

    const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
        .eq('id', agendamento_id);
    if (updateError) {
        throw new Error(updateError.message || 'Erro ao cancelar agendamento.');
    }
    return { success: true, message: 'Agendamento cancelado com sucesso' };
}

// Função para listar horários disponíveis
async function listarHorariosDisponiveis(data, profissional_id) {
    const horariosTrabalho = [
        '09:00:00', '10:00:00', '11:00:00',
        '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'
    ];

    let query = supabase
        .from('agendamentos')
        .select('data_agendamento')
        .eq('status', 'agendado')
        .gte('data_agendamento', `${data} 00:00:00`)
        .lte('data_agendamento', `${data} 23:59:59`);
    if (profissional_id) {
        query = query.eq('profissional_id', parseInt(profissional_id));
    }
    const { data: agendamentosNaData, error } = await query;
    if (error) {
        throw new Error(error.message || 'Erro ao listar horários disponíveis.');
    }

    const horariosOcupados = (agendamentosNaData || []).map(a => a.data_agendamento.split(' ')[1]);
    const horariosDisponiveis = horariosTrabalho.filter(h => !horariosOcupados.includes(h));

    return horariosDisponiveis;
}

module.exports = {
    criarAgendamento,
    listarAgendamentos,
    cancelarAgendamento,
    listarHorariosDisponiveis
};
