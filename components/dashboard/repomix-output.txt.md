# File Summary

## Purpose

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
   a. A header with the file path (## File: path/to/file)
   b. The full contents of the file in a code block

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: components/dashboard
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure

```
components/dashboard/call-to-action.tsx
components/dashboard/dashboard-header.tsx
components/dashboard/dashboard-stats.tsx
components/dashboard/feature-card.tsx
components/dashboard/recent-activity.tsx
components/dashboard/stat-card.tsx
components/dashboard/system-metrics.tsx
```

# Files

## File: components/dashboard/call-to-action.tsx

```typescript
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
interface CallToActionProps {
  title: string;
  description: string;
  primaryAction: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  visual?: ReactNode;
}
```

## File: components/dashboard/dashboard-header.tsx

```typescript
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { ReactNode } from "react"
interface DashboardHeaderProps {
  title: string
  subtitle: string
  highlightedText?: string
  children?: ReactNode
}
⋮----
{/* Animated gradient background */}
⋮----
{/* Animated particles/glow effect */}
⋮----
{/* Content */}
```

## File: components/dashboard/dashboard-stats.tsx

```typescript
import { motion } from "framer-motion"
import { Brain, Code, MessageSquare, Network, Database, Bot, Sparkles, Zap } from "lucide-react"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { StatCard } from "@/components/dashboard/stat-card"
interface DashboardStatsProps {
  className?: string
}
interface StatsData {
  agents: number
  models: number
  tools: number
  conversations: number
  networks?: number
  workflows?: number
}
export function DashboardStats(
⋮----
// Fetch real-time stats from Supabase
⋮----
// Animation variants
⋮----
// Default stats in case of loading or error
⋮----
progress={stat.progress + (i * 5)} // Vary progress for visual interest
```

## File: components/dashboard/feature-card.tsx

```typescript
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  link: string;
}
```

## File: components/dashboard/recent-activity.tsx

```typescript
import { motion } from "framer-motion"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
interface Activity {
  id: string
  type: "agent_created" | "model_added" | "conversation_completed" | "tool_executed"
  entityId: string
  entityName: string
  userId: string
  userName: string
  userAvatar?: string
  timestamp: string
  details?: Record<string, any>
}
⋮----
// Fetch recent activity from Supabase
⋮----
// Animation variants
⋮----
// Get badge variant based on activity type
const getBadgeVariant = (type: Activity["type"]) =>
// Get human-readable activity description
const getActivityDescription = (activity: Activity) =>
⋮----
// Loading skeleton
⋮----
// Activity list
```

## File: components/dashboard/stat-card.tsx

```typescript
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { GradientCard } from "@/components/ui/gradient-card"
import { Progress } from "@/components/ui/progress"
interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  color: string
  progress?: number
  index?: number
}
⋮----
{/* Glow effect behind card */}
⋮----
{/* Animated progress indicator */}
```

## File: components/dashboard/system-metrics.tsx

```typescript
import { motion } from "framer-motion"
import { useSupabaseFetch } from "@/hooks/use-supabase-fetch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, Cpu, Database, Server, User } from "lucide-react"
interface SystemMetrics {
  id: string
  cpu_usage: number
  memory_usage: number
  database_connections: number
  api_requests_per_minute: number
  average_response_time_ms: number
  active_users: number
  timestamp: string
}
⋮----
// Fetch system metrics from Supabase
⋮----
// Get the latest metrics
⋮----
// Animation variants
⋮----
// Get color based on usage percentage
const getColorClass = (percentage: number) =>
// Get progress color based on usage percentage
const getProgressColor = (percentage: number) =>
⋮----
{/* CPU Usage */}
⋮----
{/* Memory Usage */}
⋮----
{/* Database Connections */}
⋮----
{/* API Requests */}
⋮----
{/* Response Time */}
⋮----
{/* Active Users */}
```
