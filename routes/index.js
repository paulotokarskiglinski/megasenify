const express = require('express');
const router = express.Router();
const brain = require('../node_modules/brain.js/dist/index').default;
const fs = require('fs');

router.get('/', (req, res) => {
  gerarResultadoSorteios().then((resultado) => {
    gerarMapaCalor(resultado.contadorBolaSorteios).then((mapaCalor) => {
      res.render('index', { title: 'Megasenify BETA | Mega Sena', sorteios: resultado.sorteios, contadorBolaSorteios: resultado.contadorBolaSorteios, mapaCalor: mapaCalor, jogada: null, resultadoRedeNeural: null });
    });
  })
});

router.post('/', (req, res) => {
  const bolas = req.body;
  const jogada = { bola1: bolas.bola1, bola2: bolas.bola2, bola3: bolas.bola3, bola4: bolas.bola4, bola5: bolas.bola5, bola6: bolas.bola6 };

  gerarResultadoSorteios(bolas).then((resultado) => {
    gerarMapaCalor(resultado.contadorBolaSorteios).then((mapaCalor) => {
      treinarRedeNeural(bolas).then((resultadoRedeNeural) => {
        res.render('index', { title: 'Megasenify BETA | Mega Sena', sorteios: resultado.sorteios, contadorBolaSorteios: resultado.contadorBolaSorteios, mapaCalor: mapaCalor, jogada: jogada, resultadoRedeNeural: resultadoRedeNeural });
      })
    });
  })
});

function lerSorteios() {
  return new Promise((resolve) => {
    fs.open('libs/sorteios.json', 'r', (err, arquivo) => {
      if (err) throw err;
      else {
        fs.readFile(arquivo, (err, buffer) => {
          if (err) throw err;
          else {
            resolve(JSON.parse(buffer.toString('utf-8')));
            fs.closeSync(arquivo);
          }
        });
      }
    });
  });
}

function lerFalhas() {
  return new Promise((resolve) => {
    fs.open('libs/falhas.json', 'r', (err, arquivo) => {
      if (err) throw err;
      else {
        fs.readFile(arquivo, (err, buffer) => {
          if (err) throw err;
          else {
            resolve(JSON.parse(buffer.toString('utf-8')));
            fs.closeSync(arquivo);
          }
        });
      }
    });
  });
}

function gerarResultadoSorteios() {
  return new Promise((resolve) => {
    const contadorBolaSorteios = new Array(61).fill(0);

    lerSorteios().then((sorteios) => {
      for (let cont = 0; cont <= Object.keys(sorteios).length; cont++) {
        if (sorteios.hasOwnProperty(cont)) {
          contadorBolaSorteios[sorteios[cont].bola1]++;
          contadorBolaSorteios[sorteios[cont].bola2]++;
          contadorBolaSorteios[sorteios[cont].bola3]++;
          contadorBolaSorteios[sorteios[cont].bola4]++;
          contadorBolaSorteios[sorteios[cont].bola5]++;
          contadorBolaSorteios[sorteios[cont].bola6]++;
        }
      }

      resolve({sorteios, contadorBolaSorteios});
    });
  })
}

function gerarMapaCalor(sorteios) {
  return new Promise((resolve) => {
    const mapaCalor = [];

    for (let cont = 1; cont <= sorteios.length; cont++) {
      if (sorteios.hasOwnProperty(cont)) {
        mapaCalor.push({ bola: cont, repeticoes: sorteios[cont], calor: 0 });
      }
    }

    mapaCalor.sort((a, b) => {
      return b.repeticoes - a.repeticoes;
    });

    let calor = 10;
    for (let cont = 0; cont < 60; cont += 6) {
      if (cont % 6 === 0) {
        for (let j = cont; j < cont + 6; j++) {
          mapaCalor[j].calor = calor;
        }
        --calor;
      }
    }

    mapaCalor.sort((a, b) => {
      return a.bola - b.bola;
    });

    resolve(mapaCalor);
  });
}

function treinarRedeNeural(bolas) {
  const treinos = [];
  const net = new brain.NeuralNetwork();

  return new Promise((resolve) => {
    lerSorteios().then((sorteios) => {
      lerFalhas().then((falhas) => {
        sorteios.forEach((sorteio) => {
          treinos.push({input: { bola1: sorteio.bola1, bola2: sorteio.bola2, bola3: sorteio.bola3, bola4: sorteio.bola4, bola5: sorteio.bola5, bola6: sorteio.bola6 }, output: { vence: 1, perde: 0 }});
        });

        falhas.forEach((falha) => {
          treinos.push({input: { bola1: falha.bola1, bola2: falha.bola2, bola3: falha.bola3, bola4: falha.bola4, bola5: falha.bola5, bola6: falha.bola6 }, output: { vence: 0, perde: 1 }});
        });

        net.trainAsync(treinos, { timeout: 20000 }).then(() => {
          const resultadoRedeNeural = net.run({
            bola1: parseInt(bolas.bola1, 10),
            bola2: parseInt(bolas.bola2, 10),
            bola3: parseInt(bolas.bola3, 10),
            bola4: parseInt(bolas.bola4, 10),
            bola5: parseInt(bolas.bola5, 10),
            bola6: parseInt(bolas.bola6, 10)
          });

          resolve(resultadoRedeNeural);
        })
      });
    });
  });
}

module.exports = router;
