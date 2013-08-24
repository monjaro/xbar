function is_string(s) {
    return s && (typeof s == "string" || s instanceof String);
};

function xbar(obj, spec, spec_args, head, complements, adjuncts, adjunct_args) {
    if (is_string(spec)) {
        spec = obj[spec];

        if (spec_args) {
            spec = spec.apply(obj, spec_args);
        }
    }

    spec = spec || function(head, complements) {
        return {field: obj[head], complements: complements};
    };

    var specd = spec.call(obj, head, complements);
    var field = specd.field;

    for (var i = 0; i < adjuncts.length; i++) {
        var oldField = field;
        var adj;
        if (is_string(adjuncts[i])) {
            adj = oldField[adjuncts[i]];

            if (adjunct_args[i]) {
                adj = adj.apply(oldField, adjunct_args[i]);
            }
        } else {
            adj = adjuncts[i];
        }
        field = adj(field);

        for (var key in oldField) {
            if (!(key in field)) {
                field[key] = oldField[key];
            }
        }
    }

    if (specd.complements) {
        return field.apply(obj, specd.complements);
    } else {
        return field;
    }
};

function add(a, b) {
    return a + b;
};

Array.prototype.map.except = function(n) {
    return function(func) {
        return function() {
            return func.apply(this.filter(function(x) { return x != n; }), arguments);
        };
    };
};

Array.prototype.map.but_not = function(n) {
    return function(func) {
        return function(f) {
            return func.call(this, function(x) {
                if (x == n) {
                    return x;
                } else {
                    return f(x);
                }
            });
        };
    };
};

Array.prototype.each = function(head, complements) {
    var func;
    if (is_string(head)) {
        func = function(x) {
            return x[head].apply(x, complements);
        };
    } else {
        func = function(x) {
            return head.apply(null, [x].concat(complements));
        };
    }

    return {
        field: this.map,
        complements: [func]
    };
};

Array.prototype.the = function(acc) {
    function where(qualifier) {
        return function(func) {
            return function(old_qualifier) {
                var new_qualifier = qualifier;
                if (old_qualifier) {
                    new_qualifier = function(x) {
                        return qualifier(x) && old_qualifier(x);
                    };
                }
                return func.call(this, new_qualifier);
            };
        };
    };

    function max(opt_qualifier) {
        var largest = -Infinity;
        for (var i = 0; i < this.length; i++) {
            if (!opt_qualifier || opt_qualifier(this[i])) {
                if (this[i] > largest) {
                    largest = this[i];
                }
            }
        }
        return largest;
    };
    max.where = where;


    if (acc == "largest") {
        return {field: max, complements: []};
    }
};

function lt(a, b) {
    return a - b;
};

Array.prototype.sort.by = function(compFun) {
    return function(func) {
        return function(optCompFun) {
            func.call(this, compFun);
        };
    };
};

function first_wait(time) {
    return function(func) {
        return function() {
            var that = this;
            var args = arguments;
            window.setTimeout(function() { func.apply(that, args); }, time);
        };
    };
};
