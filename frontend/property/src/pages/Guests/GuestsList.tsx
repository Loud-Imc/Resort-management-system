import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../services/users';
import { useProperty } from '../../context/PropertyContext';
import type { User } from '../../types/user';
import {
    Loader2,
    Search,
    User as UserIcon,
    Calendar,
    Mail,
    Phone,
    ShieldCheck,
    Download,
    MessageCircle,
    CheckSquare,
    Square,
    Send,
    X,
    CheckCircle2,
    AlertCircle,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuestsList() {
    const [search, setSearch] = useState('');
    const [idType, setIdType] = useState('all');
    const [status, setStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Selection State
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // WhatsApp Modal State
    const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
    const [whatsappTarget, setWhatsappTarget] = useState<'SELECTED' | 'ALL_FILTERED' | 'INDIVIDUAL'>('SELECTED');
    const [targetIndividualGuest, setTargetIndividualGuest] = useState<User | null>(null);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
    const [whatsappResult, setWhatsappResult] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    
    const { selectedProperty } = useProperty();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['users', selectedProperty?.id],
        queryFn: () => usersService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    // Filter for users with 'Customer' role
    const filteredUsers = (users as User[] | undefined)?.filter(user => {
        const isCustomer = user.roles?.some((r: any) => r.role.name === 'Customer');
        const q = search.toLowerCase();
        const matchesSearch =
            (user.firstName || '').toLowerCase().includes(q) ||
            (user.lastName || '').toLowerCase().includes(q) ||
            (user.email || '').toLowerCase().includes(q) ||
            (user.phone || '').toLowerCase().includes(q);

        const matchesIdType = idType === 'all' || 
            (idType === 'none' ? !user.idType : user.idType === idType);
            
        const matchesStatus = status === 'all' || 
            (status === 'active' ? user.isActive : !user.isActive);

        let matchesDate = true;
        if (user.createdAt) {
            const userDate = new Date(user.createdAt);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (userDate < start) matchesDate = false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (userDate > end) matchesDate = false;
            }
        }

        return isCustomer && matchesSearch && matchesIdType && matchesStatus && matchesDate;
    });

    const isAllFilteredSelected =
        filteredUsers &&
        filteredUsers.length > 0 &&
        filteredUsers.every((u) => selectedUserIds.includes(u.id));

    const handleToggleSelectAll = () => {
        if (!filteredUsers) return;
        if (isAllFilteredSelected) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(filteredUsers.map((u) => u.id));
        }
    };

    const handleToggleSelectUser = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedUserIds((prev) =>
            prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
        );
    };

    const handleDownloadReport = async (customUserIds?: string[]) => {
        const targetIds = customUserIds || (selectedUserIds.length > 0 ? selectedUserIds : filteredUsers?.map(u => u.id));
        if (!targetIds || targetIds.length === 0) return;
        try {
            const blob = await usersService.downloadAllGuestsReport({
                userIds: targetIds
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Guests_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    // Open WhatsApp modal for single guest
    const handleOpenIndividualWhatsapp = (guest: User, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setTargetIndividualGuest(guest);
        setWhatsappTarget('INDIVIDUAL');
        setWhatsappMessage(`Dear ${guest.firstName || 'Guest'}, greetings from ${selectedProperty?.name || 'our resort'}! We are pleased to connect with you.`);
        setWhatsappResult(null);
        setIsWhatsappModalOpen(true);
    };

    // Open WhatsApp modal for selected guests
    const handleOpenSelectedWhatsapp = () => {
        if (selectedUserIds.length === 0) return;
        setTargetIndividualGuest(null);
        setWhatsappTarget('SELECTED');
        setWhatsappMessage(`Dear Guest, greetings from ${selectedProperty?.name || 'our resort'}!`);
        setWhatsappResult(null);
        setIsWhatsappModalOpen(true);
    };

    // Open WhatsApp modal for all filtered guests
    const handleOpenAllFilteredWhatsapp = () => {
        if (!filteredUsers || filteredUsers.length === 0) return;
        setTargetIndividualGuest(null);
        setWhatsappTarget('ALL_FILTERED');
        setWhatsappMessage(`Dear Guest, greetings from ${selectedProperty?.name || 'our resort'}!`);
        setWhatsappResult(null);
        setIsWhatsappModalOpen(true);
    };

    // Execute Send WhatsApp
    const handleSendWhatsapp = async () => {
        let recipientIds: string[] = [];
        if (whatsappTarget === 'INDIVIDUAL') {
            if (!targetIndividualGuest) return;
            recipientIds = [targetIndividualGuest.id];
        } else if (whatsappTarget === 'SELECTED') {
            recipientIds = selectedUserIds;
        } else {
            recipientIds = filteredUsers?.map((u) => u.id) || [];
        }

        if (recipientIds.length === 0) {
            setWhatsappResult({ type: 'error', message: 'No recipients selected.' });
            return;
        }
        if (!whatsappMessage.trim()) {
            setWhatsappResult({ type: 'error', message: 'Please enter a message to send.' });
            return;
        }

        try {
            setIsSendingWhatsapp(true);
            setWhatsappResult(null);
            const result = await usersService.sendGuestsWhatsapp({
                userIds: recipientIds,
                message: whatsappMessage.trim(),
                propertyId: selectedProperty?.id,
            });

            const successMsg = `WhatsApp message dispatched successfully to ${result.sentCount} guest(s).` +
                (result.skippedNoPhoneCount > 0 ? ` (${result.skippedNoPhoneCount} skipped due to missing/invalid phone)` : '') +
                (result.failedCount > 0 ? ` (${result.failedCount} failed to deliver)` : '');

            setWhatsappResult({
                type: result.sentCount > 0 ? 'success' : 'error',
                message: successMsg,
            });

            if (result.sentCount > 0) {
                setTimeout(() => {
                    setIsWhatsappModalOpen(false);
                    setWhatsappResult(null);
                }, 2200);
            }
        } catch (error: any) {
            setWhatsappResult({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send WhatsApp message. Please try again.',
            });
        } finally {
            setIsSendingWhatsapp(false);
        }
    };

    // Quick templates
    const templates = [
        {
            title: 'Welcome & Greeting',
            text: `Dear Guest, greetings from ${selectedProperty?.name || 'our resort'}! We are excited to have you with us. Please let us know if you need any assistance.`
        },
        {
            title: 'Special Promo Offer',
            text: `Exclusive Offer from ${selectedProperty?.name || 'our resort'}! Enjoy special discounts on your upcoming stays. Book directly with us to claim your luxury getaway.`
        },
        {
            title: 'Feedback Request',
            text: `Dear Guest, thank you for staying at ${selectedProperty?.name || 'our resort'}! We would love to hear about your experience. Your feedback helps us serve you better.`
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Guest Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">View guest profiles, booking history, and send direct WhatsApp notifications</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {filteredUsers && filteredUsers.length > 0 && (
                        <button
                            onClick={handleOpenAllFilteredWhatsapp}
                            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors shadow-sm"
                            title="Message all filtered guests"
                        >
                            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Message All ({filteredUsers.length})
                        </button>
                    )}
                    <button 
                        onClick={() => handleDownloadReport()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm"
                    >
                        <Download className="h-4 w-4" /> Download Report
                    </button>
                </div>
            </div>

            {/* Filter Box */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
                <div className="flex flex-col gap-4">
                    {/* Row 1: Search */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                        <input
                            type="text"
                            placeholder="Search guests by name, email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                    </div>
                    
                    {/* Row 2: ID Type & Status */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <select
                            value={idType}
                            onChange={(e) => setIdType(e.target.value)}
                            className="px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all flex-1"
                        >
                            <option value="all">All ID Types</option>
                            <option value="AADHAR">Aadhar Card</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVING_LICENSE">Driving License</option>
                            <option value="VOTER_ID">Voter ID</option>
                            <option value="PAN_CARD">PAN Card</option>
                            <option value="none">No ID Provided</option>
                        </select>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all flex-1"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* Row 3: Date Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-primary transition-all">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full py-2 bg-transparent text-foreground focus:outline-none text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-primary transition-all">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full py-2 bg-transparent text-foreground focus:outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {filteredUsers && filteredUsers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleSelectAll}
                            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                            {isAllFilteredSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                            ) : selectedUserIds.length > 0 ? (
                                <div className="h-5 w-5 bg-primary/20 rounded border border-primary flex items-center justify-center">
                                    <div className="h-2 w-2 bg-primary rounded-sm" />
                                </div>
                            ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span>
                                {isAllFilteredSelected
                                    ? `All ${filteredUsers.length} Selected`
                                    : selectedUserIds.length > 0
                                    ? `${selectedUserIds.length} of ${filteredUsers.length} Selected`
                                    : `Select All (${filteredUsers.length})`}
                            </span>
                        </button>

                        {selectedUserIds.length > 0 && (
                            <button
                                onClick={() => setSelectedUserIds([])}
                                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {selectedUserIds.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleOpenSelectedWhatsapp}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Send WhatsApp ({selectedUserIds.length})
                            </button>
                            <button
                                onClick={() => handleDownloadReport(selectedUserIds)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
                            >
                                <Download className="h-4 w-4" />
                                Report ({selectedUserIds.length})
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Guest Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-semibold text-muted-foreground">Loading guests...</p>
                    </div>
                ) : filteredUsers?.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl font-medium">
                        No guests found matching your search.
                    </div>
                ) : (
                    filteredUsers?.map((guest) => {
                        const isSelected = selectedUserIds.includes(guest.id);
                        return (
                            <div
                                key={guest.id}
                                className={`relative bg-card rounded-xl shadow-sm border transition-all flex flex-col justify-between overflow-hidden ${
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/[0.02]'
                                        : 'border-border hover:shadow-md hover:border-border/80'
                                }`}
                            >
                                {/* Top Select Checkbox */}
                                <div className="absolute top-3 right-3 z-10">
                                    <button
                                        type="button"
                                        onClick={(e) => handleToggleSelectUser(guest.id, e)}
                                        className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-muted transition-colors text-foreground"
                                        title={isSelected ? "Deselect guest" : "Select guest"}
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : (
                                            <Square className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>

                                <Link
                                    to={`/guests/${guest.id}`}
                                    className="p-6 flex-1 block group"
                                >
                                    <div className="flex items-center gap-4 mb-4 pr-8">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                            {guest.firstName ? guest.firstName.charAt(0) : <UserIcon className="h-6 w-6" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors truncate">
                                                {guest.firstName} {guest.lastName}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs mt-0.5">
                                                <span className={guest.isActive ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                                                    {guest.isActive ? "Active Account" : "Inactive"}
                                                </span>
                                                {guest.idType && guest.idNumber && (
                                                    <>
                                                        <span className="text-muted-foreground">•</span>
                                                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                                        <span className="text-emerald-500 font-bold uppercase tracking-tighter text-[9px]">Verified</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 text-sm text-muted-foreground font-medium">
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-4 w-4 text-muted-foreground opacity-70 shrink-0" />
                                            <span className="truncate">{guest.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-4 w-4 text-muted-foreground opacity-70 shrink-0" />
                                            <span className="truncate">{guest.phone || 'No phone provided'}</span>
                                        </div>
                                    </div>
                                </Link>

                                {/* Card Footer Actions */}
                                <div className="px-6 py-3.5 bg-muted/20 border-t border-border flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground opacity-70 font-medium text-xs">
                                        {guest._count?.bookings === 1 ? '1 Booking' : `${guest._count?.bookings || 0} Bookings`}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {/* Direct WhatsApp Action Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenIndividualWhatsapp(guest, e)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-all shadow-xs"
                                            title="Send direct WhatsApp message"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>WhatsApp</span>
                                        </button>

                                        <Link
                                            to={`/guests/${guest.id}`}
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            title="View Guest Details"
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* WhatsApp Messaging Modal */}
            {isWhatsappModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <MessageCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Send WhatsApp Message</h2>
                                    <p className="text-xs text-muted-foreground">
                                        {whatsappTarget === 'INDIVIDUAL' && targetIndividualGuest ? (
                                            <>To: <span className="font-semibold text-foreground">{targetIndividualGuest.firstName} {targetIndividualGuest.lastName}</span> ({targetIndividualGuest.phone || 'No phone'})</>
                                        ) : whatsappTarget === 'SELECTED' ? (
                                            <>Broadcasting to <span className="font-semibold text-emerald-600">{selectedUserIds.length}</span> selected guest(s)</>
                                        ) : (
                                            <>Broadcasting to all <span className="font-semibold text-emerald-600">{filteredUsers?.length || 0}</span> filtered guest(s)</>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsWhatsappModalOpen(false)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto">
                            {/* Result feedback */}
                            {whatsappResult && (
                                <div className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
                                    whatsappResult.type === 'success'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                }`}>
                                    {whatsappResult.type === 'success' ? (
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                                    )}
                                    <div className="font-medium">{whatsappResult.message}</div>
                                </div>
                            )}

                            {/* Quick Template Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Quick Templates
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {templates.map((tpl, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setWhatsappMessage(tpl.text)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors font-medium text-left"
                                        >
                                            {tpl.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Text Area */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Message Body
                                    </label>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {whatsappMessage.length} characters
                                    </span>
                                </div>
                                <textarea
                                    rows={5}
                                    value={whatsappMessage}
                                    onChange={(e) => setWhatsappMessage(e.target.value)}
                                    placeholder="Type your WhatsApp message here..."
                                    className="w-full p-3.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-sm leading-relaxed"
                                />
                            </div>

                            <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary shrink-0" />
                                <span>
                                    Messages will be sent using the configured SMS/WhatsApp gateway. Recipients must have valid mobile numbers.
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsWhatsappModalOpen(false)}
                                disabled={isSendingWhatsapp}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendWhatsapp}
                                disabled={isSendingWhatsapp || !whatsappMessage.trim()}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
                            >
                                {isSendingWhatsapp ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span>Send WhatsApp</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
