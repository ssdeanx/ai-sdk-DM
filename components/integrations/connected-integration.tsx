'use client';

import { ReactNode } from 'react';
import { format } from 'date-fns';
import { Check, MoreHorizontal, Settings } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ConnectedIntegrationProps {
  name: string;
  accountName: string;
  connectedAt: string;
  status: 'active' | 'inactive' | 'error';
  icon: ReactNode;
}

export function ConnectedIntegration({
  name,
  accountName,
  connectedAt,
  status,
  icon,
}: ConnectedIntegrationProps) {
  const formattedDate = format(new Date(connectedAt), 'MMM d, yyyy');

  return (
    <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="text-xs">{accountName}</CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configure</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Connected {formattedDate}
          </span>
          <Badge
            variant={
              status === 'active'
                ? 'success'
                : status === 'error'
                  ? 'destructive'
                  : 'outline'
            }
            className="gap-1"
          >
            {status === 'active' && <Check className="h-3 w-3" />}
            {status === 'active'
              ? 'Active'
              : status === 'error'
                ? 'Error'
                : 'Inactive'}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full">
          Manage
        </Button>
      </CardFooter>
    </Card>
  );
}
