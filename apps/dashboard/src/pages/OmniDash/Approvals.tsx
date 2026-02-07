import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOmniQuery, useOmniMutation } from '@/omnidash/hooks';
import { decideOmniLinkApproval, fetchOmniLinkApprovals } from '@/omnidash/omnilink-api';

export const Approvals = () => {
  const approvalsQuery = useOmniQuery('omnilink-approvals', fetchOmniLinkApprovals);

  const approvalMutation = useOmniMutation<{ requestId: string; decision: 'approved' | 'denied' }>(
    'omnilink-approvals',
    (userId, { requestId, decision }) => decideOmniLinkApproval(userId, requestId, decision),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals</CardTitle>
        <CardDescription>MAN Mode approvals for high-risk orchestrations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvalsQuery.data?.map((request) => (
          <div key={request.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{request.type}</p>
                <p className="text-sm text-muted-foreground">{request.request_type}</p>
              </div>
              <Badge variant="outline">{request.status}</Badge>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => approvalMutation.mutate({ requestId: request.id, decision: 'approved' })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approvalMutation.mutate({ requestId: request.id, decision: 'denied' })}
              >
                Deny
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default Approvals;
