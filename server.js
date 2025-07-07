
const express = require('express');
const app = express();
const fs = require('fs');
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

app.get('/api/fofocas', (req, res) => {
  const limite = 25;
  const agora = new Date().toISOString();
  db.all("DELETE FROM fofocas WHERE datetime(data) <= datetime('now', '-24 hours')");
  db.all("SELECT * FROM fofocas ORDER BY data DESC LIMIT ?", [limite], (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/all-fofocas', (req, res) => {
  if (!req.session.admin) return res.sendStatus(401);
  db.all("SELECT * FROM fofocas ORDER BY data DESC", (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/fofocas', (req, res) => {
  const texto = req.body.texto;
  db.run("INSERT INTO fofocas (texto, data) VALUES (?, datetime('now'))", [texto], () => {
    res.sendStatus(200);
  });
});

app.delete('/api/fofocas/:id', (req, res) => {
  if (!req.session.admin) return res.sendStatus(401);
  db.run("DELETE FROM fofocas WHERE id = ?", [req.params.id], () => {
    res.sendStatus(200);
  });
});

app.post('/admin-login', (req, res) => {
  const { user, pass } = req.body;
  if (user === "ph" && pass === "8494") {
    req.session.admin = true;
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

app.get('/admin-check', (req, res) => {
  if (req.session.admin) res.sendStatus(200);
  else res.sendStatus(401);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));
