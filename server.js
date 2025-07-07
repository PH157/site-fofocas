const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({ secret: 'segredo', resave: false, saveUninitialized: true }));

const db = new sqlite3.Database('./fofocas.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS fofocas (id INTEGER PRIMARY KEY, texto TEXT, data DATETIME)");
});

// Limpa fofocas com mais de 24 horas e retorna as últimas 25
app.get('/api/fofocas', (req, res) => {
  const limite = 25;
  db.run("DELETE FROM fofocas WHERE datetime(data) <= datetime('now', '-24 hours')", () => {
    db.all("SELECT * FROM fofocas ORDER BY data DESC LIMIT ?", [limite], (err, rows) => {
      if (err) return res.status(500).send(err.message);
      res.json(rows);
    });
  });
});

// Retorna todas as fofocas para o admin, se autenticado
app.get('/api/all-fofocas', (req, res) => {
  if (!req.session.admin) return res.sendStatus(401);
  db.all("SELECT * FROM fofocas ORDER BY data DESC", (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Recebe nova fofoca
app.post('/api/fofocas', (req, res) => {
  const texto = req.body.texto;
  if (!texto || texto.trim() === "") return res.status(400).send("Fofoca vazia");
  db.run("INSERT INTO fofocas (texto, data) VALUES (?, datetime('now'))", [texto.trim()], (err) => {
    if (err) return res.status(500).send(err.message);
    res.sendStatus(200);
  });
});

// Exclui fofoca pelo id, só admin
app.delete('/api/fofocas/:id', (req, res) => {
  if (!req.session.admin) return res.sendStatus(401);
  db.run("DELETE FROM fofocas WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).send(err.message);
    res.sendStatus(200);
  });
});

// Login admin
app.post('/admin-login', (req, res) => {
  const { user, pass } = req.body;
  if (user === "ph" && pass === "8494") {
    req.session.admin = true;
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

// Verifica sessão admin
app.get('/admin-check', (req, res) => {
  if (req.session.admin) res.sendStatus(200);
  else res.sendStatus(401);
});

// Rota para servir o painel admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
