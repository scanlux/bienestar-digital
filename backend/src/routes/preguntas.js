const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const idFilePath = path.join(__dirname, '../../data/idPreguntas.json');
const preguntasFilePath = path.join(__dirname, '../../data/preguntas.json');

const requestQueue = [];
let isProcessing = false;

// Leer el ID actual
function getCurrentId() {
  if (!fs.existsSync(idFilePath)) {
    return 0; // Fallback
  }
  const data = fs.readFileSync(idFilePath, 'utf8');
  return JSON.parse(data).currentId;
}

// Actualizar el ID actual
function updateCurrentId(newId) {
  const data = { currentId: newId };
  fs.writeFileSync(idFilePath, JSON.stringify(data, null, 2));
}

// Procesar la cola de solicitudes
function processQueue() {
  if (requestQueue.length === 0 || isProcessing) {
    return;
  }

  isProcessing = true;
  const { req, res, handler } = requestQueue.shift();

  handler(req, res).then(() => {
    isProcessing = false;
    processQueue();
  }).catch(error => {
    res.status(500).send(error.toString());
    isProcessing = false;
    processQueue();
  });
}

// Middleware para agregar solicitudes a la cola
function enqueueRequest(handler) {
  return (req, res) => {
    requestQueue.push({ req, res, handler });
    processQueue();
  };
}

// Leer preguntas
router.get('/', enqueueRequest((req, res) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(preguntasFilePath)) {
      res.json([]);
      return resolve();
    }
    const data = fs.readFileSync(preguntasFilePath, 'utf8');
    const preguntas = JSON.parse(data);
    res.json(preguntas);
    resolve();
  });
}));

// Crear nueva pregunta
router.post('/', enqueueRequest((req, res) => {
  return new Promise((resolve, reject) => {
    const newQuestion = req.body;

    const currentId = getCurrentId();
    const newId = currentId + 1;
    updateCurrentId(newId);

    const newQuestionEntry = {
      id: newId,
      question: newQuestion.question,
      image: 'https://picsum.photos/400/300?random=0',
      choices: newQuestion.choices.map((choice, index) => ({
        id: index + 1,
        choice: choice,
        votes: 0
      }))
    };

    try {
      if (!fs.existsSync(preguntasFilePath)) {
        fs.writeFileSync(preguntasFilePath, JSON.stringify([], null, 2));
      }
      const data = fs.readFileSync(preguntasFilePath, 'utf8');
      const preguntas = JSON.parse(data);
      preguntas.push(newQuestionEntry);

      fs.writeFileSync(preguntasFilePath, JSON.stringify(preguntas, null, 2));
      res.json(newQuestionEntry);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}));

// Votar por una opción
router.post('/:idPregunta/votar/:idOpcion', enqueueRequest((req, res) => {
  return new Promise((resolve, reject) => {
    const idPregunta = parseInt(req.params.idPregunta, 10);
    const idOpcion = parseInt(req.params.idOpcion, 10);

    try {
      if (!fs.existsSync(preguntasFilePath)) {
        res.status(404).send('No hay preguntas');
        return resolve();
      }
      const data = fs.readFileSync(preguntasFilePath, 'utf8');
      const preguntas = JSON.parse(data);

      const pregunta = preguntas.find(p => p.id === idPregunta);
      if (!pregunta) {
        res.status(404).send('Pregunta no encontrada');
        resolve();
        return;
      }

      const opcion = pregunta.choices.find(c => c.id === idOpcion);
      if (!opcion) {
        res.status(404).send('Opción no encontrada');
        resolve();
        return;
      }

      opcion.votes += 1;

      fs.writeFileSync(preguntasFilePath, JSON.stringify(preguntas, null, 2));
      res.send('okV');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}));

module.exports = router;
