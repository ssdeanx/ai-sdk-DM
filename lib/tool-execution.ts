// Calculator Tool Implementation - Real implementation
export async function calculator(expression: string) {
  console.log(`Calculating: ${expression}`)

  try {
    // Sanitize the expression to only allow safe characters
    const sanitizedExpression = expression.replace(/[^0-9+\-*/().]/g, "")

    // Use a safer approach than eval() - Function constructor with limited scope
    // Still has security implications but better than direct eval
    const calculate = new Function(`
      "use strict";
      return ${sanitizedExpression};
    `)

    // Execute the calculation in a controlled environment
    const result = calculate()

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
