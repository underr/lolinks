var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser')
var db = new sqlite3.Database('links.db');
var chalk = require('chalk');

/* TODO:
[ ] paginação
[ ] evitar repetições
[ ] autenticação (com cookies e STRING?)
[ ] inputs mais responsivos
*/

var total_itens;
var validURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

app.use('/public', express.static(__dirname + '/public'));
app.enable('trust proxy');
app.locals.pretty = true;
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }))

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'", function(err, row) {
    if(err !== null) {
        console.log(err);
    }
    else if(row == null) {
        db.run('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT,' + 
            '"dcr" VARCHAR(70), "title" VARCHAR(255), url VARCHAR(255))', function(err) {
            if(err !== null) {
                console.log(err);
            }
            else {
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
        total_itens = row.cc;            
    });
    function range1(i){return i?range1(i-1).concat(i):[]}   
    current_page = req.params.page;
    items_per_page = 5
    start_index = (current_page - 1) * items_per_page;
    total_pages = Math.ceil(total_itens / items_per_page);
    tp = range1(total_pages)
    query = 'SELECT * FROM bookmarks ORDER BY rowid DESC LIMIT ' + start_index + ', ' + items_per_page;
    db.all(query, function(err, row) {
        if (err !== null) {
            res.render('erro', { erro: 'Oops! Algo de errado aconteceu!' });
        } else {
            res.render('index', {bookmarks: row, tpages: tp, title: 'lolinks' });
        }
    });
});

app.post('/add', function(req, res) {
    title = req.body.title;
    url = req.body.url;
    dcr = req.body.dcr;

    if (!title || !url || !dcr) {
        res.render('erro', { erro: 'Preencha todos os campos!' });
    } else if (!url.match(validURL)) {
        res.render('erro', { erro: 'Não é uma URL válida!'});
    } else if (dcr > 70) {
        res.render('erro', { erro: 'Use menos de 70 caracteres na descrição, por favor.'});
    } else {
        sqlRequest = "INSERT INTO 'bookmarks' (dcr, title, url) VALUES('" + 
                     dcr + "', '" + title + "', '" + url + "')"

        console.log(chalk.blue(url + ' adicionada como ' + '"' + title + '"'));

        db.run(sqlRequest, function(err) {
            if(err !== null) {
                res.send(500, "An error has occurred -- " + err);
            }
            else {
                res.redirect('back');
            }
        });
    }
});

app.get('/delete/:id', function(req, res) {
    db.run("DELETE FROM bookmarks WHERE id='" + req.params.id + "'", function(err) {
        if(err !== null) {
            res.send(500, "An error has occurred -- " + err);
        }
        else {
            res.redirect('back');
        }
    });
});

serverPort = 5000;
app.listen(serverPort);
console.log(chalk.bgRed("Servidor disponível no endereço http://localhost:" + serverPort));
