import { isLoggedIn, getCurrentUser, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elementos de Status do Usuário (Desktop)
    const userGuestDiv = document.getElementById('user-guest');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Elementos de Status do Usuário (Mobile)
    const mobileUserGuestDiv = document.getElementById('mobile-user-guest');
    const mobileUserLoggedInDiv = document.getElementById('mobile-user-logged-in');
    const mobileUserNameSpan = document.getElementById('mobile-user-name');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    // Botões de Agendamento
    const agendarBtnDesktop = document.getElementById('agendar-horario-btn-desktop');
    const agendarBtnMobile = document.getElementById('agendar-horario-btn-mobile');
    const agendarBtnHero = document.getElementById('agendar-horario-btn-hero');

    const checkLoginStatus = () => {
        if (isLoggedIn()) {
            const user = getCurrentUser();
            const firstName = user.name.split(' ')[0];

            // --- UI para Usuário Logado ---
            // Desktop
            if (userGuestDiv) userGuestDiv.style.display = 'none';
            if (userLoggedInDiv) {
                userLoggedInDiv.style.display = 'flex';
                userNameSpan.textContent = firstName;
            }
            // Mobile
            if (mobileUserGuestDiv) mobileUserGuestDiv.style.display = 'none';
            if (mobileUserLoggedInDiv) {
                mobileUserLoggedInDiv.style.display = 'block';
                mobileUserNameSpan.textContent = firstName;
            }

            // Atualiza links de agendamento para 'agendamento.html'
            if (agendarBtnDesktop) agendarBtnDesktop.href = 'agendamento.html';
            if (agendarBtnMobile) agendarBtnMobile.href = 'agendamento.html';
            if (agendarBtnHero) agendarBtnHero.href = 'agendamento.html';

        } else {
            // --- UI para Visitante ---
            // Desktop
            if (userGuestDiv) userGuestDiv.style.display = 'flex';
            if (userLoggedInDiv) userLoggedInDiv.style.display = 'none';
            // Mobile
            if (mobileUserGuestDiv) mobileUserGuestDiv.style.display = 'block';
            if (mobileUserLoggedInDiv) mobileUserLoggedInDiv.style.display = 'none';

            // Garante que os links de agendamento apontem para 'login.html'
            if (agendarBtnDesktop) agendarBtnDesktop.href = 'login.html';
            if (agendarBtnMobile) agendarBtnMobile.href = 'login.html';
            if (agendarBtnHero) agendarBtnHero.href = 'login.html';
        }
    };

    const handleLogout = () => {
        logout();
        window.location.reload(); // Recarrega a página para atualizar a UI
    };

    // Adiciona eventos aos botões de logout
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // Verifica o status do login ao carregar a página
    checkLoginStatus();
});
