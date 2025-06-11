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

    let horarioSelecionado = null;

    /**
     * Decodifica o token JWT para obter os dados do usuário.
     * @returns {object|null} - O payload do token ou null se o token for inválido.
     */
    const getCurrentUser = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return null;
        }
        try {
            // O payload é a segunda parte do token, decodificada de Base64
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (e) {
            console.error('Erro ao decodificar o token:', e);
            localStorage.removeItem('token'); // Token inválido, remove
            return null;
        }
    };

    // Preenche o e-mail se o usuário estiver logado
    const user = getCurrentUser();
    if (user && user.email) {
        emailInput.value = user.email;
        emailInput.disabled = true;
    }

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
            const response = await fetch(`http://localhost:3001/horarios-disponiveis?profissional_id=${profissionalId}&data=${data}`);
            
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
            btn.textContent = horario;
            btn.dataset.horario = horario;
            horariosContainer.appendChild(btn);
        });
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
            // Opcional: redirecionar para a página de login
            // window.location.href = '/login.html';
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
            const response = await fetch('http://localhost:3001/agendamentos', {
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
            console.error('Erro no agendamento:', error);
            exibirFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = true; // Mantém desabilitado até nova seleção
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
        feedbackMessage.className = type;
        setTimeout(() => {
            feedbackMessage.className = 'hidden';
        }, 5000);
    };

    /**
      * Habilita ou desabilita o botão de submit com base no estado do formulário.
      */
    const atualizarEstadoBotao = () => {
        const formValido = profissionalSelect.value && dataInput.value && servicoSelect.value && horarioSelecionado && emailInput.value;
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

    // Lida com o envio do formulário.
    form.addEventListener('submit', handleAgendamentoSubmit);

    // Define a data mínima para o input de data como hoje.
    dataInput.min = new Date().toISOString().split('T')[0];
});
