// Função para formatar data
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

// Função para formatar hora
function formatTime(time) {
    return time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Função para verificar disponibilidade
document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('datePicker');
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    
    // Configuração inicial do date picker
    const today = new Date();
    datePicker.min = today.toISOString().split('T')[0];
    
    // Função para atualizar os horários disponíveis
    function updateAvailableTimes() {
        const selectedDate = new Date(datePicker.value);
        const dayOfWeek = selectedDate.getDay();
        
        // Limpa os horários anteriores
        timeSlotsContainer.innerHTML = '';
        
        // Define horários disponíveis
        const availableTimes = [
            { time: '09:00', available: true },
            { time: '10:00', available: true },
            { time: '11:00', available: true },
            { time: '14:00', available: true },
            { time: '15:00', available: true },
            { time: '16:00', available: true },
            { time: '17:00', available: true }
        ];
        
        // Cria os botões de horários
        availableTimes.forEach(time => {
           // Função para alternar tema
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Atualizar tema
    html.dataset.theme = newTheme;
    
    // Atualizar ícone do tema
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('svg');
        if (newTheme === 'dark') {
            icon.setAttribute('class', 'w-5 h-5');
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            `;
            themeToggle.classList.remove('sun-mode');
            themeToggle.classList.add('dark-mode');
        } else {
            icon.setAttribute('class', 'w-5 h-5');
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707"/>
            `;
            themeToggle.classList.remove('dark-mode');
            themeToggle.classList.add('sun-mode');
        }
    }

    // Salvar preferência no localStorage
    localStorage.setItem('theme', newTheme);
}

// Carregar tema salvo
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = savedTheme;
});

