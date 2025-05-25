'use client';

import { useState } from 'react';
import { Play, Loader2, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToolExecutor } from '@/lib/shared/hooks/use-executor';

interface ToolExecutorProps {
  tool: {
    id: string;
    name: string;
    description: string;
    parameters_schema: string;
  };
  onExecutionComplete?: (result: any) => void;
}

export function ToolExecutor({ tool, onExecutionComplete }: ToolExecutorProps) {
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  // Use our custom hook for tool execution
  const { executeTool, isExecuting } = useToolExecutor({
    toolId: tool.id,
    onSuccess: (data) => {
      setResult(data.result);
      if (onExecutionComplete) {
        onExecutionComplete(data.result);
      }
    },
  });

  // Parse the schema
  let schema: any = {};
  try {
    schema = JSON.parse(tool.parameters_schema);
  } catch (error) {
    console.error('Invalid schema:', error);
  }

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const executeToolAction = async () => {
    setResult(null);
    try {
      // Use our custom hook to execute the tool
      await executeTool(parameters);
    } catch (error) {
      console.error('Error executing tool:', error);
      // Error handling is done in the hook
    }
  };

  // Check if all required parameters are filled
  const requiredParams = schema.required || [];
  const isFormValid = requiredParams.every(
    (param: string) => parameters[param] && parameters[param].trim() !== ''
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Execute: {tool.name}</span>
          <Badge variant="outline">{schema.type || 'object'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          {tool.description}
        </div>

        {schema.properties &&
          Object.entries(schema.properties).map(
            ([key, prop]: [string, any]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center">
                  <label
                    htmlFor={`param-${key}`}
                    className="text-sm font-medium"
                  >
                    {key}
                    {requiredParams.includes(key) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {prop.type && (
                    <Badge variant="outline" className="ml-2">
                      {prop.type}
                    </Badge>
                  )}
                </div>
                {prop.description && (
                  <div className="text-xs text-muted-foreground">
                    {prop.description}
                  </div>
                )}
                <Input
                  id={`param-${key}`}
                  value={parameters[key] || ''}
                  onChange={(e) => handleParameterChange(key, e.target.value)}
                  placeholder={`Enter ${key}...`}
                />
              </div>
            )
          )}

        {result && (
          <div className="mt-4 space-y-2">
            <div className="font-medium flex items-center">
              <FileJson className="mr-2 h-4 w-4" />
              Result
            </div>
            <pre className="bg-muted p-3 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={executeToolAction}
          disabled={isExecuting || !isFormValid}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute Tool
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
