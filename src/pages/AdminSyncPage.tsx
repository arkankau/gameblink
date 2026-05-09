import { useState } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface SyncResult {
  id: string;
  title: string;
  category: string;
  status: 'updated' | 'skipped' | 'failed';
  dataStatus?: string;
  oldYesPrice?: number;
  newYesPrice?: number;
  priceDelta?: number;
  reason?: string;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  run?: {
    runId: string;
    source: string;
    dryRun: boolean;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
  };
  summary?: {
    totalFetched: number;
    attempted: number;
    updated: number;
    skipped: number;
    failed: number;
    mockUpdated: number;
    liveUpdated: number;
  };
  results?: SyncResult[];
  error?: string;
}

export default function AdminSyncPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SyncResponse | null>(null);
  
  const [dryRun, setDryRun] = useState(false);
  const [forceMock, setForceMock] = useState(false);
  const [category, setCategory] = useState('');
  const [marketId, setMarketId] = useState('');
  const [maxMarkets, setMaxMarkets] = useState('50');

  const runSync = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-live-markets', {
        body: {
          source: 'manual-dev',
          dryRun,
          forceMock,
          category: category || undefined,
          marketId: marketId || undefined,
          maxMarkets: parseInt(maxMarkets) || 50,
          includeDetails: true,
        },
      });

      if (error) {
        throw error;
      }

      setResponse(data);
      
      if (data.success) {
        toast.success(`Sync completed: ${data.summary?.updated || 0} updated, ${data.summary?.skipped || 0} skipped, ${data.summary?.failed || 0} failed`);
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Sync error: ${errorMsg}`);
      setResponse({
        success: false,
        error: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-balance text-2xl font-semibold md:text-3xl">Market Sync Pipeline</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Developer tool to manually trigger market data synchronization
        </p>
      </div>

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Sync Options</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Weather, Stocks, Forex"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketId">Market ID (optional)</Label>
              <Input
                id="marketId"
                placeholder="Sync single market by ID"
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMarkets">Max Markets</Label>
              <Input
                id="maxMarkets"
                type="number"
                value={maxMarkets}
                onChange={(e) => setMaxMarkets(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Dry Run (no DB updates)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={forceMock}
                onChange={(e) => setForceMock(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Force Mock (skip external APIs)</span>
            </label>
          </div>

          <Button
            onClick={runSync}
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Sync...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Market Sync
              </>
            )}
          </Button>
        </div>
      </Card>

      {response && (
        <>
          {response.run && (
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-lg font-medium">Sync Run Summary</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Run ID</p>
                  <p className="font-mono text-sm">{response.run.runId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="text-sm">{response.run.source}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-sm">{response.run.durationMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mode</p>
                  <Badge variant={response.run.dryRun ? 'secondary' : 'default'}>
                    {response.run.dryRun ? 'Dry Run' : 'Live'}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {response.summary && (
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-lg font-medium">Results</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Fetched</p>
                  <p className="text-2xl font-semibold">{response.summary.totalFetched}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Updated</p>
                  <p className="text-2xl font-semibold text-gb-yes">{response.summary.updated}</p>
                  <p className="text-xs text-muted-foreground">
                    Live: {response.summary.liveUpdated} | Mock: {response.summary.mockUpdated}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-semibold">{response.summary.skipped}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-semibold text-gb-no">{response.summary.failed}</p>
                </div>
              </div>
            </Card>
          )}

          {response.results && response.results.length > 0 && (
            <Card className="p-4 md:p-6">
              <h2 className="mb-4 text-lg font-medium">Per-Market Results</h2>
              <div className="space-y-2">
                {response.results.map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {result.status === 'updated' && <CheckCircle className="h-4 w-4 text-gb-yes" />}
                        {result.status === 'skipped' && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                        {result.status === 'failed' && <XCircle className="h-4 w-4 text-gb-no" />}
                        <p className="font-medium">{result.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{result.category}</Badge>
                        <Badge variant={result.dataStatus === 'live' ? 'default' : 'secondary'}>
                          {result.dataStatus}
                        </Badge>
                        {result.status === 'updated' && result.priceDelta != null && (
                          <Badge variant={result.priceDelta > 0 ? 'default' : 'secondary'}>
                            {result.priceDelta > 0 ? '+' : ''}{result.priceDelta}
                          </Badge>
                        )}
                      </div>
                      {result.reason && (
                        <p className="text-xs text-muted-foreground">{result.reason}</p>
                      )}
                      {result.error && (
                        <p className="text-xs text-gb-no">{result.error}</p>
                      )}
                    </div>
                    {result.status === 'updated' && (
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-muted-foreground">{result.oldYesPrice}¢</span>
                          {' → '}
                          <span className="font-medium">{result.newYesPrice}¢</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {response.error && (
            <Card className="border-gb-no p-4 md:p-6">
              <h2 className="mb-2 text-lg font-medium text-gb-no">Error</h2>
              <p className="text-sm">{response.error}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
