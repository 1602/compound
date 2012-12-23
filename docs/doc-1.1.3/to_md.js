/**
 * Converts our HTML file to Markdown files
 * !!! CAUTION: Bad code, this should be deprecated when the docs are done !!!
 */

var fs = require('fs')
  , jsdom = require('jsdom');

String.prototype.replaceCodeAndNL = function() {
  var text = this.replace(/<code>/ig, '`')
             .replace(/<\/code>/ig, '`')
             .replace(/^\s+|\s+$/ig, '')
             .replace(/\n\s+/ig, '\n');
  return text;
};

String.prototype.indent = function(indentation) {
  return indentation + this.split('\n').join('\n' + indentation);
};

var MarkDown = {
  init: function () {
    var data = fs.readFileSync('./index.html').toString();
    var self = this;
    jsdom.env(
      data, ["http://code.jquery.com/jquery.js"],
      function(errors, window) {
        self.generateMarkdownUsingWindow(window);
      }
    );
  },
  generateMarkdownUsingWindow: function (window) {
    var $ = window.$
      , content = ''
      , lastBigHeadlineId = '';
    $('section').each(function () {
      var section  = $(this);
      var items = section.find('> *');

      var headlineType = section.find('h1, h2, h3').first().get(0).nodeName.toLowerCase();



      if (headlineType === 'h1') {
        if (lastBigHeadlineId !== '') {
          fs.writeFileSync('markdown/' + lastBigHeadlineId + '.md', content);
          content = '';
        }
        lastBigHeadlineId = section.attr('id');
      }

      items.each(function() {
        var $item = $(this);
        var tag   = $item.get(0).nodeName.toLowerCase();

        if (tag === 'h1') {
          content += '# ' + $item.text() + '\n\n';
        } else if (tag === 'h2') {
          content += '## ' + $item.text() + '\n\n';
        } else if (tag === 'h3') {
          content += '### ' + $item.text() + '\n\n';
        } else if (tag === 'p') {
          $item.find('a').each(function() {
            var text = '[' + $(this).text() + '](' + $(this).attr('href') + ' "' + $(this).text() + '")';
            $(this).replaceWith(text);
          });

          content += $item
            .html().replaceCodeAndNL() + '\n\n';
        } else if (tag === 'pre') {
          content += '```\n' + $item.text().replace(/\n$/i, '') + '\n```\n\n';
        } else if (tag === 'ul') {
          $item.find('li').each(function() {
            var text = $(this).html().replaceCodeAndNL();
            content += '* ' + text + '\n';
          });
          content += '\n';
        } else if(tag === 'code') {
          content += '`' + $(this).html() + '`\n';
        }
      });
    });
  }
};

MarkDown.init();