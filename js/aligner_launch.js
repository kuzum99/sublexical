$(document).ready(function(){

    Aligner.initialize({
        onscreen: true,
        FeatureManager: FeatureManager,
        features: true,
        insert_delete: 1.5,
        substitution: 2,
        swap: 8,
        tolerance: 0,
        debug: false,
    });

//  Aligner.align("b \u0279 \u028c \u0283","b \u0279 \u028c \u0283 \u026a z");
//  Aligner.align("h a \u028a s","h a \u028a z \u026a z");
    Aligner.align("k \u00e6 t ","k \u00e6 t s");
    Aligner.updatePage();

});