// Função para mostrar mensagem
function showMessage(type, message) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message message-${type} animate__animated animate__fadeIn`;
    messageContainer.textContent = message;

    const messagesContainer = document.querySelector('.messages');
    if (!messagesContainer) {
        const form = document.getElementById('scheduleForm');
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'messages';
        form.insertBefore(messagesContainer, form.firstChild);
    }

    messagesContainer.appendChild(messageContainer);

    // Remover mensagem após 3 segundos
    setTimeout(() => {
        messageContainer.classList.add('animate__fadeOut');
        setTimeout(() => {
            messageContainer.remove();
        }, 500);
    }, 3000);
}

// Função para atualizar horários disponíveis
function updateAvailableTimes() {
    // Simulação de horários disponíveis
    const availableTimes = [
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: true },
        { time: '13:00', available: true },
        { time: '14:00', available: true },
        { time: '15:00', available: true },
        { time: '16:00', available: true },
        { time: '17:00', available: true }
    ];

    const timeSelect = document.getElementById('timeSelect');
    timeSelect.innerHTML = '<option value="">Selecione um horário</option>';

    availableTimes.forEach(time => {
        const option = document.createElement('option');
        option.value = time.time;
        option.textContent = time.time;
        option.classList.add('hover-shake');
        timeSelect.appendChild(option);
    });
}

// Função para agendar serviço
function scheduleService() {
    const formData = new FormData(document.getElementById('scheduleForm'));
    const data = Object.fromEntries(formData.entries());

    if (!data.name || !data.phone || !data.date || !data.time || !data.service || !data.professional) {
        showMessage('message-error', 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // Simular envio de dados
    const loadingSpinner = document.querySelector('.loading-spinner');
    loadingSpinner.style.display = 'block';

    setTimeout(() => {
        loadingSpinner.style.display = 'none';
        const confirmationModal = document.getElementById('confirmationModal');
        const selectedServiceText = document.getElementById('selectedServiceText');
        const selectedProfText = document.getElementById('selectedProfText');
        const selectedDateTimeSpan = document.getElementById('selectedDateTimeSpan');

        selectedServiceText.textContent = data.service;
        selectedProfText.textContent = data.professional;
        selectedDateTimeSpan.textContent = `${formatDate(new Date(data.date))} às ${data.time}`;

        showConfirmationModal();
        document.getElementById('scheduleForm').reset();
    }, 1500);
}

// Função para scroll suave
function smoothScroll(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Adicionar evento de clique nos links da navbar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.getAttribute('href');
        smoothScroll(target);
    });
});

// Função para ajustar o menu mobile
function toggleMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menuLinks = document.querySelector('.nav-links');
    
    if (menuBtn && menuLinks) {
        menuBtn.addEventListener('click', () => {
            menuLinks.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
    }
}

// Função para melhorar a experiência mobile
function enhanceMobileExperience() {
    // Ajustar o menu mobile
    toggleMobileMenu();
    
    // Ajustar o comportamento dos selects em mobile
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('focus', () => {
            select.classList.add('mobile-focused');
        });
        
        select.addEventListener('blur', () => {
            select.classList.remove('mobile-focused');
        });
    });
    
    // Ajustar o comportamento dos inputs em mobile
    const inputs = document.querySelectorAll('input[type="text"], input[type="date"]');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.classList.add('mobile-focused');
        });
        
        input.addEventListener('blur', () => {
            input.classList.remove('mobile-focused');
        });
    });
}

// Inicializar melhorias mobile
document.addEventListener('DOMContentLoaded', () => {
    enhanceMobileExperience();
    
    // Adicionar evento para o botão de limpar
    const resetButton = document.getElementById('resetForm');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Limpar todos os campos
            document.getElementById('service').value = '';
            document.getElementById('professional').value = '';
            document.getElementById('date').value = '';
            document.getElementById('time').value = '';
            
            // Resetar os horários disponíveis
            const timeSelect = document.getElementById('time');
            if (timeSelect) {
                timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
            }
            
            // Resetar a data para hoje
            const dateInput = document.getElementById('date');
            if (dateInput) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                dateInput.value = `${year}-${month}-${day}`;
            }
        });
    }
});

// Função para obter horários disponíveis
function getAvailableTimes(date) {
    // Horários disponíveis das 9h às 18h
    const availableTimes = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            availableTimes.push(time);
        }
    }
    
    return availableTimes;
}

// Função para atualizar os horários disponíveis
function updateAvailableTimes() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    
    if (!dateInput || !timeSelect) return;
    
    // Limpar horários anteriores
    timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
    
    // Verificar se uma data foi selecionada
    if (dateInput.value) {
        const selectedDate = new Date(dateInput.value);
        const today = new Date();
        
        // Se a data selecionada é hoje, mostrar apenas horários futuros
        if (selectedDate.toDateString() === today.toDateString()) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            const availableTimes = getAvailableTimes(dateInput.value);
            
            // Filtrar horários que já passaram
            const futureTimes = availableTimes.filter(time => {
                const [hour, minute] = time.split(':').map(Number);
                return hour > currentHour || (hour === currentHour && minute >= currentMinute);
            });
            
            // Adicionar horários disponíveis
            futureTimes.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        } else {
            // Para datas futuras, mostrar todos os horários disponíveis
            const availableTimes = getAvailableTimes(dateInput.value);
            availableTimes.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        }
    }
}

// Adicionar evento de mudança na data
document.getElementById('date').addEventListener('change', updateAvailableTimes);

// Configurar a data mínima como hoje
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        dateInput.min = `${year}-${month}-${day}`;
        dateInput.value = `${year}-${month}-${day}`;
        
        // Atualizar horários disponíveis quando a página carregar
        updateAvailableTimes();
    }
});

// Função para animações de scroll
function handleScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight && elementBottom > 0) {
            element.classList.add('visible');
        }
    });
}

// Adicionar evento de scroll
window.addEventListener('scroll', handleScrollAnimations);

// Inicializar animações visíveis
handleScrollAnimations();

// Inicializar Componentes
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Feather Icons
    feather.replace();

    // Inicializar botões de ação
    const actionButtons = document.querySelectorAll('.schedule-action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.add('animate__pulse');
            setTimeout(() => {
                button.classList.remove('animate__pulse');
            }, 1000);
        });
    });

    // Inicializar cards
    const cards = document.querySelectorAll('.interactive-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('hover-grow');
        });
        card.addEventListener('mouseleave', () => {
            card.classList.remove('hover-grow');
        });
    });

    // Inicializar formulário
    const form = document.getElementById('scheduleForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            scheduleService();
        });
    }

    // Inicializar tema
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleTheme();
            themeToggle.classList.toggle('dark-mode');
        });
    }

    // Inicializar menu mobile
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (mobileMenuButton && mobileMenu && closeMobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        closeMobileMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (mobileMenu.classList.contains('active') && !mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Inicializar animações
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__fadeInUp');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.slide-in').forEach((section) => {
        observer.observe(section);
    });
});
            const button = document.createElement('button');
            button.className = 'w-full px-4 py-2 text-center text-sm rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary';
            button.textContent = time.time;
            button.addEventListener('click', () => {
                // Aqui você pode adicionar a lógica para selecionar o horário
                console.log('Horário selecionado:', time.time);
            });
            timeSlotsContainer.appendChild(button);
        });
    }
    
    // Atualiza os horários quando a data é selecionada
    datePicker.addEventListener('change', updateAvailableTimes);
    
    // Atualiza os horários inicialmente
    if (datePicker.value) {
        updateAvailableTimes();
    }
});
