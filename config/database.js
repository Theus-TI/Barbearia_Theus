const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'barbearia_db'
};

// Exporta a configuração para ser usada em outros arquivos
module.exports = dbConfig;
