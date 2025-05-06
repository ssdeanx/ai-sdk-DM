// Calculator Tool Implementation - Real implementation
export async function calculator(expression: string) {
  console.log(`Calculating: ${expression}`)

  try {
    // Validate input first
    if (!expression || typeof expression !== 'string') {
      return {
        expression: String(expression),
        result: null,
        error: "Invalid input: Expression must be a non-empty string"
      }
    }

    // Sanitize the expression to only allow safe characters
    const sanitizedExpression = expression.replace(/[^0-9+\-*/().]/g, "")
    
    // Check if sanitization removed all content
    if (!sanitizedExpression || sanitizedExpression.trim() === '') {
      return {
        expression,
        result: null,
        error: "Invalid expression: Contains unsupported characters"
      }
    }

    // Use a safer approach than eval() - Function constructor with limited scope
    const calculate = new Function(`
      "use strict";
      return ${sanitizedExpression};
    `)

    // Execute the calculation in a controlled environment
    const result = calculate()
    
    // Validate the result
    if (result === Infinity || result === -Infinity) {
      return {
        expression: sanitizedExpression,
        result: null,
        error: "Division by zero"
      }
    }
    
    if (isNaN(result)) {
      return {
        expression: sanitizedExpression,
        result: null,
        error: "Result is not a number"
      }
    }

    return {
      expression: sanitizedExpression,
      result: result.toString(),
      error: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      expression,
      result: null,
      error: "Invalid expression: " + errorMessage,
    }
  }
}

