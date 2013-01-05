/**
 * Builds docs from source files
 */
var exec = require('child_process').exec;
var watch = (process.argv[2] == '--watch')
  , command
  , cwd = process.cwd()
  , util = require('util')
  , fs = require('fs')
  , marked = require('marked');

marked.setOptions({ gfm: true });

var template = fs.readFileSync(__dirname + '/template.html')
  , sections = [
    'routing',
    'controllers',
    'views',
    'orm',
    'repl',
    'localization',
    'generators',
    'asset-compiler',
    'extension-api',
    'heroku',
    'code-snippets',
    'about'
  ];

String.prototype.inlineLexer = function() {
  var text = this;
  text = text.replace(/`(.*?)`/ig, '<code>$1</code>');
  text = text.replace(/<strong>(.*?)<\/strong>/ig, '<code>$1</code>');
  text = text.replace(/\[(.*?)\]\((.*?)\)/ig, '<a href="$2" target="_blank">$1</a>');
  return text;
}

String.prototype.slugify = function () {
  var text = this;
  text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
  text = text.replace(/-/gi, "_");
  text = text.replace(/\s/gi, "-");
  return text.toLowerCase();
};

/**
 * Compile stylus files
 */
command = 'stylus ' + (watch ? '-w' : '') + ' -o ' + cwd + '/stylesheets ' + cwd + '/src/stylesheets/application.styl';
var stylusProcess = exec(command);
stylusProcess.stdout.on('data', function (data) {
  util.print(data);
});

/**
 * Create HTML from Markdown files
 */
var content = ''
  , headingsCount = 0;

console.log("Building documentation from " + sections.length + " sections...");
sections.forEach(function (section) {
  var sectionData = fs.readFileSync(__dirname + '/markdown/' + section + '.md');

  console.log("Building section " + section + "...");

  if (!sectionData) {
    return false;
  } else {
    sectionData = sectionData.toString();
  }

  var lexed = marked.lexer(sectionData);
  lexed.forEach(function (node) {
    switch (node.type) {
      case 'heading':
        if (headingsCount !== 0)
          content += '</section>\n\n';

        var node_id = section + '-' + node.text.slugify();

        content += '<section id="' + node_id + '">\n';

        content += '<h' + node.depth + '>' + node.text + '</h' + node.depth + '>\n\n';

        headingsCount++;
        break;
      case 'paragraph': 
        var text = node.text;

        // Code-only paragraph, make code node
        if (match = text.match(/^`(.*)`\n?$/i)) {
          content += '<code>' + match[1] + '</code>';
          break;
        }

        text = text.inlineLexer();

        content += '<p>\n';
        content += text;
        content += '</p>\n\n';
        break;
      case 'code':
        content += '<pre class="prettyprint">\n';
        content += node.text.replace(/</ig, '&lt;').replace(/>/ig, '&gt;');
        content += '\n</pre>\n\n';
        break
      case 'list_start':
        content += '<ul>\n';
        break;
      case 'list_item_start':
        content += '<li>';
        break;
      case 'list_item_end':
        content += '</li>\n';
        break;
      case 'list_end':
        content += '</ul>\n';
        break;
      case 'text':
      case 'html':
        var text = node.text;
        content += text;
        break;
    };
  });
});

content += '</section>';

console.log("Documentation built!");
/**
 * Save file
 */
fs.writeFileSync(__dirname + '/index.html', template.toString().replace('{{ CONTENT }}', content));
