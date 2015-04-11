var express = require('express');
var config = require('../config');
var chalk = require('chalk');
var i18n = require('../i18n/' + config.LANGUAGE);
var router = express.Router();
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
      filename: "./links.db"
    }
});

router.get('/:link', function(req, res) {
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

module.exports = router;
