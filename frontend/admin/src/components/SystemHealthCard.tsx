import { useQuery } from '@tanstack/react-query';
import { settingsService, SystemHealth } from '../services/settings';
import { 
    Database, 
    HardDrive, 
    Cpu, 
    Clock, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    AlertOctagon,
    Server,
    Activity
} from 'lucide-react';
import clsx from 'clsx';

export default function SystemHealthCard() {
    const { 
        data: health, 
        isLoading, 
        isFetching, 
        error, 
        refetch 
    } = useQuery<SystemHealth>({
        queryKey: ['systemHealth'],
        queryFn: settingsService.getHealth,
        refetchInterval: 30000, // Refresh automatically every 30 seconds
        staleTime: 10000,
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="h-6 w-48 bg-muted rounded-md" />
                    <div className="h-6 w-24 bg-muted rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-muted/60 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !health) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-destructive flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertOctagon className="h-6 w-6 shrink-0" />
                    <div>
                        <h4 className="font-bold text-sm">Failed to retrieve server health status</h4>
                        <p className="text-xs opacity-90 mt-0.5">The health monitoring service may be temporarily unreachable.</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1.5 bg-destructive text-white rounded-lg text-xs font-semibold hover:bg-destructive/90 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const isHealthy = health.status === 'healthy';
    const isWarning = health.status === 'warning';
    const isCritical = health.status === 'critical';

    return (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'p-2.5 rounded-xl text-white shadow-sm',
                        isHealthy && 'bg-emerald-600',
                        isWarning && 'bg-amber-600',
                        isCritical && 'bg-rose-600'
                    )}>
                        <Server className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">Infrastructure Health</h3>
                            <span className="flex h-2 w-2 relative">
                                <span className={clsx(
                                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                                    isHealthy && 'bg-emerald-400',
                                    isWarning && 'bg-amber-400',
                                    isCritical && 'bg-rose-400'
                                )} />
                                <span className={clsx(
                                    'relative inline-flex rounded-full h-2 w-2',
                                    isHealthy && 'bg-emerald-500',
                                    isWarning && 'bg-amber-500',
                                    isCritical && 'bg-rose-500'
                                )} />
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Real-time host node & PostgreSQL database diagnostics (Updated every 30s)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                        isHealthy && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
                        isWarning && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
                        isCritical && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                    )}>
                        {isHealthy && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {isWarning && <AlertTriangle className="h-3.5 w-3.5" />}
                        {isCritical && <AlertOctagon className="h-3.5 w-3.5" />}
                        {isHealthy ? 'All Systems Healthy' : isWarning ? 'High Resource Load' : 'Critical Attention'}
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Refresh metrics now"
                        className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin text-primary')} />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Database Status */}
                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5">
                            <Database className="h-4 w-4 text-primary" />
                            PostgreSQL DB
                        </span>
                        <span className={clsx(
                            'font-bold text-[11px] px-2 py-0.5 rounded-full',
                            health.database.status === 'healthy' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                            health.database.status === 'degraded' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                            health.database.status === 'down' && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        )}>
                            {health.database.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-foreground">
                                {health.database.latencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Size: <strong className="text-foreground">{health.database.size}</strong>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {health.database.error ? `Error: ${health.database.error}` : 'Connection active & responsive'}
                        </p>
                    </div>
                </div>

                {/* 2. Disk Storage */}
                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5">
                            <HardDrive className="h-4 w-4 text-indigo-500" />
                            Disk Storage (/)
                        </span>
                        <span className={clsx(
                            'font-bold text-[11px] px-2 py-0.5 rounded-full',
                            health.disk.status === 'healthy' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                            health.disk.status === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                            health.disk.status === 'critical' && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        )}>
                            {health.disk.usedPercentage}% USED
                        </span>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-foreground">
                                {health.disk.freeGb} <span className="text-xs font-normal text-muted-foreground">GB Free</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Total: <strong className="text-foreground">{health.disk.totalGb} GB</strong>
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div 
                                className={clsx(
                                    'h-full rounded-full transition-all duration-500',
                                    health.disk.status === 'healthy' && 'bg-emerald-500',
                                    health.disk.status === 'warning' && 'bg-amber-500',
                                    health.disk.status === 'critical' && 'bg-rose-500'
                                )}
                                style={{ width: `${Math.min(health.disk.usedPercentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Memory (RAM) */}
                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5">
                            <Cpu className="h-4 w-4 text-violet-500" />
                            Server Memory
                        </span>
                        <span className={clsx(
                            'font-bold text-[11px] px-2 py-0.5 rounded-full',
                            health.memory.status === 'healthy' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                            health.memory.status === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                            health.memory.status === 'critical' && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        )}>
                            {health.memory.usedPercentage}% USED
                        </span>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-foreground">
                                {(health.memory.usedMb / 1024).toFixed(1)} <span className="text-xs font-normal text-muted-foreground">GB</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Total: <strong className="text-foreground">{(health.memory.totalMb / 1024).toFixed(1)} GB</strong>
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div 
                                className={clsx(
                                    'h-full rounded-full transition-all duration-500',
                                    health.memory.status === 'healthy' && 'bg-emerald-500',
                                    health.memory.status === 'warning' && 'bg-amber-500',
                                    health.memory.status === 'critical' && 'bg-rose-500'
                                )}
                                style={{ width: `${Math.min(health.memory.usedPercentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Host Uptime & Specs */}
                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-sky-500" />
                            Uptime & Node
                        </span>
                        <span className="font-bold text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            {health.system.nodeVersion}
                        </span>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-foreground">
                                {health.uptimeFormatted}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                CPUs: <strong className="text-foreground">{health.system.cpus} Core{health.system.cpus > 1 ? 's' : ''}</strong>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Activity className="h-3 w-3 text-emerald-500" /> Process RSS: {health.memory.processRssMb} MB
                        </p>
                    </div>
                </div>
            </div>

            {/* Critical/Warning Guidance banner if disk is high */}
            {health.disk.usedPercentage >= 80 && (
                <div className={clsx(
                    'p-3.5 rounded-xl border flex items-start gap-3 text-xs',
                    health.disk.status === 'critical' 
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900' 
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                )}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <strong className="font-bold">Disk Space Alert:</strong> Drive is currently at {health.disk.usedPercentage}% capacity ({health.disk.freeGb} GB free). Consider expanding server storage or moving to an auto-scaling managed database before onboarding more properties.
                    </div>
                </div>
            )}
        </div>
    );
}
