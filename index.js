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
var fs = require('fs');
var favicon = require('serve-favicon');
var i18n = require('./i18n/' + config.LANGUAGE);

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
    return knex.schema.createTable('bookmarks', function(t) {
      t.increments('id').primary();
      t.integer('clicks').defaultTo(0);
      t.string('dcr', 50);
      t.string('date', 20);
      t.string('title', 25);
      t.string('url', 255).unique();
    });
  }
});

// ROUTES
app.use('/', require('./routes/'));
app.use('/add', require('./routes/add'));
app.use('/click', require('./routes/click'));
app.use('/delete', require('./routes/delete'));

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.render('error').status(500);
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
