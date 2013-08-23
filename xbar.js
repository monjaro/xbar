function xbar(obj, spec, head_str, head_obj, complements, adjuncts) {
    var head = (head_str != undefined && obj[head_str] != undefined) ? head_str : head_obj;
    var specd = spec ? spec(head, complements): {head:head,complements:complements};
    var func = obj[specd.head];
    for (var i = 0; i < adjuncts.length; i++) {
        func = adjuncts[i](func);
    }
    return func.apply(obj, specd.complements);
};

function add(a, b) {
    return a + b;
};

function except(n) {
    return function(func) {
        return function() {
            return func.apply(this.filter(function(x) { return x != n; }), arguments);
        };
    };
};

function butNot(n) {
    return function(func) {
        return function(oldFunc) {
            return func.call(this, function(x) {
                if (x == n) {
                    return x;
                } else {
                    return oldFunc(x);
                }
            });
        };
    };
};

function each(head, complements) {
    return {
        head: "map",
        complements: [function(x) {
            return head.apply(null, [x].concat(complements));
        }]
    };
};
