var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser')
var db = new sqlite3.Database('links.db');
var chalk = require('chalk');
var moment = require('moment');
var fs = require('fs');
var favicon = require('serve-favicon');
var config = require('./config');
var i18n = require('./i18n/' + config.LANGUAGE);

var totalItens;
var VALIDURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

if (!config.STRING) {
  a = Math.random().toString(36).slice(2);
  b = Math.random().toString(36).slice(2);
  ab = a + b;
  console.log(chalk.bgRed(i18n.genString));
  fs.appendFile('config.js', '\nexports.STRING = ' + "'" + ab + "'" + ';');
  console.log(chalk.red(ab));
}

app.enable('trust proxy');
app.locals.pretty = true;
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/', express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/favicon.ico'));

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'", function(err, row) {
  if(err !== null) {
    console.log(err);
  } else if (row == null) {
      db.run('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT,' +
        '"dcr" VARCHAR(70), "date" VARCHAR(20), "title" VARCHAR(25), url VARCHAR(255) UNIQUE)', function(err) {
      if (err !== null) {
        console.log(err);
      } else {
        console.log(chalk.bgRed(i18n.dbCrt));
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
  startIndex = (currentPage - 1) * config.ITENS_PER_PAGE;
  totalPages = Math.ceil(totalItens / config.ITENS_PER_PAGE);
  tp = range1(totalPages);
  n = currentPage - 1;
  tp[n] = '♥';
  query = 'SELECT * FROM bookmarks ORDER BY rowid DESC LIMIT ' + startIndex + ', ' + config.ITENS_PER_PAGE;
  db.all(query, function(err, row) {
    if (err !== null) {
      res.render('erro', { erro: i18n.ops });
      console.log(row)
    } else {
      res.render('index', {
        bookmarks: row,
        tpages: tp,
        cp: currentPage,
        title: 'lolinks',
        inptitle: i18n.title,
        inpdescr: i18n.descr,
        send: i18n.send
      });
    }
  });
});

app.post('/add', function(req, res) {
  title = req.body.title;
  url = req.body.url;
  dcr = req.body.dcr || i18n.nodcr;
  moment.locale(config.LANGUAGE);
  now = moment(new Date());
  date = now.format("DD MMM YYYY");

  if (!title || !url) {
    res.render('erro', { erro: i18n.allCamp });
  } else if (!url.match(VALIDURL)) {
    res.render('erro', { erro: i18n.valURL });
  } else if (toString(dcr) > 70) {
    res.render('erro', { erro: i18n.dcrLong });
  } else if (toString(title) > 25) {
    res.render('erro', { erro: i18n.titleLong });
  } else {

    db.run( "INSERT INTO bookmarks (dcr, date, title, url) VALUES(?, ?, ?, ?)", dcr, date, title, url,
    function(err) {
      if (err !== null) {
        res.render('erro', {
			erro: i18n.ops,
			back: i18n.back
		});
      } else {
        console.log(chalk.blue(url + i18n.added + '"' + title + '"'));
        res.redirect('/1');
      }
    });
  }
});

app.get('/delete/:string/:id', function(req, res) {
  str = req.params.string;
  id = req.params.id;
  if (str === config.STRING) {
    db.run("DELETE FROM bookmarks  WHERE id= ? ", id,
    function(err) {
      if (err !== null) {
              res.render('erro', { erro: i18n.ops });
      } else {
        var request = { deleted: id };
        res.send(JSON.stringify(request));
      }
    });
  } else {
     res.render('erro', { erro: i18n.notAuth });
  }
});

app.use(function(req, res, next){
  res.render('404', {
    url: req.url,
    title: '404',
	back: i18n.back
  });
});


app.listen(config.SERVER_PORT);
console.log(chalk.green(i18n.srvDisp + config.SERVER_PORT));
