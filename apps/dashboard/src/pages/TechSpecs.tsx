import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Zap, Database, Cloud, Lock, Code2, GitBranch, Server } from "lucide-react";

export default function TechSpecs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Technical Architecture & Specifications</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Enterprise-grade infrastructure built for scale, security, and performance
          </p>
        </div>

        {/* System Architecture Diagram */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              System Workflow & Architecture
            </CardTitle>
            <CardDescription>End-to-end data flow and system interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-6 rounded-lg overflow-x-auto">
              <pre className="text-sm">
{`┌─────────────┐
│   Client    │ (React SPA)
│  Frontend   │
└──────┬──────┘
       │
       │ HTTPS/WSS
       │
┌──────▼──────────────────────────────────────┐
│         Edge Layer (CDN + Load Balancer)    │
│  • Global CDN Distribution                   │
│  • DDoS Protection                           │
│  • SSL/TLS Termination                       │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│      Application Layer (React + Vite)       │
│  • Component-based Architecture              │
│  • Client-side Routing                       │
│  • State Management (React Query)            │
│  • Real-time Updates (WebSocket)             │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│     Backend Services (Serverless)           │
│  • Edge Functions (Deno Runtime)             │
│  • Authentication Service                    │
│  • File Upload Service                       │
│  • Health Check Service                      │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│       Data Layer (PostgreSQL)               │
│  • Row Level Security (RLS)                  │
│  • Real-time Subscriptions                   │
│  • Automated Backups                         │
│  • Point-in-Time Recovery                    │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│        Storage Layer (Object Storage)       │
│  • Encrypted at Rest                         │
│  • CDN Integration                           │
│  • Access Control Lists                      │
└─────────────────────────────────────────────┘`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack Tabs */}
        <Tabs defaultValue="frontend" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="frontend">Frontend</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="frontend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Frontend Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Core Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">React 18.3</Badge>
                    <Badge variant="secondary">TypeScript 5.x</Badge>
                    <Badge variant="secondary">Vite 5.x</Badge>
                    <Badge variant="secondary">React Router 6.x</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">UI & Styling</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Tailwind CSS 3.x</Badge>
                    <Badge variant="secondary">Radix UI</Badge>
                    <Badge variant="secondary">Shadcn/ui</Badge>
                    <Badge variant="secondary">Lucide Icons</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">State & Data</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">TanStack Query</Badge>
                    <Badge variant="secondary">React Hook Form</Badge>
                    <Badge variant="secondary">Zod Validation</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Backend Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Serverless Functions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Deno Runtime</Badge>
                    <Badge variant="secondary">Edge Functions</Badge>
                    <Badge variant="secondary">Auto-scaling</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Deployed globally with sub-50ms cold starts
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Database</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">PostgreSQL 15</Badge>
                    <Badge variant="secondary">PostgREST API</Badge>
                    <Badge variant="secondary">Real-time Subscriptions</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    ACID-compliant with automated failover and backups
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Storage</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Object Storage</Badge>
                    <Badge variant="secondary">CDN-backed</Badge>
                    <Badge variant="secondary">Multi-region</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Infrastructure & DevOps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Deployment</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">CI/CD Pipeline</Badge>
                    <Badge variant="secondary">Git-based Workflow</Badge>
                    <Badge variant="secondary">Automated Testing</Badge>
                    <Badge variant="secondary">Blue-Green Deployments</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Performance</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Global CDN Distribution</span>
                      <Badge>99.99% Uptime</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Edge Caching</span>
                      <Badge>Sub-100ms Response</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Code Splitting</span>
                      <Badge>Optimized Bundles</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Monitoring</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Real-time Metrics</Badge>
                    <Badge variant="secondary">Error Tracking</Badge>
                    <Badge variant="secondary">Performance Analytics</Badge>
                    <Badge variant="secondary">Health Checks</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Authentication & Authorization
                  </h3>
                  <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                    <li>JWT-based authentication with secure token storage</li>
                    <li>Role-based access control (RBAC)</li>
                    <li>Row-level security (RLS) policies</li>
                    <li>Account lockout after failed attempts</li>
                    <li>Session management with auto-refresh</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Data Protection</h3>
                  <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                    <li>End-to-end encryption (TLS 1.3)</li>
                    <li>Encryption at rest (AES-256)</li>
                    <li>CSRF protection on all forms</li>
                    <li>XSS prevention and input sanitization</li>
                    <li>SQL injection protection via parameterized queries</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Compliance & Monitoring</h3>
                  <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                    <li>Security event logging and alerting</li>
                    <li>Rate limiting and DDoS protection</li>
                    <li>Automated security updates</li>
                    <li>Regular security audits</li>
                    <li>GDPR-compliant data handling</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">95+</div>
              <p className="text-sm text-muted-foreground">Lighthouse Score</p>
              <div className="text-2xl font-semibold mt-4">&lt;2s</div>
              <p className="text-sm text-muted-foreground">Time to Interactive</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Scalability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">Auto</div>
              <p className="text-sm text-muted-foreground">Horizontal Scaling</p>
              <div className="text-2xl font-semibold mt-4">∞</div>
              <p className="text-sm text-muted-foreground">Concurrent Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Reliability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">99.99%</div>
              <p className="text-sm text-muted-foreground">Uptime SLA</p>
              <div className="text-2xl font-semibold mt-4">24/7</div>
              <p className="text-sm text-muted-foreground">Monitoring</p>
            </CardContent>
          </Card>
        </div>

        {/* Development Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Development Best Practices</CardTitle>
            <CardDescription>Enterprise-grade code quality and maintainability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Code Quality</h3>
                <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                  <li>TypeScript for type safety</li>
                  <li>ESLint for code consistency</li>
                  <li>Component-driven architecture</li>
                  <li>Comprehensive error boundaries</li>
                  <li>Automated code reviews</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Testing & QA</h3>
                <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                  <li>Automated testing pipeline</li>
                  <li>Performance testing</li>
                  <li>Security vulnerability scanning</li>
                  <li>Cross-browser compatibility</li>
                  <li>Mobile responsiveness testing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
