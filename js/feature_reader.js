

var FeatureManager = (function($, undefined){

    var status_var;
    var table;

    var status = function () {
        return status_var;
    }

    var features = function () {
        return table || {table: [], key: ""};
    }

    var loadFeatures = function (name) {

        var key = "";
        var items = [];

        $.ajax({    // $ = jquery
            url: name,
            success: function(data) {   // executed if file `name` is read; data is content of `name`
                var lines = data.split(/[\n\r]/);
                var fields = lines[0].replace(/\s+$/, '').split("\t");
                key = fields[0]; //
                if (!fields.uniqueNonEmpty()) {
                    console.error("Field names in " + name + " must be unique and non-empty!");
                    return false;
                }
                var keys = []; // these are saved to be evaluated by uniqueNonEmpty()
                LINE: for (var i=1; i<lines.length; i++) {
                    if (lines[i].match(/^\s*$/)) {
                        continue LINE;
                    }
                    var line = lines[i].replace(/\s+$/, '').split("\t");
                    keys.push(line[0]);
                    var frame = {};
                    for (var j=0; j<line.length; j++) {
                        frame[ fields[j] ] = line[j];
                    }
                    //console.log(frame);
                    items.push(frame);
                }
                if(!keys.uniqueNonEmpty()) {
                    console.error("In " + name + ", the values of the first column must be unique and non-empty!");
                    return false;
                }
                status_var = true;
            },
            async: false,
            error: function() {
                console.error("The file " + name + " wasn't found.");
                status_var = false;
            }
        });

        table = {table: items, key: key};
        return (items.length>0);
    }


    var compareSegments = function (segmentA, segmentB) {

        var getSymbol = function (symbol) {
                return table.table.subset("symbol",symbol)[0];
        }

        if (!getSymbol(segmentA)) {
            console.error("No such segment(s): " + segmentA);
            return NaN;
        } else if (!getSymbol(segmentB)) {
            console.error("No such segment(s): " + segmentB);
            return NaN;
        }
        if (segmentA==segmentB) { return 0; };

        var cost = 0;
        for (var i in getSymbol(segmentA)) {
            if (getSymbol(segmentA)[i] === getSymbol(segmentB)[i]) {
                // if the two segments have the same value
                cost += 0;
            }
            else if (getSymbol(segmentA)[i] === "0" || getSymbol(segmentB)[i] === "0") {
                // cost of comparing underspecified features
                cost += .25;
            }
            else {
                // cost of mismatching specified features
                cost += 1;
            }
        }
        cost = Math.sqrt(cost);
        return cost;
    }

    var naturalClass = function(arr) {
        var segments = table.table.exclude("symbol", "empty");
        for (var i=0;i<arr.length;i++) {
            var feature = [arr[i][0], arr[i].slice(1)];
            segments = segments.subset(feature[1], feature[0]);
            //console.log(segments);
        }
        for (var i=0;i<segments.length;i++) {
            segments[i] = segments[i].symbol;
        }
       // console.log(segments)
        return segments.join("|");
    }

	var getSegment = function (symbol) {
			if (table.table.subset("symbol",symbol)[0]) {
				return table.table.subset("symbol",symbol)[0];
			} else {
				return undefined;
			}
	}


    return {
    	getSegment: getSegment,
        loadFeatures: loadFeatures,
        features: features,
        status: status,
        compareSegments: compareSegments,
        naturalClass: naturalClass,
        table: table
    };

})(jQuery);




