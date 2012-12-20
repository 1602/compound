var fs = require('fs');
var path = require('path');
var Module = require('module').Module;
var cs = require('coffee-script');
var _ = require("underscore");
var format = require("util").format;

module.exports = function (rw) {

    return function () {
        return {
            views: read('app/views', 'view'),
            helpers: read('app/helpers', true),
            controllers: read('app/controllers'),
            models: read('app/models', true)
        }
    };

    function read(dir, doRequire, cts, prefix) {
        var contents = cts || {};
        var abspath = rw.app.root + '/' + dir;
        prefix = prefix || '';

        if (fs.existsSync(abspath)) {
            fs.readdirSync(abspath).forEach(readAndWatch);
        }

        return contents;

        function readAndWatch(filename) {
            if (filename.match(/^\./)) {
                // skip files starting with point
                return;
            }
            var file = abspath + '/' + filename;
            var ext = filename.split('.').pop();
            if (fs.statSync(file).isDirectory()) {
                read(dir + '/' + filename, doRequire, contents, prefix + filename + '/');
            } else {
                var name = prefix + filename.replace('.' + ext, '');
                contents[name] =
                    doRequire ?
                    requireFile(file, doRequire, rw.app) :
                    fs.readFileSync(file).toString();

                if (ext === 'coffee' && !doRequire) {
                    contents[name] = cs.compile(contents[name]);
                }

                if (rw.app.enabled('watch')) {

                    fs.watch(file, function () {
                        if (doRequire) {
                            delete Module._cache[file];
                            contents[name] = requireFile(file, doRequire, rw.app);
                        } else {
                            contents[name] = fs.readFileSync(file).toString();

                            if (ext === 'coffee') {
                                contents[name] = cs.compile(contents[name]);
                            }

                        }
                    });
                }
            }
        }
    }
};

// app included to allow for app options
function requireFile(file, how, app) {
    if (how === true) {
    	return require(file);
    }
    
    if (how === 'view') {
        var ext = file.split('.').pop();
        if (ext !== 'ejs' && ext !== 'jade') {
        	throw new Error('Only ejs and jade templates supported');
        }
        
        var templateOptions = {filename: file};
        /*
         * allow general template options to be set in environment.js
         * ie app.set('jade options', {pretty:true, compileDebug: true});
         */
        if (app.get(format("%s options",ext)) && _.isObject(app.get(format("%s options",ext)))) {
        	templateOptions = _.extend(templateOptions, app.get(format("%s options",ext)));
        }
        
        /*
        * Allow debugging of specific templates using
        *  app.get("jade debug template", ['filename'])
        */
        if (!_.isEmpty(app.get(format("%s debug template",ext)))) {
        	if (_.isArray(app.get(format("%s debug template",ext)))) {
		    	templateOptions.debug = 
		    		!_.isEmpty(
						_.find(app.get(format("%s debug template",ext)), 
						function(searchName){
							return !_.isEmpty(file.match(searchName));
						})
					);
        	}
        }
        
        /*
        if (file == "/home/dasher/Development/workspaces/coinage/app/views/layouts/dash_layout.jade") {
        	templateOptions.debug = true;
        }
        */
        
        /*
        * Wrap the compiling to allow for controller injection of extends
        */
        //console.log(format("templateOptions for %s", file), templateOptions);
        var fnWraper = function(params) {
        	var templateContents = fs.readFileSync(file, "utf8");

        	if (_.has(params,"extendsTemplate")) {
        		//console.log("matched extendsTemplate with "+file);
        		templateContents = format("extends ../%s\n", params.extendsTemplate) + templateContents;
        	}

        	return require(ext).compile(templateContents, templateOptions)(params);
        }
        return fnWraper;
    }
};
