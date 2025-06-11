<?php
session_start();
require_once 'config/database.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $nome = $_POST['nome'];
    
    try {
        $stmt = $pdo->prepare("INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)");
        $stmt->execute([$email, $password, $nome]);
        
        $_SESSION['success'] = "Registro realizado com sucesso! Você pode fazer login agora.";
        header("Location: login.php");
        exit();
    } catch(PDOException $e) {
        $_SESSION['error'] = "Erro ao registrar usuário: " . $e->getMessage();
        header("Location: register.php");
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criar Conta - Barbearia083</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="min-h-screen flex items-center justify-center">
        <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
            <div>
                <img class="mx-auto h-12 w-auto" src="https://s3u.tmimgcdn.com/u37752224/7c8e9297ec93e65a6d873014b5963c00.gif" alt="Logo da Barbearia083">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Criar Conta
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
                        <label for="nome" class="sr-only">Nome</label>
                        <input id="nome" name="nome" type="text" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" placeholder="Nome">
                    </div>
                    <div>
                        <label for="email" class="sr-only">Email</label>
                        <input id="email" name="email" type="email" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" placeholder="Email">
                    </div>
                    <div>
                        <label for="password" class="sr-only">Senha</label>
                        <input id="password" name="password" type="password" required class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" placeholder="Senha">
                    </div>
                </div>

                <div>
                    <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Criar Conta
                    </button>
                </div>

                <div class="text-center">
                    <a href="login.php" class="font-medium text-primary hover:text-primary-dark">
                        Já tem uma conta? Faça login
                    </a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
