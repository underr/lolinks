var express = require('express');
var config = require('../config');
var chalk = require('chalk');
var i18n = require('../i18n/' + config.LANGUAGE);
var router = express.Router();
var knex = require('knex')({
  debug: true,
  client: 'sqlite3',
  connection: {
      filename: "./links.db"
    }
});

var totalItens; // to fix
function rng(i){return i?rng(i-1).concat(i):[]}

// PAGES
router.get('/', function(req, res) {
  if (!req.query.page && !req.query.order) {
    res.redirect('/?page=1&order=date');
  } else if (!req.query.order) {
	res.redirect('/?page=1&order=date');
  }
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

  startIndex = (req.query.page - 1) * config.ITENS_PER_PAGE;
  totalPages = Math.ceil(totalItens / config.ITENS_PER_PAGE);
  tp = rng(totalPages);
  n = req.query.page - 1;
  tp[n] = req.query.page;
  title = config.TITLE || 'lolinks';

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
        order: req.query.order,
        cp: req.query.page,
        title: title,
        i18n: i18n
      });
  });
});

module.exports = router;
