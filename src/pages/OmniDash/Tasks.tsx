import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Task {
  id: string;
  type: string;
  status: string;
  run_at: string | null;
  created_at: string;
  updated_at: string;
  params: {
    task?: {
      title?: string;
      repo?: string;
    };
  };
}

const fetchTasks = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('omnilink_orchestration_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', 'apex.task')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Task[];
};

export const Tasks = () => {
  const { user } = useAuth();
  
  const tasksQuery = useQuery({
    queryKey: ['omnilink-tasks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('User required');
      return fetchTasks(user.id);
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Scheduled Tasks</CardTitle>
        <CardDescription>Automated maintenance and operation tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        {tasksQuery.isLoading ? (
          <div>Loading tasks...</div>
        ) : tasksQuery.isError ? (
          <div className="text-red-500">Error loading tasks</div>
        ) : tasksQuery.data?.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No scheduled tasks found</div>
        ) : (
          <div className="space-y-4">
            {tasksQuery.data?.map((task) => (
              <div key={task.id} className="flex items-center justify-between border p-4 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{task.params?.task?.title || 'Untitled Task'}</span>
                    <Badge variant="outline" className="text-xs">
                      {task.params?.task?.repo || 'Repo Unknown'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                     Due: {task.run_at ? format(new Date(task.run_at), 'PPP p') : 'Immediate'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge 
                      variant={
                        task.status === 'succeeded' ? 'default' : 
                        task.status === 'failed' ? 'destructive' : 
                        task.status === 'running' ? 'secondary' : 'outline'
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Tasks;
