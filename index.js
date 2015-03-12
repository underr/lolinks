// INIT
var express = require('express');
var config = require('./config');
var app = express();
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: "./links.db"
  }
});
// ADDONS
var bodyParser = require('body-parser')
var chalk = require('chalk');
var moment = require('moment');
var fs = require('fs');
var favicon = require('serve-favicon');
var i18n = require('./i18n/' + config.LANGUAGE);

var totalItens;
var VALIDURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;
function rng(i){return i?rng(i-1).concat(i):[]}

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

// TABLE CHECK
knex.schema.hasTable('bookmarks').then(function(exists) {
  if (!exists) {
    return knex.raw('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "clicks" INTEGER DEFAULT 0,' +
'"dcr" VARCHAR(50), "date" VARCHAR(20), "title" VARCHAR(25), url VARCHAR(255) UNIQUE)');
  }
});

app.get('/', function(req, res) { // todo: use 1 as a "natural" / route
  res.redirect('/p/date/1'); // by date is the default order
});

// PAGES
app.get('/p/:order/:page', function(req, res) {
  // PAGINATION SPAGHETTI
  knex.count('rowid')
    .table('bookmarks')
    .then(function(rows) {
      if (rows[0]['count("rowid")'] === 0) {
        totalItens = 1
      } else {
        totalItens = rows[0]['count("rowid")']
      }
    });

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

  knex.select()
    .table('bookmarks')
    .orderByRaw(sortOrder)
    .limit(config.ITENS_PER_PAGE)
    .offset(startIndex)
    .then(function(row) {
      res.render('index', {
        bookmarks: row,
        tpages: tp,
        cp: req.params.page,
        title: title,
        i18n: i18n
      });
  });
});

// ADD POST
app.post('/add', function(req, res) {

  title = req.body.title;
  url = req.body.url;
  dcr = req.body.dcr || i18n.nodcr;
  moment.locale(config.LANGUAGE);
  now = moment(new Date());
  date = now.format("YYYY-MM-DD");

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
    knex('bookmarks').insert({ dcr: dcr, date: date, title: title, url:url})
    .then(function(row) {
        console.log(chalk.blue(url + i18n.added + '"' + title + '"'));
        res.redirect('/p/date/1');
      })
    .catch(function(error) {
      console.log(error);
      res.render('error', { error: i18n.ops, back: i18n.back });
    });
  }
});

// CLICK COUNTER
app.get('/click/:link', function(req, res) {
  link = (req.params.link);

  knex('bookmarks')
    .where('id','=',link)
    .increment('clicks', 1)
    .then(function(row) {
      knex.select('url').from('bookmarks').where('id','=',link).then(function(row) {
        res.redirect(row[0].url)
      })
    })
    .catch(function(error) {
      console.log(error);
      res.render('error', { error: i18n.ops, back: i18n.back });
  });
});

// DELETE WITH STRING
app.get('/delete/:string/:id', function(req, res) {
  str = req.params.string;
  id = req.params.id;
  if (str === config.STRING) {
    knex('bookmarks')
    .where('id','=',id)
    .del()
    .then(function(row) {
      var request = { deleted: id };
      res.send(JSON.stringify(request));
    })
    .catch(function(error) {
      console.log(error)
      res.render('error', { error: i18n.ops, back: i18n.back });
    });
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
