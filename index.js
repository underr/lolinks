var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser')
var db = new sqlite3.Database('links.db');
var chalk = require('chalk');
var moment = require("moment");

/* TODO:
[x] paginação
[ ] evitar repetições
[ ] autenticação (com cookies e STRING?)
[ ] inputs mais responsivos
*/

var totalItens;
var VALIDURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
// CONFIG
ITENS_PER_PAGE = 10
SERVER_PORT = 5000;

app.use('/public', express.static(__dirname + '/public'));
app.enable('trust proxy');
app.locals.pretty = true;
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }))

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'", function(err, row) {
  if(err !== null) {
    console.log(err);
  } else if (row == null) {
    db.run('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT,' + 
            '"dcr" VARCHAR(70), "date" VARCHAR(20), "title" VARCHAR(25), url VARCHAR(255))', function(err) {
      if (err !== null) {
        console.log(err);
      } else {
        console.log(chalk.bgRed("Banco de Dados criado com sucesso."));
      }
    });
  }
});

app.get('/', function(req, res) {
  res.redirect('/1');
});

app.get('/:page', function(req, res) {
  db.each('SELECT count(rowid) AS cc FROM bookmarks', function(err, row) {
    totalItens = row.cc;            
  });
  function range1(i){return i?range1(i-1).concat(i):[]}   
  currentPage = req.params.page;
  startIndex = (currentPage - 1) * ITENS_PER_PAGE;
  totalPages = Math.ceil(totalItens / ITENS_PER_PAGE);
  tp = range1(totalPages);
  n = currentPage - 1;
  tp[n] = '♥';
  query = 'SELECT * FROM bookmarks ORDER BY rowid DESC LIMIT ' + startIndex + ', ' + ITENS_PER_PAGE;
  db.all(query, function(err, row) {
    if (err !== null) {
      res.render('erro', { erro: 'Oops! Algo de errado aconteceu!' });
      console.log(row)
    } else {
      res.render('index', {
        bookmarks: row,
        tpages: tp, 
        cp: currentPage, 
        title: 'lolinks' 
      });
    }
  });
});

app.post('/add', function(req, res) {
  title = req.body.title;
  url = req.body.url;
  dcr = req.body.dcr;
  moment.locale('pt-BR');    
  now = moment(new Date());
  date = now.format("DD MMM YYYY - HH:mm");

  if (!title || !url || !dcr) {
    res.render('erro', { erro: 'Preencha todos os campos!' });
  } else if (!url.match(VALIDURL)) {
    res.render('erro', { erro: 'Não é uma URL válida!'});
  } else if (toString(dcr) > 70) {
    res.render('erro', { erro: 'Use menos de 70 caracteres na descrição, por favor.'});
  } else if (toString(title) > 25) {
    res.render('erro', { erro: 'Título muito longo.'});
  } else {
    query = "INSERT INTO 'bookmarks' (dcr, date, title, url) VALUES('" + 
            dcr + "', '" + date + "', '" + title + "', '" + url + "')"

    db.run(query, function(err) {
      if (err !== null) {
        res.render('erro', { erro: 'Oops! Algo de errado aconteceu!' });
      } else {
        console.log(chalk.blue(url + ' adicionada como ' + '"' + title + '"'));
        res.redirect('back');
      }
    });
  }
});

app.get('/delete/:id', function(req, res) {
  db.run("DELETE FROM bookmarks WHERE id='" + req.params.id + "'", function(err) {
    if (err !== null) {
            res.render('erro', { erro: 'Oops! Algo de errado aconteceu!' });
    } else {
      res.redirect('/');
    }
  });
});

app.listen(SERVER_PORT);
console.log(chalk.bgRed("Servidor disponível no endereço http://localhost:" + SERVER_PORT));
