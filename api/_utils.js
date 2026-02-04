const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-para-desenvolvimento';

function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.split(' ')[1];
}

function verifyToken(req) {
  const token = getToken(req);
  if (!token) {
    const err = new Error('Token de autenticação não fornecido.');
    err.statusCode = 401;
    throw err;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    error.statusCode = 401;
    throw error;
  }
}

module.exports = {
  sendJSON,
  getJSONBody,
  getToken,
  verifyToken,
  JWT_SECRET
};
