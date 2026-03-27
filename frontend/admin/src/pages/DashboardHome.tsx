import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../context/PropertyContext';
import { reportsService, DashboardStats } from '../services/reports';
import { Building2, Shield, Users, DollarSign, LayoutGrid, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardHome() {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats', selectedProperty?.id],
        queryFn: () => reportsService.getDashboardStats(selectedProperty?.id),
    });

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (statsError) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                Error loading dashboard statistics. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Platform-level intelligence and financial overview as of {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            {/* Platform Overview (Main Pillar) */}
            {stats?.superAdmin ? (
                <div className="space-y-8">
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white shadow-xl">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
                            <Users className="h-5 w-5 text-primary-400" />
                            Global Platform Health
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Total Revenue Volume</p>
                                <p className="text-3xl font-bold text-white">₹{stats.superAdmin.platformStats?.totalVolume.toLocaleString()}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="bg-primary/20 text-primary-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        {stats.superAdmin.platformStats?.count || 0} Successful Bookings
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Platform Commission</p>
                                <p className="text-3xl font-bold text-rose-400">₹{stats.superAdmin.platformStats?.totalFees.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-500 mt-1 italic">Calculated from net paid volume</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Net Platform Earnings</p>
                                <p className="text-3xl font-bold text-emerald-400">₹{stats.superAdmin.platformStats?.netEarnings.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Current Activity (24h)</p>
                                <p className="text-3xl font-bold text-primary-400">₹{stats.revenue.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10 pt-8 border-t border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <Building2 className="h-6 w-6 text-primary-400" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Managed Properties</p>
                                    <p className="text-xl font-bold">{stats.superAdmin.totalProperties}</p>
                                    <p className="text-[10px] text-green-400 font-medium">{stats.superAdmin.activeProperties} Verified & Active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <Users className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Channel Partners</p>
                                    <p className="text-xl font-bold">{stats.superAdmin.totalChannelPartners}</p>
                                    <p className="text-[10px] text-green-400 font-medium">{stats.superAdmin.activeChannelPartners} Active Resellers</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <DollarSign className="h-6 w-6 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider">Unsettled Commissions</p>
                                    <p className="text-xl font-bold">₹{stats.superAdmin.pendingCPCommissions.toLocaleString()}</p>
                                    <p className="text-[10px] text-amber-400 font-medium">Awaiting Redemption Approval</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Guardrail Note */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl p-6 flex items-start gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Vetting & Oversight Mode Active</h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                Operational controls (room status, manual booking) are restricted to Property Owners.
                                Use the <strong>Vetting</strong> pillar to manage onboarding requests and the <strong>Finance</strong> pillar
                                for reconciliation and payout approvals.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-card p-12 rounded-xl border border-border text-center">
                    <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">Select a property or view platform overview</p>
                </div>
            )}

            {/* Platform Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    onClick={() => navigate('/properties/requests')}
                    className="p-6 bg-card rounded-xl border border-border hover:border-primary transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-bold">Pending Vetting</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Review and approve new property onboarding requests.</p>
                </div>
                <div
                    onClick={() => navigate('/financials/reconciliation')}
                    className="p-6 bg-card rounded-xl border border-border hover:border-emerald-500 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                        </div>
                        <h3 className="font-bold">Financial Integrity</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Verify payment gateway sync and identify discrepancies.</p>
                </div>
                <div
                    onClick={() => navigate('/channel-partners')}
                    className="p-6 bg-card rounded-xl border border-border hover:border-purple-500 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-purple-500/10 transition-colors">
                            <Users className="h-5 w-5 text-purple-500" />
                        </div>
                        <h3 className="font-bold">CP Oversight</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage reseller tiers and approve wallet adjustments.</p>
                </div>
            </div>
        </div>
    );
}
