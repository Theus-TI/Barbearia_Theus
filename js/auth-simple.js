// Função para criar um novo usuário
function createUser(name, email, password) {
    // Verifica se já existe algum usuário com esse email
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find(user => user.email === email);
    
    if (existingUser) {
        throw new Error('Este email já está cadastrado');
    }

    // Cria um novo usuário
    const newUser = {
        id: Date.now(),
        name,
        email,
        password: password, // Sem criptografia para simplificar
        createdAt: new Date().toISOString()
    };

    // Adiciona o novo usuário
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
}

// Função para fazer login
function login(email, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(user => 
        user.email === email && 
        user.password === password
    );

    if (!user) {
        throw new Error('Email ou senha inválidos');
    }

    // Salva as informações do usuário logado
    localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        isLoggedIn: true
    }));

    return user;
}

// Função para verificar se o usuário está logado
function isLoggedIn() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.isLoggedIn === true;
}

// Função para obter o usuário atual
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('currentUser');
}

// Exporta as funções
window.createUser = createUser;
window.login = login;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.logout = logout;
