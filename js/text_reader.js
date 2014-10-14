

var FileManager = (function($, undefined){

    var status_var;
    var items = [];

    var status = function () {
        return status_var;
    }

    var loadText = function (name) {

        $.ajax({
            url: name,
            success: function(data) {   // executed if file `name` is read; data is content of `name`
                items = [];
                var lines = data.split(/[\n\r]/);
                LINE: for (var i=0; i<lines.length; i++) {
                    if (lines[i].match(/^\s*$/)) {
                        continue LINE;
                    }
                    var line = lines[i].replace(/\s+$/, '').replace(/\s+\t/, '\t').split("\t");
                    items.push(line);
                }
                status_var = true;
            },
            async: false,
            error: function() {
                console.error("The file " + name + " wasn't found.");
                status_var = false;
            }
        });
        return (status_var);
    }
    
    var loadJSON = function (name, async, successFunction) {

		async = async || false;
		successFunction = successFunction || function(data) {
	            items.push(data);
                status_var = true;
        };

        items = [];
        $.ajax({
	        dataType: "json",
            async: async,
            url: name,
            success: successFunction,
            error: function() {
                console.error("The file " + name + " could not be read successfully. Most likely, it is not well-formed JSON. Use a JSON validator.");
                status_var = false;
            }
        });
        return (items.length>0);
    }


    var loadJSONP = function (name, successFunction) {

		successFunction = successFunction || function(data) {
	            items.push(data);
                status_var = true;
        };

        items = [];
        $.ajax({
	        dataType: "jsonp",
            url: name,
            success: successFunction,
            error: function() {
                console.error("The file " + name + " could not be read successfully. Most likely, it is not well-formed JSON. Use a JSON validator.");
                status_var = false;
            }
        });
        return (items.length>0);
    }

	var stringToTable = function(str) {

		var table = [];
		var lines = str.split(/[\n\r]/);
		for (var i=0; i<lines.length; i++) {
			if (lines[i].match(/^\s*$/)) {
				continue;
			}
			var line = lines[i].replace(/\s+$/, '').replace(/\s+\t/, '\t').split("\t");
			table.push(line);
		}
		return table;
	}



    var get = function () {
        return items;
    }

    return {
        loadText: loadText,
        loadJSON: loadJSON,
        loadJSONP: loadJSONP,
        status: status,
        stringToTable: stringToTable,
        get: get,
    };

})(jQuery);




