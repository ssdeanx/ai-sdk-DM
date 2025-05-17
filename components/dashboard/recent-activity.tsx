'use client';

import { motion } from 'framer-motion';
import { useSupabaseFetch } from '@/hooks/use-supabase-fetch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type:
    | 'agent_created'
    | 'model_added'
    | 'conversation_completed'
    | 'tool_executed';
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export function RecentActivity() {
  // Fetch recent activity from Supabase
  const { data: activities, isLoading } = useSupabaseFetch<Activity>({
    endpoint: '/api/dashboard/activity',
    resourceName: 'Recent Activity',
    dataKey: 'activities',
    queryParams: { limit: '5' },
  });

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { y: 10, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  // Get badge variant based on activity type
  const getBadgeVariant = (type: Activity['type']) => {
    switch (type) {
      case 'agent_created':
        return 'success';
      case 'model_added':
        return 'secondary';
      case 'conversation_completed':
        return 'default';
      case 'tool_executed':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Get human-readable activity description
  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'agent_created':
        return `created a new agent "${activity.entityName}"`;
      case 'model_added':
        return `added model "${activity.entityName}"`;
      case 'conversation_completed':
        return `completed a conversation with "${activity.entityName}"`;
      case 'tool_executed':
        return `executed tool "${activity.entityName}"`;
      default:
        return `interacted with "${activity.entityName}"`;
    }
  };

  return (
    <Card className="overflow-hidden backdrop-blur-sm border-opacity-40">
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions in your AI workspace</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Activity list
          <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {activities.length > 0 ? (
              activities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  className="flex items-start gap-4"
                  variants={item}
                >
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage
                      src={activity.userAvatar}
                      alt={activity.userName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                      {activity.userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.userName}</span>
                      <Badge
                        variant={getBadgeVariant(activity.type)}
                        className="text-xs"
                      >
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-6">
                No recent activity found
              </p>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
