document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const form = document.getElementById('form-agendamento');
    const profissionalSelect = document.getElementById('profissional');
    const dataInput = document.getElementById('data');
    const horariosContainer = document.getElementById('horarios-disponiveis');
    const servicoSelect = document.getElementById('servico');
    const emailInput = document.getElementById('email');
    const observacaoInput = document.getElementById('observacao');
    const feedbackMessage = document.getElementById('feedback-message');
    const submitButton = document.getElementById('btn-agendar');
    const listaAgendamentosEl = document.getElementById('lista-agendamentos');

    let horarioSelecionado = null;

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Busca horários disponíveis no backend e os renderiza na tela.
     */
    const buscarErenderizarHorarios = async () => {
        const profissionalId = profissionalSelect.value;
        const data = dataInput.value;

        if (!profissionalId || !data) {
            horariosContainer.innerHTML = '<p class="placeholder">Selecione um profissional e uma data para ver os horários.</p>';
            return;
        }

        horariosContainer.innerHTML = '<p class="placeholder">Buscando horários...</p>';

        try {
            const response = await fetch(`/api/horarios-disponiveis?profissional_id=${profissionalId}&data=${data}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Não foi possível buscar os horários.');
            }

            const horarios = await response.json();
            renderizarHorarios(horarios);

        } catch (error) {
            console.error('Erro ao buscar horários:', error);
            horariosContainer.innerHTML = `<p class="placeholder error">${error.message}</p>`;
        }
    };

    /**
     * Renderiza os botões de horário na tela.
     * @param {string[]} horarios - Array de horários disponíveis (ex: ['09:00', '10:00']).
     */
    const renderizarHorarios = (horarios) => {
        horariosContainer.innerHTML = ''; // Limpa o container

        if (horarios.length === 0) {
            horariosContainer.innerHTML = '<p class="placeholder">Nenhum horário disponível para esta data.</p>';
            return;
        }

        horarios.forEach(horario => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'horario-btn';
            const label = (typeof horario === 'string' && horario.length >= 5) ? horario.slice(0,5) : horario;
            btn.textContent = label;
            btn.dataset.horario = horario; // mantém o valor completo (ex: 09:00:00)
            horariosContainer.appendChild(btn);
        });
    };

    const getUserIdFromToken = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        try {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload.id;
        } catch (e) {
            return null;
        }
    };

    const renderizarAgendamentos = (agendamentos) => {
        if (!listaAgendamentosEl) return;
        if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
            listaAgendamentosEl.innerHTML = '<p class="text-gray-400 text-sm">Nenhum agendamento encontrado.</p>';
            return;
        }
        listaAgendamentosEl.innerHTML = agendamentos.map(a => {
            const [d, t] = String(a.data_agendamento || '').split(' ');
            const hora = (t || '').slice(0,5);
            const status = a.status || '';
            return `
                <div class="flex items-center justify-between bg-gray-900/60 border border-gray-800 p-3 rounded">
                    <div>
                        <div class="text-white text-sm font-semibold">${d || ''} ${hora || ''}</div>
                        <div class="text-gray-400 text-xs">Profissional ${a.profissional_id} • Serviço ${a.servico_id} • Status: ${status}</div>
                    </div>
                    ${status === 'agendado' ? `<button class="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white" data-action="cancelar" data-id="${a.id}">Cancelar</button>` : ''}
                </div>
            `;
        }).join('');
    };

    const carregarAgendamentos = async () => {
        if (!listaAgendamentosEl) return;
        const token = localStorage.getItem('token');
        const userId = getUserIdFromToken();
        if (!token || !userId) {
            listaAgendamentosEl.innerHTML = '<p class="text-gray-400 text-sm">Faça login para ver seus agendamentos.</p>';
            return;
        }
        listaAgendamentosEl.innerHTML = '<p class="text-gray-400 text-sm">Carregando...</p>';
        try {
            const resp = await fetch(`/api/agendamentos/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Erro ao buscar agendamentos.');
            renderizarAgendamentos(data);
        } catch (e) {
            listaAgendamentosEl.innerHTML = `<p class="text-red-500 text-sm">${e.message}</p>`;
        }
    };

    const cancelarAgendamento = async (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            exibirFeedback('Você precisa estar logado.', 'error');
            return;
        }
        try {
            const resp = await fetch(`/api/agendamentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Erro ao cancelar.');
            exibirFeedback('Agendamento cancelado.', 'success');
            carregarAgendamentos();
        } catch (e) {
            exibirFeedback(e.message, 'error');
        }
    };

    /**
     * Lida com o envio do formulário de agendamento.
     * @param {Event} e - O evento de submit do formulário.
     */
    const handleAgendamentoSubmit = async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Agendando...';

        const token = localStorage.getItem('token');
        if (!token) {
            exibirFeedback('Você precisa estar logado para agendar.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Confirmar Agendamento';
            return;
        }

        const agendamento = {
            profissional_id: profissionalSelect.value,
            servico_id: servicoSelect.value,
            data: dataInput.value,
            hora: horarioSelecionado,
            observacao: observacaoInput.value
        };

        try {
            const response = await fetch('/api/agendamento', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(agendamento),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocorreu um erro ao agendar.');
            }

            exibirFeedback('Agendamento confirmado com sucesso! ✅ Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            exibirFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = true;
            submitButton.textContent = 'Confirmar Agendamento';
        }
    };

    /**
     * Exibe uma mensagem de feedback para o usuário.
     * @param {string} message - A mensagem a ser exibida.
     * @param {'success' | 'error'} type - O tipo da mensagem.
     */
    const exibirFeedback = (message, type) => {
        feedbackMessage.textContent = message;
        feedbackMessage.className = `feedback ${type}`; // garante manter a classe base
        setTimeout(() => {
            feedbackMessage.className = 'hidden';
        }, 5000);
    };

    /**
      * Habilita ou desabilita o botão de submit com base no estado do formulário.
      */
    const atualizarEstadoBotao = () => {
        const formValido = profissionalSelect.value && dataInput.value && servicoSelect.value && horarioSelecionado;
        submitButton.disabled = !formValido;
    };

    // --- EVENT LISTENERS ---

    // Busca horários quando o profissional ou a data mudam.
    profissionalSelect.addEventListener('change', buscarErenderizarHorarios);
    dataInput.addEventListener('change', buscarErenderizarHorarios);

    // Lida com a seleção de um horário.
    horariosContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('horario-btn')) {
            // Remove a seleção de outros botões
            document.querySelectorAll('.horario-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            // Adiciona a seleção ao botão clicado
            target.classList.add('selected');
            horarioSelecionado = target.dataset.horario;
            atualizarEstadoBotao();
        }
    });

    // Atualiza o estado do botão de submit em qualquer mudança no formulário.
    form.addEventListener('input', atualizarEstadoBotao);

    if (listaAgendamentosEl) {
        listaAgendamentosEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="cancelar"]');
            if (btn) {
                const id = btn.dataset.id;
                if (id) cancelarAgendamento(id);
            }
        });
    }

    // Lida com o envio do formulário.
    form.addEventListener('submit', handleAgendamentoSubmit);

    // Define a data mínima para o input de data como hoje.
    dataInput.min = new Date().toISOString().split('T')[0];
    carregarAgendamentos();
});
