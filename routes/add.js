var express = require('express');
var config = require('../config');
var moment = require('moment');
var chalk = require('chalk');
var i18n = require('../i18n/' + config.LANGUAGE);
var router = express.Router();
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
      filename: "./links.db"
    }
});

var VALIDURL = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

router.post('/', function(req, res) {

  var title = req.body.title;
  var url = req.body.url;
  var dcr = req.body.dcr || i18n.nodcr;
  var now = moment(new Date());
  var date = now.format("YYYY-MM-DD");
  var backURL = req.header('Referer') || '/?page=1&order=date';

  knex.select()
    .table('bookmarks')
    .where('url', '=', url)
    .then(function(row) {
      if (row.length >= 1) {
        res.render('error', { error: i18n.alreadySent, back: i18n.back });
      } else {
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
              res.redirect(backURL);
            })
          .catch(function(error) {
            console.log(error);
            res.render('error', { error: i18n.ops, back: i18n.back });
          });
        }
      }
    });
});

module.exports = router;
