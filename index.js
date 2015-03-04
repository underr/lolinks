// INIT
var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
// ADDONS
var bodyParser = require('body-parser')
var db = new sqlite3.Database('links.db');
var chalk = require('chalk');
var moment = require('moment');
var fs = require('fs');
var favicon = require('serve-favicon');
// LOCAL
var config = require('./config');
var i18n = require('./i18n/' + config.LANGUAGE);

var totalItens;
var VALIDURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

// STRING GENERATION
if (!config.STRING) {
  a = Math.random().toString(36).slice(2);
  b = Math.random().toString(36).slice(2);
  ab = a + b;
  console.log(chalk.bgRed(i18n.genString));
  fs.appendFile('config.js', '\nexports.STRING = ' + "'" + ab + "'" + ';');
  console.log(chalk.red(ab));
}

// MIDDLEWARE
app.enable('trust proxy');
app.locals.pretty = true;
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/', express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/favicon.ico'));

// DATABASE CREATION
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'", function(err, row) {
  if (err !== null) {
    console.log(err);
  } else if (row == null) {
      db.run('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "clicks" INTEGER DEFAULT 0,' +
        '"dcr" VARCHAR(50), "date" VARCHAR(20), "title" VARCHAR(25), url VARCHAR(255) UNIQUE)',
      function(err) {
      if (err !== null) {
        console.log(err);
      } else {
        console.log(chalk.bgRed(i18n.dbCrt));
      }
    });
  }
});

app.get('/', function(req, res) { // todo: use 1 as a "natural" / route
  res.redirect('/p/date/1'); // by date is the default order
});

// PAGES
app.get('/p/:order/:page', function(req, res) {
  // PAGINATION SPAGHETTI
  db.each('SELECT count(rowid) AS cc FROM bookmarks', function(err, row) {
    if (err !== null) {
      console.log(err)
      totalItens = 0;
    } else {
      totalItens = row.cc;
    }
  });

  function rng(i){return i?rng(i-1).concat(i):[]}

  startIndex = (req.params.page - 1) * config.ITENS_PER_PAGE;
  totalPages = Math.ceil(totalItens / config.ITENS_PER_PAGE);
  tp = rng(totalPages);
  n = req.params.page - 1;
  tp[n] = req.params.page;
  title = config.TITLE || 'lolinks';

  if (req.params.page > totalPages) {
    res.render('error', { error: i18n.ops, back: i18n.back });
    return;
  }
  // order
  var sortOrder;
  switch(req.params.order) {
    case 'date':
      sortOrder = 'rowid DESC';
      break;
    case 'alpha':
      sortOrder = 'title COLLATE NOCASE';
      break;
    case 'clicks':
      sortOrder = 'clicks DESC'
      break;
  }

  query = 'SELECT * FROM bookmarks ORDER BY ' + sortOrder + ' LIMIT ' +
          startIndex + ', ' + config.ITENS_PER_PAGE;
  db.all(query, function(err, row) {
    if (err !== null) {
      res.render('error', { error: i18n.ops, back: i18n.back });
      console.log(err);
    } else {
      res.render('index', {
        bookmarks: row,
        tpages: tp,
        cp: req.params.page,
        title: title,
        i18n: i18n
      });
    }
  });
});

// ADD POST
app.post('/add', function(req, res) {

  title = req.body.title;
  url = req.body.url;
  dcr = req.body.dcr || i18n.nodcr;
  moment.locale(config.LANGUAGE);
  now = moment(new Date());
  date = now.format("DD MMM YYYY");

  // this is not perfect, should be fixed
  if (!title || !url) {
    res.render('error', { error: i18n.allCamp, back: i18n.back });
  } else if (!url.match(VALIDURL)) {
    res.render('error', { error: i18n.valURL, back: i18n.back });
  } else if (toString(dcr).length > 50) {
    res.render('error', { error: i18n.dcrLong, back: i18n.back });
  } else if (toString(title).length > 25) {
    res.render('error', { error: i18n.titleLong, back: i18n.back });
  } else {

    db.run( "INSERT INTO bookmarks (dcr, date, title, url) VALUES(?, ?, ?, ?)", dcr, date, title, url,
    function(err) {
      if (err !== null) {
        console.log(err);
        res.render('error', {
          error: i18n.ops,
          back: i18n.back
        });
      } else {
        console.log(chalk.blue(url + i18n.added + '"' + title + '"'));
        res.redirect('/p/date/1');
      }
    });
  }
});

// CLICK COUNTER
// If you are using a older version, run the following on your shell to add the clicks column:
// sqlite3 links.db "ALTER TABLE bookmarks ADD COLUMN "clicks" INTEGER DEFAULT 0"
app.get('/click/:link', function(req, res) {
  link = (req.params.link);
  db.all("SELECT url as link FROM bookmarks WHERE id= ?", link,
  function(err, row) { // callback hell
    if (err !== null) {
      console.log(err);
      res.render('error', { error: i18n.ops, back: i18n.back });
    } else {
      try {
        if (!link) res.render('error');
        db.run("UPDATE bookmarks SET clicks = clicks + 1 WHERE id = ?", link)
        res.redirect(row[0].link)
      } catch(err) {
        res.render('error');
        console.log(err);
      }
    }
  });
});

// DELETE WITH STRING
app.get('/delete/:string/:id', function(req, res) {
  str = req.params.string;
  id = req.params.id;
  if (str === config.STRING) {
    db.run("DELETE FROM bookmarks  WHERE id= ? ", id,
    function(err) {
      if (err !== null) {
        console.log(err);
        res.render('error', { error: i18n.ops, back: i18n.back });
      } else {
        var request = { deleted: id };
        res.send(JSON.stringify(request));
      }
    });
  } else {
     res.render('error', { error: i18n.notAuth });
  }
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error');
});

app.use(function(req, res, next){
  res.render('404', {
    url: req.url,
    title: '404',
    back: i18n.back,
    theAddress: i18n.theAddress,
    notFound: i18n.notFound
  });
});


app.listen(config.SERVER_PORT);
console.log(chalk.green(i18n.srvDisp + config.SERVER_PORT));
