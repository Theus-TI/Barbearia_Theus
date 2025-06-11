// Função para criar a grade de horários
function criarGradeHorarios() {
    const horariosContainer = document.getElementById('horarios-container');
    if (!horariosContainer) return;

    // Limpa o container existente
    horariosContainer.innerHTML = '';

    // Cria uma tabela para os horários
    const tabela = document.createElement('div');
    tabela.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

    // Define os horários disponíveis (8h às 20h)
    const horarios = [];
    for (let hora = 8; hora <= 20; hora++) {
        // Formata o horário com AM/PM
        const hora12h = hora % 12 || 12;
        const periodo = hora >= 12 ? 'PM' : 'AM';
        const horario = `${hora12h}h ${periodo}`;
        horarios.push({
            display: horario,
            value: `${hora.toString().padStart(2, '0')}:00`
        });
    }

    // Cria os botões de horário
    horarios.forEach(horario => {
        const button = document.createElement('button');
        button.className = 'horario-button w-full py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center';
        button.textContent = horario.display;
        button.addEventListener('click', () => selecionarHorario(horario.value));
        
        // Adiciona classes CSS para diferentes períodos do dia
        if (horario.display.includes('AM')) {
            button.classList.add('bg-blue-50', 'hover:bg-blue-100');
        } else {
            button.classList.add('bg-green-50', 'hover:bg-green-100');
        }

        tabela.appendChild(button);
    });

    horariosContainer.appendChild(tabela);
}

// Função para selecionar um horário
function selecionarHorario(horario) {
    const botaoSelecionado = document.querySelector('.horario-button.selected');
    if (botaoSelecionado) {
        botaoSelecionado.classList.remove('selected');
    }

    const botao = document.querySelector(`button[data-value='${horario}']`);
    if (botao) {
        botao.classList.add('selected');
        document.getElementById('horario-input').value = horario;
        
        // Atualiza a cor do botão selecionado
        const periodo = horario.includes('AM') ? 'bg-blue-500' : 'bg-green-500';
        botao.classList.add(periodo);
    }
}

// Função para formatar a data
function formatarData(data) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(data).toLocaleDateString('pt-BR', options);
}

// Função para formatar o horário
function formatarHorario(horario) {
    const [hora, minuto] = horario.split(':');
    const horaInt = parseInt(hora);
    const periodo = horaInt >= 12 ? 'PM' : 'AM';
    const hora12h = horaInt % 12 || 12;
    return `${hora12h}:${minuto} ${periodo}`;
}

// Função para agendar horário
async function agendarHorario() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const data = document.getElementById('data').value;
    const horario = document.getElementById('horario-input').value;
    const servico = document.getElementById('servico').value;
    const profissional = document.getElementById('profissional').value;

    if (!nome || !email || !telefone || !data || !horario || !servico || !profissional) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/agendamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome,
                email,
                telefone,
                data,
                horario,
                servico,
                profissional
            })
        });

        const dataFormatada = formatarData(data);
        const horarioFormatado = formatarHorario(horario);

        if (response.ok) {
            alert(`Agendamento realizado com sucesso!\n\nDetalhes:\nData: ${dataFormatada}\nHorário: ${horarioFormatado}\nServiço: ${servico}\nProfissional: ${profissional}`);
            // Limpa os campos
            document.getElementById('nome').value = '';
            document.getElementById('email').value = '';
            document.getElementById('telefone').value = '';
            document.getElementById('data').value = '';
            document.getElementById('horario-input').value = '';
            document.getElementById('servico').value = '';
            document.getElementById('profissional').value = '';
        } else {
            alert('Erro ao agendar horário. Por favor, tente novamente.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao agendar horário. Por favor, tente novamente.');
    }
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
    criarGradeHorarios();
    
    // Adiciona evento para o botão de agendamento
    const agendarButton = document.getElementById('agendar-button');
    if (agendarButton) {
        agendarButton.addEventListener('click', agendarHorario);
    }
});
