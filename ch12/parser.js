function parseExpression(program) {
  program = skip(program);
  let match, expression;
  if (match = /^\d+\b/.exec(program)) {
    expression = {
      type: "value",
      value: Number(match[0]),
    };
  } else if (match = /^"([^"]*)"/.exec(program)) {
    expression = {
      type: "value",
      value: match[1],
    }
  } else if (match = /^[^(),\s"#]+/.exec(program)) {
    expression = {
      type: "word",
      value: match[0],
    }
  } else {
    throw new SyntaxError(`Syntax error at: ${program}`);
  }

  return parseApplicationExpression(expression, program.slice(match[0].length));
}

function parseApplicationExpression(expression, program) {
  program = skip(program);
  if (program[0] != "(") {
    return {expression, program};
  }

  program = skip(program.slice(1));
  let args = [];
  while (program[0] != ")") {
    let {expression: e, program: p} = parseExpression(program);
    args.push(e);
    program = skip(p);
    if (program[0] == ",") {
      program = skip(p.slice(1));
      if (program[0] == ")") {
        throw new SyntaxError(`expected expression after ',' found ')': ${program}`);
      }
    } else if (program[0] != ")") {
      throw new SyntaxError(`expected ',' or ')', found: ${program}`);
    }
  }
  return parseApplicationExpression({
    type: "apply",
    operator: expression,
    args,
  }, program.slice(1));
}

function skip(str) {
  const skipRegExp = /^(\s+|#.*\n)*/g;
  let skipRes = skipRegExp.exec(str);
  return str.slice(skipRegExp.lastIndex);
}

function parse(program) {
  let {expression, program: rest} = parseExpression(program);
  if (skip(rest).length > 0) throw new SyntaxError(`Found invalid input at the end of program: ${rest}`);
  return expression;
}

specialForms = Object.create(null);

specialForms.do = function(args, scope) {
  let value = false;
  for (let arg of args) {
    value = evaluateExpression(arg, scope);
  }
  return value;
};

specialForms.define = function(args, scope) {
  if (args.length != 2) throw new Error("Wrong number of arguments for define");
  if (args[0].type == "word") {
    value = evaluateExpression(args[1], scope)
    scope[args[0].value] = value;
    return value;
  }
};

specialForms.fun = function(args, scope) {
  if (args.length < 1) throw new SyntaxError("Can't define function without body");
  let body = args[args.length - 1];
  let parameters = args.slice(0, args.length-1).map(arg => {
    if (arg.type != "word") throw new SyntaxError(`Parameter name ${arg} is not type word`);
    return arg.value;
  });

  return function(...arguments) {
    if (arguments.length != parameters.length) throw new Error("Invalid number of arguments for function");
    let funScope = Object.create(scope);
    for (let i = 0; i < parameters.length; i++) {
      funScope[parameters[i]] = arguments[i];
    }
    return evaluateExpression(body, funScope);
  } 
}

specialForms.if = function(args, scope) {
  if (args.length != 3) throw new Error("Wrong number of arguments for if");
  if (evaluateExpression(args[0], scope)) return evaluateExpression(args[1], scope);
  else return evaluateExpression(args[2], scope);
};

specialForms.while = function(args, scope) {
  if (args.length != 2) throw new Error("Wrong number of arguments for while");
  while (evaluateExpression(args[0], scope)) {
    evaluateExpression(args[1], scope);
  }
};

function evaluateExpression(expr, scope) {
  if (expr.type == "value") return expr.value;
  else if (expr.type == "word") {
    if (expr.value in scope) return scope[expr.value];
    throw new Error(`Runtime error: no declaration found for ${expr.value}`);
  } else if (expr.type == "apply") {
    let {operator: op, args} = expr;
    if (op.type == "word" && op.value in specialForms) {
      return specialForms[op.value](args, scope);
    } else {
      let fun = evaluateExpression(expr.operator, scope);
      if (typeof fun == "function") {
        return fun(...args.map(arg => evaluateExpression(arg, scope)));
      } else {
        throw new Error("Can't apply non-function.");
      }
    }
  }
}

const rootScope = Object.create(null);
for (let op of ["+", "-", "*", "%", "<", "<=", ">", ">+", "==", "!=",]) {
  rootScope[op] = new Function("a, b", `return a ${op} b`);
}
rootScope.print = console.log;
rootScope.false = false;
rootScope.true = true;
rootScope.array = function(...values) {
  return values;
};
rootScope.length = function(arg) {
  if (!Array.isArray(arg)) throw TypeError("Argument to length must have type array");
  return arg.length;
};
rootScope.element = function(arg, index) {
  if (!Array.isArray(arg)) throw TypeError("Argument to element must have type array");
  return arg[index];
};
function run(program) {
  return evaluateExpression(parse(program), Object.create(rootScope));
}

run(`
do(
  print(+(4, 5)),
  print(+(3, 5)),
  print(+(2, 5)),
  print(+(1, 5))
)
`);

run(`
do(define(total, 0),
   define(count, 1),
   while(<(count, 11),
         do(define(total, +(total, count)),
            define(count, +(count, 1)))),
   print(total))
`);

run(`if(true, false, true)`);

run(`
do(define(plusOne, fun(a, +(a, 1))),
   print(plusOne(10)))
`);
// → 11

run(`
do(define(pow, fun(base, exp,
     if(==(exp, 0),
        1,
        *(base, pow(base, -(exp, 1)))))),
   print(pow(2, 10)))
`);
// → 1024

run(`
do(define(sum, fun(array,
     do(define(i, 0),
        define(sum, 0),
        while(<(i, length(array)),
          do(define(sum, +(sum, element(array, i))),
             define(i, +(i, 1)))),
        sum))),
   print(sum(array(1, 2, 3))))
`);
// → 6

console.log(parse("# hello\nx"));
// → {type: "word", name: "x"}

console.log(parse("a # one\n   # two\n()"));
// → {type: "apply",
//    operator: {type: "word", name: "a"},
//    args: []}
