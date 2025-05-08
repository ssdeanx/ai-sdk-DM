// components/chat/middleware-config.tsx
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
interface MiddlewareConfigProps {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  }
  reasoning: {
    enabled: boolean;
    tagName: string;
    startWithReasoning: boolean;
  }
  simulation: {
    enabled: boolean;
  };
  logging: {
    enabled: boolean;
    logParams: boolean;
    logResults: boolean;
  }
  onChange: (config: any) => void;
}
export function MiddlewareConfig({
  caching,
  reasoning,
  simulation,
  logging,  onChange
}: MiddlewareConfigProps) {  return (
    <Card>      <CardHeader>
        <CardTitle>Middleware Configuration</CardTitle>      </CardHeader>
      <CardContent className="space-y-4">        <div className="space-y-2">
          <div className="flex items-center justify-between">            <Label htmlFor="caching-enabled">Enable Caching</Label>
            <Switch              id="caching-enabled"
              checked={caching.enabled}              onCheckedChange={(checked) => 
                onChange({ caching: { ...caching, enabled: checked } })              }
            />          </div>
          {caching.enabled && (            <div className="space-y-2 pl-4 mt-2">
              <div className="space-y-1">                <Label htmlFor="caching-ttl">Cache TTL (ms): {caching.ttl}</Label>
                <Slider                  id="caching-ttl"
                  min={1000}                  max={300000}
                  step={1000}                  value={[caching.ttl]}
                  onValueChange={(value) =>                     onChange({ caching: { ...caching, ttl: value[0] } })
                  }                />
              </div>              <div className="space-y-1">
                <Label htmlFor="caching-max-size">Max Cache Size: {caching.maxSize}</Label>                <Slider
                  id="caching-max-size"                  min={10}
                  max={500}                  step={10}
                  value={[caching.maxSize]}                  onValueChange={(value) => 
                    onChange({ caching: { ...caching, maxSize: value[0] } })                  }
                />              </div>
            </div>          )}
        </div>        
        {/* Similar sections for reasoning, simulation, and logging */}      </CardContent>
    </Card>
  )
}














































