var express = require('express');
var config = require('../config');
var chalk = require('chalk');
var i18n = require('../i18n/' + config.LANGUAGE);
var router = express.Router();
var knex = require('knex')({
  client: 'sqlite3',
  debug: config.DEBUG,
  connection: {
      filename: "./links.db"
    }
});

var totalItens; // to fix
function rng(i){return i?rng(i-1).concat(i):[]}

// LEGACY ROUTE
router.get('/p/date/1/', function(req, res) {
  res.redirect('/?page=1&order=date&view=' + config.DEFAULT_VIEW);
});

// PAGES
router.get('/', function(req, res) {
  var view = (req.query.view == 'list') ? 'list' : 'index';
  if (!req.query.page && !req.query.order) {
    res.redirect('/?page=1&order=date&view=' + config.DEFAULT_VIEW);
  } else if (!req.query.order) {
	res.redirect('/?page=1&order=date&view=' + config.DEFAULT_VIEW);
  }
  // PAGINATION SPAGHETTI
  knex.count('id')
    .table('bookmarks')
    .then(function(rows) {
      if (rows[0]['count("rowid")'] === 0) {
        totalItens = 1
      } else {
        totalItens = rows[0]['count("rowid")']
      }
    });

  var startIndex = (req.query.page - 1) * config.ITENS_PER_PAGE;
  var totalPages = Math.ceil(totalItens / config.ITENS_PER_PAGE);
  var tp = rng(totalPages);
  var n = req.query.page - 1;
  tp[n] = req.query.page;
  var title = config.TITLE || 'lolinks';

  if (req.query.page > totalPages) {
    res.render('error', { error: i18n.ops, back: i18n.back });
    return;
  }

  var sortOrder;
  switch(req.query.order) {
    case 'date':
      sortOrder = 'rowid DESC';
      break;
    case 'alpha':
      sortOrder = 'title COLLATE NOCASE';
      break;
    case 'clicks':
      sortOrder = 'clicks DESC'
      break;
    default:
      sortOrder = 'rowid DESC';
      break;
  }

  knex.select()
    .table('bookmarks')
    .orderByRaw(sortOrder)
    .limit(config.ITENS_PER_PAGE)
    .offset(startIndex)
    .then(function(row) {
      res.render(view, {
        bookmarks: row,
        tpages: tp,
        order: req.query.order,
        cp: req.query.page,
        title: title,
        i18n: i18n
      });
  });
});

module.exports = router;
