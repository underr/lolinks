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

// DELETE WITH STRING
router.get('/:string/:id', function(req, res) {
  var str = req.params.string;
  var id = req.params.id;
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

module.exports = router;
