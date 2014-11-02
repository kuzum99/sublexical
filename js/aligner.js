
var Aligner = (function($, undefined){

    var initialized = false;
    var current_state = null; // holds the current alignement and stuff

	var defaultFeatureFile = "lib/default_feature_file.txt";

    var _log = function (message) {
        console.log(message);
        //GUI.log(message);
    }

    var parameters = {
        features: true,
        insert_delete: 0,
        substitution: 0,
        swap: 0,
        tolerance: 0,
        symbols: {table: [], key: ""},
        debug: false,
        onscreen: false
    }

    var parameter = function (param, value) {
        // to do: check that the parameter is public
        if (value===undefined) {
            return parameters[param];
        } else {
            if (parameters[param]!==undefined) {
                parameters[param] = value;
                return value;
            } else {
                return null;
            }
        }
    }






    var makeSimilarityMatrix = function (arr1, arr2) {

        var d = [[]]; // similarity matrix
        arr1 = arr1 || [];
        arr2 = arr2 || [];

        var compare = function (x, y) {
            return x-y <= parameter("tolerance");
        }

        // initialization of 2-dimensional array
        for (var x = 0; x <= arr1.length; x++) {
            d[x] = [];
            for (var y = 0; y <=arr2.length; y++) {
                d[x][y] = {
                    aboveleft: 0,
                    above: 0,
                    left: 0,
                    swap: 0,
                    trace: 0,
                    f: null
                }
            }
        }
        d[0][0].f = 0;

        for (var x = 1; x <= arr1.length; x++) {
            d[x][0].f = d[x-1][0].f + compareToEmpty(arr1[x-1]);
            d[x][0].left = 1;
        }
        for (var y = 1; y <= arr2.length; y++) {
            d[0][y].f = d[0][y-1].f + compareToEmpty(arr2[y-1]);
            d[0][y].above = 1;
        }

        for (var x = 1; x <= arr1.length; x++) {
            for (var y = 1; y <= arr2.length; y++) {
                var aboveleft = d[x - 1][y - 1].f + compareSegments(arr1[x-1], arr2[y-1]);
                var left      = d[x - 1][y    ].f + compareToEmpty(arr1[x-1]);
                var above     = d[x    ][y - 1].f + compareToEmpty(arr2[y-1]);

                var farpoint = Infinity;
                if (x >= 2 && y >= 2 && arr2[y-1]===arr1[x-2] && arr2[y-2]===arr1[x-1]) {
                    farpoint = d[x-2][y-2].f + swapSegments(arr2[y-1], arr1[x-1]);
                }

                if (compare(aboveleft,above) && compare(aboveleft,left) && compare(aboveleft,farpoint)) {
                    d[x][y].f = aboveleft;
                    d[x][y].aboveleft = 1;
                }
                if (compare(above,aboveleft) && compare(above,left) && compare(above,farpoint)) {
                    d[x][y].f = above;
                    d[x][y].above = 1;
                }
                if (compare(left,aboveleft) && compare(left,above) && compare(left,farpoint)) {
                    d[x][y].f = left;
                    d[x][y].left = 1;
                }
                if (compare(farpoint,aboveleft) && compare(farpoint,above) && compare(farpoint,left)) {
                    d[x][y].f = farpoint;
                    d[x][y].swap = 1;
                }
                d[x][y].f = Math.min(aboveleft, above, left, farpoint);
            }
        }

        return d;
    }

    var generateAlignments = function(arr1, arr2, d) {

        var alignments = [];

        // this inner function traverses the similarity matrix and generates
        // all the possible paths through it
        var generateAlignments_rec = function (arr1, arr2, d, x, y, current_alignment) {

            var current_element;
            current_alignment = current_alignment || [];
            if (x===undefined) { x = arr1.length; }
            if (y===undefined) { y = arr2.length; }

            if (x > 0 || y > 0) {
                // we haven't reached the top-left yet, so we keep moving there
                if (d[x][y].swap && x > 1 && y > 1) {
                    current_element = { elem1: [arr1[x-2], arr1[x-1]] , elem2: [arr2[y-2], arr2[y-1]] , dir: "swap"  };
                    generateAlignments_rec(arr1, arr2, d, x-2, y-2, [].concat(current_element,current_alignment));
                }
                if (d[x][y].aboveleft) {
                    current_element = { elem1: [arr1[x-1]] , elem2: [arr2[y-1]]  , dir: "aboveleft" };
                    generateAlignments_rec(arr1, arr2, d, x-1, y-1, [].concat(current_element,current_alignment));
                }
                if (d[x][y].above) {
                    current_element = { elem1: [null] , elem2: [arr2[y-1]] , dir: "above"  };
                    generateAlignments_rec(arr1, arr2, d, x  , y-1, [].concat(current_element,current_alignment));
                }
                if (d[x][y].left) {
                    current_element = { elem1: [arr1[x-1]] , elem2: [null] , dir: "left" };
                    generateAlignments_rec(arr1, arr2, d, x-1, y,   [].concat(current_element,current_alignment));
                }
            } else {
                // reached the top-left: time to return an alignment
                alignments.push(current_alignment);
            }
        };

        generateAlignments_rec(arr1, arr2, d);
        return alignments;
    }



    var compareSegments = function (segmentA, segmentB) {

        if (parameter("features")) {
            return FeatureManager.compareSegments(segmentA, segmentB);
        } else {
            return (segmentA===segmentB) ? 0 : parameter("substitution");
        }
    }
    var compareToEmpty = function(segmentA) {

        if (parameter("features")) {
            return compareSegments(segmentA, "empty");
        } else {
            return parameter("insert_delete");
        }
    }
    var swapSegments = function(segmentA, segmentB) {

        if (parameter("features")) {
            return compareSegments(segmentA, segmentB) + parameter("swap");
        } else {
            return parameter("swap");
        }
    }


    var initialize = function (obj) {

        _log("Initializing Aligner.");
        
        var obj = obj || {};

        var FeatureManager = obj.FeatureManager || null;
        var featureFile = obj.featureFile || defaultFeatureFile;
        var features = (obj.features===false) ? false : true;

        var insert_delete = parseFloat(obj.insert_delete) || 1;
        var substitution = parseFloat(obj.substitution) || 1;
        var swap = parseFloat(obj.swap) || 1;
        var tolerance = parseFloat(obj.tolerance) || 0;

        var debug = obj.debug || false;
        var onscreen = obj.onscreen || false;

        if (FeatureManager) {
        	if (typeof featureFile==="string") {
   	        	console.log("Feature file: " + featureFile );
        	} else {
   	        	console.log("Feature file: " + featureFile.name );
        	}
            FeatureManager.loadFeatures(featureFile);
            if (FeatureManager.status()) {
                parameter("symbols", FeatureManager.features());
                parameter("features", features);
            } else {
                // override user's choice in the absence of a good feature file
                parameter("features", false);
            }
        } else {
            parameter("features", false);
        }


        parameter("insert_delete", insert_delete);
        parameter("substitution", substitution);
        parameter("swap", swap);
        parameter("tolerance", tolerance);
        parameter("debug", debug);
        parameter("onscreen", onscreen);

        if (onscreen) {
            initializeSliders(this);
            toggleFeatures(parameter("features"));
            $("#features_checkbox").on("click", function(e) {
                toggleFeatures();
            });
            $("#text1").keyup(function(e) {
                updatePage(true);
            });
            $("#text2").keyup(function(e) {
                updatePage(true);
            });
        }

        initialized = true
        _log("Aligner initialized.");
    }

    var toggleFeatures = function(bool) {
        var f = (bool===true||bool===false) ? bool : !parameter("features");
        parameter("features",f);
        $("#features_checkbox").prop("checked", parameter("features"))
        $("#insert_delete_slider").slider("option", "disabled", parameter("features"));
        $("#substitution_slider").slider("option", "disabled", parameter("features"));
        //do not disable swap, ever $("#swap_slider").slider("option", "disabled", parameter("features"));
        if(bool===undefined) { updatePage(true); }
    }

    var initializeSliders = function (obj) {
        var that = obj; // the context of the Aligner object
        $("#insert_delete_slider").slider({
            min: 10,
            max: 1000,
            value: that.parameter("insert_delete")*100,
            create: function(event, ui) {
                $("#insert_delete_slider_value").html(that.parameter("insert_delete"));
            },
            slide: function(event, ui) {
                $("#insert_delete_slider_value").html(ui.value/100);
            },
            change: function(event, ui) {
                //console.log(this.id);
                that.parameter("insert_delete",  ui.value/100);
                updatePage(true);
            }
        });
        $("#substitution_slider").slider({
            min: 10,
            max: 1000,
            value: that.parameter("substitution")*100,
            create: function(event, ui) {
                $("#substitution_slider_value").html(that.parameter("substitution"));
            },
            slide: function(event, ui) {
                $("#substitution_slider_value").html(ui.value/100);
            },
            change: function(event, ui) {
                that.parameter("substitution", ui.value/100);
                updatePage(true);
            }
        });
        $("#swap_slider").slider({
            min: 10,
            max: 1000,
            value: that.parameter("swap")*100,
            create: function(event, ui) {
                $("#swap_slider_value").html(that.parameter("swap"));
            },
            slide: function(event, ui) {
                $("#swap_slider_value").html(ui.value/100);
            },
            change: function(event, ui) {
                that.parameter("swap", ui.value/100);
                updatePage(true);
            }
        });
        $("#tolerance_slider").slider({
            min: 0,
            max: 1000,
            value: that.parameter("tolerance")*100,
            create: function(event, ui) {
                $("#tolerance_slider_value").html(that.parameter("tolerance"));
            },
            slide: function(event, ui) {
                $("#tolerance_slider_value").html(ui.value/100);
            },
            change: function(event, ui) {
                that.parameter("tolerance", ui.value/100);
                updatePage(true);
            }
        });
    }

    var updatePage = function (readFromPage) {

        if (initialized && parameter("onscreen")) {

            if (readFromPage) {
                // no alignment given, read from interface
                var str1 = $('#text1').prop("value") || "";
                var str2 = $('#text2').prop("value") || "";
                align(str1, str2);
            } else {
                // alignment given, write to interface
                $('#text1').prop("value",current_state.arr1.join(" "));
                $('#text2').prop("value",current_state.arr2.join(" "));
            }

            printSimilarityMatrix(current_state.arr1, current_state.arr2, current_state.d, "scores");
            printBackTrack(current_state.alignments, "alignment");
            var message;
            if (current_state.alignments.length===0) {
                message = "No alignments generated";
            } else if (current_state.alignments.length===1) {
                message = "1 alignment generated";
            } else {
                message = current_state.alignments.length + " alignments generated";
            }
            message += " out of a total of " + countAlignments(current_state.arr1.length, current_state.arr2.length) + ".";
            $("#alignment_counter").html(message);
        }
    }


    var countAlignments = function(n, k){

        n = n || 0;
        k = k || 0;

        var binom = function (n, k) {
            var result = 1;
            for (var i = 1; i < k + 1; i++) {
                result *= (n - i + 1) / i;
            }
            return result;
        }

        var total = 0;
        for (var d=0; d <= Math.min(n,k) ; d++) {
            total += Math.pow(2,d) * binom(n,d) * binom(k,d);
        }
        return total;
    }




    var align = function (str1, str2) {

        var arr1 = (str1 || "").trim().split(/ +/);
        var arr2 = (str2 || "").trim().split(/ +/);
        if (initialized) {
            var d = makeSimilarityMatrix(arr1, arr2);
            var alignments = generateAlignments(arr1, arr2, d);
            current_state = {arr1: arr1, arr2: arr2, d: d, alignments: alignments};
            return alignments;
        } else {
            return null;
        }
    }









    var printSimilarityMatrix = function (arr1, arr2, simMatrix, destination) {
        //console.log(simMatrix);

        arr1 = arr1 || [];
        arr2 = arr2 || [];
        simMatrix = simMatrix || [[]];

        var Round = function (Number, DecimalPlaces) {
           return Math.round(parseFloat(Number) * Math.pow(10, DecimalPlaces)) / Math.pow(10, DecimalPlaces);
        }

        var html = '<table>';
        for(var i=0; i<=arr2.length+1; i++) {
            html += '<tr>';
            for (var j=0; j<=arr1.length+1; j++) {
                // determine type of current cell
                var celltype = "empty";
                var id = "matrix_" + (j-1) + "_" + (i-1);

                if (i===1 && j>0 || j===1 && i>1) { celltype = "headers" };
                if (i===0 && j>1 || j===0 && i>1) { celltype = "symbols" };
                if (i>1 && j>1)                   { celltype = "plain" };
                if (i===arr2.length+1 && j===arr1.length+1)  { celltype = "finaldistance" };

                html += '<td id="' + id + '" class="' + celltype + (i&&j&&simMatrix[j-1][i-1].trace? ' trace':'') + '">';
                if (celltype==="symbols") {
                    html += (i===0) ? arr1[j-2] : arr2[i-2];
                } else if (celltype!=="empty") {
                    if (parameter("debug")) {
                        html += 'f: '   + Round(simMatrix[j-1][i-1].f,2) +
                        '<br>al: '      + Round(simMatrix[j-1][i-1].aboveleft,2) +
                        '<br>above: '   + Round(simMatrix[j-1][i-1].above,2) +
                        '<br>left: '    + Round(simMatrix[j-1][i-1].left,2) +
                    //    '<br>trace: '   + Round(simMatrix[j-1][i-1].trace,2) +
                        '<br>swap: '    + Round(simMatrix[j-1][i-1].swap,2);
                    } else {
                        html += Round(simMatrix[j-1][i-1].f,2);
                    }
                } else {
                    //html += "";
                }
                html += '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';

        if ($("#" + destination)) {
            $("#" + destination).html(html);
            return true;
        } else {
            return false;
        }
    }

    var printBackTrack = function (alignments, destination, emptySymbol) {

        alignments = alignments || [[]];
        emptySymbol = emptySymbol || "_";

        var html = "";
        for (var al = 0; al < alignments.length; al++) {

            var path = [];
            for (var i=0; i<alignments[al].length; i++) {
                path.push(alignments[al][i].dir || emptySymbol);
            }

            html += '<table class="align" onmouseover="Aligner.showPath(this);" id=' + path.toString() + '>';
            html += '<tr>';
            for (var i=0; i<alignments[al].length; i++) {
                html += '<td>' + (alignments[al][i].elem1 || emptySymbol) + '</td>';
            }
            html += '</tr>';
            html += '<tr>';
            for (var i=0; i<alignments[al].length; i++) {
                html += '<td>' + (alignments[al][i].elem2 || emptySymbol) + '</td>';
            }
            html += '</tr>';
            html += '</table>';
        }

        if ($("#" + destination)) {
            $("#" + destination).html(html);
            return true;
        } else {
            return false;
        }
    }

    var showPath = function (elem) {

        $("#scores td").removeClass('trace'); // remove previous trace

        var path = $(elem).attr('id').split(",") || []; // read path from id
        var x = current_state.arr1.length;
        var y = current_state.arr2.length;

        $("#matrix_" + x + "_" + y).attr('class','trace');
        for (var i = path.length-1; i>=0; i--) {
            if (path[i]==="swap") {
                x-= 2;
                y-= 2;
            }
            if (path[i]==="aboveleft") {
                x--;
                y--;
            }
            if (path[i]==="above") {
                y--;
            }
            if (path[i]==="left") {
                x--;
            }
            $("#matrix_" + x + "_" + y).attr('class','trace');
        }
    }



    return {
        parameter: parameter,
        initialize: initialize,
        updatePage: updatePage,
        align: align,
        showPath: showPath,
        FeatureManager: FeatureManager,
        defaultFeatureFile: defaultFeatureFile
    };

})(jQuery);






























