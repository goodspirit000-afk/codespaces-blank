const equationInput = document.getElementById('equation');
const valuesInput = document.getElementById('values');
const solveForInput = document.getElementById('solveFor');
const solveBtn = document.getElementById('solveBtn');
const resultArea = document.getElementById('result');

function parseValues(text) {
  const values = {};
  text.split(',').forEach(pair => {
    const [left, right] = pair.split('=').map(str => str.trim());
    if (left && right !== undefined) {
      values[left] = right;
    }
  });
  return values;
}

function normalizeEquation(eq) {
  return eq.replace(/\s+/g, '').replace('\u2212', '-');
}

function solvePhysicsEquation() {
  const rawEquation = equationInput.value.trim();
  const rawValues = valuesInput.value.trim();
  const solveFor = solveForInput.value.trim();

  if (!rawEquation) {
    showResult('Please enter a valid physics equation.', 'error');
    return;
  }

  const values = parseValues(rawValues);
  const equation = rawEquation.replace(/\s+/g, '');
  const match = equation.match(/^(.+?)=(.+)$/);

  if (!match) {
    showResult('Equation must include an equals sign, e.g. F = m * a.', 'error');
    return;
  }

  const left = match[1];
  const right = match[2];
  const variable = solveFor || findUnknownVariable(equation, values);

  if (!variable) {
    showResult('Enter the variable you want to solve for, or provide values so one unknown can be inferred.', 'error');
    return;
  }

  try {
    const { leftExpr, rightExpr } = substituteValues(left, right, values);
    const solveExpression = `${leftExpr} - (${rightExpr})`;
    const solution = nerdamer.solve(solveExpression, variable);
    const solutionText = solution.text ? solution.text() : solution.toString();

    if (!solutionText) {
      showResult('Could not solve the equation symbolically. Try a simpler physics equation or specify a different variable.', 'error');
      return;
    }

    const substituted = applyValuesToSolution([solutionText], values, variable);
    showResult(`Equation: ${rawEquation}\nSolve for: ${variable}\nResult: ${substituted || solutionText}`, 'success');
  } catch (error) {
    showResult(`Error: ${error.message || error}`, 'error');
  }
}

function substituteValues(left, right, values) {
  let leftExpr = left;
  let rightExpr = right;
  for (const [name, value] of Object.entries(values)) {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    leftExpr = leftExpr.replace(regex, `(${value})`);
    rightExpr = rightExpr.replace(regex, `(${value})`);
  }
  return { leftExpr, rightExpr };
}

function applyValuesToSolution(solution, values, variable) {
  return solution.map(expr => {
    let substituted = expr;
    for (const [name, value] of Object.entries(values)) {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      substituted = substituted.replace(regex, `(${value})`);
    }
    try {
      return `${variable} = ${nerdamer(substituted).evaluate().text()}`;
    } catch {
      return `${variable} = ${substituted}`;
    }
  }).join(', ');
}

function findUnknownVariable(equation, values) {
  const variablePattern = /[a-zA-Z]\w*/g;
  const tokens = equation.match(variablePattern) || [];
  const unique = [...new Set(tokens.filter(token => !/^\d+$/.test(token)))];
  const unknowns = unique.filter(token => !(token in values));
  return unknowns.length === 1 ? unknowns[0] : '';
}

function showResult(message, type) {
  resultArea.textContent = message;
  resultArea.className = `result ${type}`;
}

solveBtn.addEventListener('click', solvePhysicsEquation);
