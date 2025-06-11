<?php
session_start();
require_once 'config/database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];
    $password = $_POST['password'];
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['senha'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_nome'] = $user['nome'];
            
            if (isset($_POST['remember'])) {
                setcookie('user_email', $email, time() + (86400 * 30)); // Cookie válido por 30 dias
            }
            
            header("Location: catalogo.php");
            exit();
        } else {
            $_SESSION['error'] = "Email ou senha inválidos";
        }
    } catch(PDOException $e) {
        $_SESSION['error'] = "Erro ao fazer login: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Barbearia083</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
            <div>
                <img class="mx-auto h-12 w-auto" src="https://s3u.tmimgcdn.com/u37752224/7c8e9297ec93e65a6d873014b5963c00.gif" alt="Logo da Barbearia083">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Faça seu Login
                </h2>
            </div>
            
            <?php if (isset($_SESSION['error'])): ?>
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <?php 
                    echo $_SESSION['error']; 
                    unset($_SESSION['error']);
                    ?>
                </div>
            <?php endif; ?>

            <form class="mt-8 space-y-6" action="" method="POST">
                <div class="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label for="email" class="sr-only">Email</label>
                        <input id="email" name="email" type="email" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" placeholder="Email">
                    </div>
                    <div>
                        <label for="password" class="sr-only">Senha</label>
                        <input id="password" name="password" type="password" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" placeholder="Senha">
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <input id="remember" name="remember" type="checkbox" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
                        <label for="remember" class="ml-2 block text-sm text-gray-900">
                            Lembrar-me
                        </label>
                    </div>

                    <div class="text-sm">
                        <a href="recuperar-senha.php" class="font-medium text-primary hover:text-primary-dark">
                            Esqueceu sua senha?
                        </a>
                    </div>
                </div>

                <div>
                    <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Entrar
                    </button>
                </div>

                <div class="text-center">
                    <a href="register.php" class="font-medium text-primary hover:text-primary-dark">
                        Não tem uma conta? Crie uma
                    </a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
