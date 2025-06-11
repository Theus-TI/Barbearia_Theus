const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { agendarHorario, listarAgendamentos, cancelarAgendamento } = require('./agendamento');

// Middleware para parse de JSON
const parseJSON = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
                next();
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        next();
    }
};

// Função para servir arquivos estáticos
async function serveStaticFile(req, res, filePath) {
    try {
        // Verifica se o arquivo existe
        await fs.access(filePath);
        
        const file = await fs.readFile(filePath);
        const extension = path.extname(filePath);
        let contentType = 'text/html';
        
        switch(extension) {
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(file);
    } catch (error) {
        // Se o arquivo não existe, tenta procurar em subdiretórios
        const subdirs = ['css', 'js'];
        for (const subdir of subdirs) {
            const subPath = path.join(__dirname, subdir, req.url);
            try {
                await fs.access(subPath);
                const file = await fs.readFile(subPath);
                const extension = path.extname(subPath);
                let contentType = 'text/html';
                
                switch(extension) {
                    case '.css':
                        contentType = 'text/css';
                        break;
                    case '.js':
                        contentType = 'application/javascript';
                        break;
                    case '.png':
                        contentType = 'image/png';
                        break;
                    case '.jpg':
                    case '.jpeg':
                        contentType = 'image/jpeg';
                        break;
                }

                res.writeHead(200, { 'Content-Type': contentType });
                res.end(file);
                return;
            } catch (err) {}
        }
        
        // Se ainda não encontrou, retorna 404
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Not Found</h1>');
    }
}

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    try {
        // Parse JSON para requisições POST/PUT
        await new Promise((resolve, reject) => {
            parseJSON(req, res, resolve);
        });

        // Rotas de API
        if (req.method === 'POST' && req.url === '/agendamento') {
            // Agendar novo horário
            const resultado = await agendarHorario(req.body);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultado));
            return;
        }

        if (req.method === 'GET' && req.url.startsWith('/agendamentos/')) {
            // Listar agendamentos do usuário
            const usuario_id = req.url.split('/')[2];
            const agendamentos = await listarAgendamentos(usuario_id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(agendamentos));
            return;
        }

        if (req.method === 'DELETE' && req.url.startsWith('/agendamento/')) {
            // Cancelar agendamento
            const [id, usuario_id] = req.url.split('/')[2].split('-');
            const resultado = await cancelarAgendamento(id, usuario_id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultado));
            return;
        }

        // Servir arquivos estáticos
        let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
        await serveStaticFile(req, res, filePath);
    } catch (error) {
        console.error('Erro:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 - Internal Server Error</h1>');
    }
});

// Iniciar o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});


