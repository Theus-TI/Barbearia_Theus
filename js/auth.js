// Funções de autenticação para o lado do cliente (frontend)

/**
 * Decodifica o payload de um token JWT.
 * @param {string} token - O token JWT.
 * @returns {object|null} O payload decodificado ou null em caso de erro.
 */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Erro ao decodificar o token:", e);
        return null;
    }
}

/**
 * Verifica se o usuário está logado checando a existência e validade do token.
 * @returns {boolean}
 */
export function isLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return false;

    // A data de expiração (exp) está em segundos, enquanto Date.now() está em milissegundos.
    return Date.now() < payload.exp * 1000;
}

/**
 * Retorna os dados do usuário logado a partir do token.
 * @returns {object|null}
 */
export function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    const token = localStorage.getItem('token');
    const decodedToken = parseJwt(token);

    if (!decodedToken) {
        return null;
    }

    // Adapta o campo 'nome' do backend para 'name' que o frontend espera.
    return {
        id: decodedToken.id,
        email: decodedToken.email,
        name: decodedToken.nome // Mapeamento de 'nome' para 'name'
    };
}

/**
 * Faz o logout do usuário removendo o token.
 */
export function logout() {
    localStorage.removeItem('token');
}

