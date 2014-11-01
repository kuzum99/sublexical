

var FeatureManager = (function($, undefined){

    var status_var;
    var table;
	var strItems = []; // string representations of items

    var status = function () {
        return status_var;
    }

    var features = function () {
        return table || {table: [], key: ""};
    }

    var loadFeatures = function (name) {

        var key = "";
        var items = [];
        strItems = []; 

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
                    
                    strItems.push({symbol: line[0], vector: line.slice(1).join()});
                    
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
        
        // Make sure that there are no two identically featured segments
		var identicals = [];    	
        for (var i=0;i<strItems.length;i++) {
			for (var j=i+1;j<strItems.length;j++) {
				if (i !== j) {
					var seg1_symbol = strItems[i].symbol;
					var seg2_symbol = strItems[j].symbol;
					if (strItems[i].vector === strItems[j].vector &&
					!((/g/.test(seg1_symbol) && /ɡ/.test(seg2_symbol))||(/g/.test(seg2_symbol) && /ɡ/.test(seg1_symbol)))
					) {
						console.log(seg1_symbol);
						console.log(seg2_symbol);
						identicals.push("[" + seg1_symbol + "] and [" + seg2_symbol + "]");
					}
				}
			}
		}
        if (identicals.length>0) {
        	if (identicals.length===1) {
		        throw new Error("These two segments have indistinguishable feature specifications in your feature file: " + identicals + ".");
        	} else {
		        throw new Error("The following pairs of segments have indistinguishable feature specifications in your feature file: " + identicals.join(", ") + ".");
        	}
        }

        return (items.length>0);
    }


    var compareSegments = function (segmentA, segmentB) {

        var getSymbol = function (symbol) {
                return table.table.subset("symbol",symbol)[0];
        }
		/*
		try { getSymbol(segmentA)
		} catch (err) {
            console.error("No such segment(s): " + segmentA);
			console.error(err.stack);
			return NaN;
		}
		try { getSymbol(segmentB)
		} catch (err) {
            console.error("No such segment(s): " + segmentB);
			console.error(err.stack);
			return NaN;
		}
		*/
		
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

    var getArbitrarySegment = function () {
        return table.table[1];
    }


    return {
    	getSegment: getSegment,
        getArbitrarySegment: getArbitrarySegment,
        loadFeatures: loadFeatures,
        features: features,
        status: status,
        compareSegments: compareSegments,
        naturalClass: naturalClass,
        table: table
    };

})(jQuery);




