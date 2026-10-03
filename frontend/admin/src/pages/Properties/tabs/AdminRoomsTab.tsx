import React, { useState, useEffect, useMemo } from 'react';
import {
    Loader2,
    Search,
    Filter,
    Plus,
    MoreVertical,
    BedDouble,
    Lock,
    CheckCircle,
    AlertTriangle,
    Edit2,
    Trash2,
    Calendar,
    CalendarDays,
    Archive,
    X,
    Save,
    Layers
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, isAfter } from 'date-fns';
import { roomsService } from '../../../services/rooms';
import { roomTypesService } from '../../../services/roomTypes';
import type { Room, RoomType } from '../../../types/room';
import { RoomStatus } from '../../../types/room';
import BlockRoomModal from '../../../components/Rooms/BlockRoomModal';
import RoomScheduleModal from '../../../components/Rooms/RoomScheduleModal';
import ConfirmModal from '../../../components/ConfirmModal';

interface AdminRoomsTabProps {
    propertyId: string;
    propertyName?: string;
    defaultCheckInTime?: string;
    defaultCheckOutTime?: string;
}

export const AdminRoomsTab: React.FC<AdminRoomsTabProps> = ({
    propertyId,
    propertyName,
    defaultCheckInTime = '14:00',
    defaultCheckOutTime = '11:00'
}) => {
    // Data state
    const [rawRooms, setRooms] = useState<Room[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters matching PMS
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [roomTypeFilter, setRoomTypeFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showDisabled, setShowDisabled] = useState<boolean>(false);

    // UI & Action states
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [blockingRoom, setBlockingRoom] = useState<Room | null>(null);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create / Edit modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createMode, setCreateMode] = useState<'single' | 'bulk'>('single');
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form inputs for Single Create / Edit
    const [formRoomNumber, setFormRoomNumber] = useState('');
    const [formRoomTypeId, setFormRoomTypeId] = useState('');
    const [formFloor, setFormFloor] = useState<number | ''>('');
    const [formStatus, setFormStatus] = useState<RoomStatus>(RoomStatus.AVAILABLE);
    const [formNotes, setFormNotes] = useState('');
    const [formIsEnabled, setFormIsEnabled] = useState(true);

    // Form inputs for Bulk Create
    const [bulkPrefix, setBulkPrefix] = useState('');
    const [bulkStart, setBulkStart] = useState<number>(101);
    const [bulkEnd, setBulkEnd] = useState<number>(110);

    // Load rooms and room types
    const loadRooms = async () => {
        if (!propertyId) return;
        setIsLoading(true);
        try {
            const [roomsData, typesData] = await Promise.all([
                roomsService.getAll({
                    propertyId,
                    status: statusFilter || undefined,
                    roomTypeId: roomTypeFilter || undefined,
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    isEnabled: showDisabled ? undefined : true,
                }),
                roomTypesService.getAllAdmin({ propertyId })
            ]);
            setRooms(roomsData || []);
            setRoomTypes(typesData || []);
        } catch (err: any) {
            console.error('Failed to load rooms:', err);
            toast.error(err.response?.data?.message || 'Failed to load rooms');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRooms();
    }, [propertyId, statusFilter, roomTypeFilter, format(selectedDate, 'yyyy-MM-dd'), showDisabled]);

    // Client search filter
    const rooms = useMemo(() => {
        if (!rawRooms) return [];
        if (!searchQuery) return rawRooms;
        const q = searchQuery.toLowerCase().trim();
        return rawRooms.filter(r =>
            (r.roomNumber || '').toLowerCase().includes(q) ||
            (r.roomType?.name || '').toLowerCase().includes(q)
        );
    }, [rawRooms, searchQuery]);

    const selectedRoomTypeObject = useMemo(() => {
        return roomTypes.find(rt => rt.id === roomTypeFilter);
    }, [roomTypes, roomTypeFilter]);

    // Status helpers identical to PMS
    const getStatusColor = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE:
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case RoomStatus.OCCUPIED:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case RoomStatus.MAINTENANCE:
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
            case RoomStatus.BLOCKED:
                return 'bg-destructive/10 text-destructive';
            case RoomStatus.RESERVED:
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
            case RoomStatus.OUT_TODAY:
                return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE:
                return <CheckCircle className="h-4 w-4" />;
            case RoomStatus.OCCUPIED:
                return <BedDouble className="h-4 w-4" />;
            case RoomStatus.MAINTENANCE:
                return <AlertTriangle className="h-4 w-4" />;
            case RoomStatus.BLOCKED:
                return <Lock className="h-4 w-4" />;
            case RoomStatus.RESERVED:
                return <Calendar className="h-4 w-4" />;
            case RoomStatus.OUT_TODAY:
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const getCardStyle = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE: return "border-border bg-card";
            case RoomStatus.OCCUPIED: return "border-blue-500/20 bg-blue-500/5";
            case RoomStatus.MAINTENANCE: return "border-amber-500/20 bg-amber-500/5";
            case RoomStatus.BLOCKED: return "border-destructive/20 bg-destructive/5";
            case RoomStatus.RESERVED: return "border-indigo-500/20 bg-indigo-500/5";
            case RoomStatus.OUT_TODAY: return "border-orange-500/20 bg-orange-500/5";
            default: return "border-border bg-card";
        }
    };

    // Actions
    const handleOpenCreateModal = () => {
        if (roomTypes.length === 0) {
            toast.error('Please create at least one Room Type before adding rooms.');
            return;
        }
        setFormRoomNumber('');
        setFormRoomTypeId(roomTypes[0]?.id || '');
        setFormFloor('');
        setFormStatus(RoomStatus.AVAILABLE);
        setFormNotes('');
        setFormIsEnabled(true);
        setCreateMode('single');
        setBulkPrefix('');
        setBulkStart(101);
        setBulkEnd(110);
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (room: Room) => {
        setEditingRoom(room);
        setFormRoomNumber(room.roomNumber);
        setFormRoomTypeId(room.roomTypeId);
        setFormFloor(room.floor !== undefined && room.floor !== null ? room.floor : '');
        setFormStatus(room.status);
        setFormNotes(room.notes || '');
        setFormIsEnabled(room.isEnabled);
        setActiveMenuId(null);
        setIsEditModalOpen(true);
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRoomTypeId) {
            toast.error('Please select a Room Type');
            return;
        }

        setIsSaving(true);
        try {
            if (createMode === 'bulk') {
                if (bulkStart > bulkEnd) {
                    toast.error('Start number must be less than or equal to End number');
                    setIsSaving(false);
                    return;
                }
                const count = bulkEnd - bulkStart + 1;
                if (count > 50) {
                    toast.error('Maximum 50 rooms can be generated in a single batch');
                    setIsSaving(false);
                    return;
                }

                let createdCount = 0;
                for (let num = bulkStart; num <= bulkEnd; num++) {
                    const finalNum = `${bulkPrefix}${num}`;
                    try {
                        await roomsService.create({
                            propertyId,
                            roomNumber: finalNum,
                            roomTypeId: formRoomTypeId,
                            floor: formFloor !== '' ? Number(formFloor) : undefined,
                            status: formStatus,
                            notes: formNotes || undefined,
                            isEnabled: formIsEnabled,
                        });
                        createdCount++;
                    } catch (e: any) {
                        console.warn(`Failed to create room ${finalNum}:`, e);
                    }
                }
                toast.success(`Successfully added ${createdCount} physical rooms`);
            } else {
                if (!formRoomNumber.trim()) {
                    toast.error('Room number is required');
                    setIsSaving(false);
                    return;
                }
                await roomsService.create({
                    propertyId,
                    roomNumber: formRoomNumber.trim(),
                    roomTypeId: formRoomTypeId,
                    floor: formFloor !== '' ? Number(formFloor) : undefined,
                    status: formStatus,
                    notes: formNotes || undefined,
                    isEnabled: formIsEnabled,
                });
                toast.success(`Room ${formRoomNumber.trim()} added successfully`);
            }
            setIsCreateModalOpen(false);
            await loadRooms();
        } catch (err: any) {
            console.error('Failed to create room:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to create room');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;
        if (!formRoomNumber.trim()) {
            toast.error('Room number is required');
            return;
        }
        if (!formRoomTypeId) {
            toast.error('Please select a Room Type');
            return;
        }

        setIsSaving(true);
        try {
            await roomsService.update(editingRoom.id, {
                propertyId,
                roomNumber: formRoomNumber.trim(),
                roomTypeId: formRoomTypeId,
                floor: formFloor !== '' ? Number(formFloor) : undefined,
                status: formStatus,
                notes: formNotes || undefined,
                isEnabled: formIsEnabled,
            });
            toast.success(`Room ${formRoomNumber.trim()} updated successfully`);
            setIsEditModalOpen(false);
            setEditingRoom(null);
            await loadRooms();
        } catch (err: any) {
            console.error('Failed to update room:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update room');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestoreRoom = async (room: Room) => {
        try {
            await roomsService.update(room.id, {
                propertyId,
                isEnabled: true,
                status: RoomStatus.AVAILABLE
            });
            toast.success(`Room ${room.roomNumber} restored and re-enabled successfully!`);
            setActiveMenuId(null);
            await loadRooms();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to restore room');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingRoom) return;
        setIsDeleting(true);
        try {
            const res = await roomsService.delete(deletingRoom.id);
            toast.success(res?.message || `Room ${deletingRoom.roomNumber} deleted successfully`);
            setDeletingRoom(null);
            await loadRooms();
        } catch (err: any) {
            console.error('Failed to delete room:', err);
            toast.error(err.response?.data?.message || 'Failed to delete room');
        } finally {
            setIsDeleting(false);
        }
    };

    const hasHistory = !!deletingRoom?.hasHistory ||
        (((deletingRoom?._count?.bookingRooms || 0) + (deletingRoom?._count?.bookings || 0) + (deletingRoom?._count?.blocks || 0)) > 0);

    return (
        <div>
            {/* Top Bar matching PMS RoomsList */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage rooms for {propertyName || 'your property'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 font-bold cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Room
                </button>
            </div>

            {/* PMS Card Container */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Filters Row matching PMS */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by room number..."
                            className="w-full pl-10 pr-4 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Date Picker */}
                        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={format(selectedDate, 'yyyy-MM-dd')}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="bg-transparent text-sm text-foreground focus:outline-none focus:ring-0 border-none p-0 cursor-pointer"
                            />
                        </div>

                        {/* Room Type Filter Dropdown */}
                        <div className="flex items-center gap-1.5">
                            <BedDouble className="h-4 w-4 text-muted-foreground ml-1" />
                            <select
                                value={roomTypeFilter}
                                onChange={(e) => setRoomTypeFilter(e.target.value)}
                                className="bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all font-semibold cursor-pointer"
                            >
                                <option value="">All Room Types</option>
                                {roomTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="flex items-center gap-1.5">
                            <Filter className="h-4 w-4 text-muted-foreground ml-1" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all font-semibold cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="AVAILABLE">Available</option>
                                <option value="OCCUPIED">Occupied</option>
                                <option value="RESERVED">Reserved</option>
                                <option value="OUT_TODAY">Out Today</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                        </div>

                        {/* Show Disabled Rooms Checkbox */}
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold cursor-pointer ml-2">
                            <input
                                type="checkbox"
                                checked={showDisabled}
                                onChange={(e) => setShowDisabled(e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                            />
                            Show Disabled Rooms
                        </label>
                    </div>
                </div>

                {/* Active Filter Banner when filtering by Room Type */}
                {selectedRoomTypeObject && (
                    <div className="px-4 py-2.5 bg-blue-50/60 dark:bg-blue-950/20 border-b border-border flex items-center justify-between text-xs animate-in fade-in">
                        <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <BedDouble className="h-4 w-4" />
                            Showing rooms for room type: <strong className="font-black underline">{selectedRoomTypeObject.name}</strong>
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-black text-[10px]">
                                {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} found
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setRoomTypeFilter('')}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-bold flex items-center gap-1 hover:underline cursor-pointer bg-blue-100/50 dark:bg-blue-900/30 px-2 py-1 rounded-md transition-colors"
                        >
                            <X className="h-3.5 w-3.5" /> Clear Filter
                        </button>
                    </div>
                )}

                {/* Grid View for Rooms matching PMS */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-semibold text-muted-foreground">Loading rooms...</p>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl font-medium">
                            No rooms found.
                        </div>
                    ) : (
                        rooms.map((room) => {
                            const dateToCompare = new Date(selectedDate);
                            dateToCompare.setHours(0, 0, 0, 0);

                            // Calculate upcoming counts (after selected date)
                            const upcomingBookings = room.bookingRooms?.filter((br: any) => {
                                const checkIn = new Date(br.booking.checkInDate);
                                return isAfter(checkIn, dateToCompare);
                            }) || [];

                            const upcomingBlocks = room.blocks?.filter((b: any) => {
                                if (b.bookingId) return false;
                                if (b.reason?.startsWith('Group Booking') || b.reason?.startsWith('Multi-Room Booking')) return false;
                                const startDate = new Date(b.startDate);
                                return isAfter(startDate, dateToCompare);
                            }) || [];

                            const linkedTypeName = room.roomType?.name || roomTypes.find(t => t.id === room.roomTypeId)?.name || 'Unassigned';

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => {
                                        setSelectedRoomId(room.id);
                                        setIsScheduleModalOpen(true);
                                    }}
                                    className={clsx(
                                        "border rounded-xl p-4 transition-all hover:shadow-md group cursor-pointer hover:border-primary/30",
                                        getCardStyle(room.status)
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                                            {room.roomNumber}
                                        </span>
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1",
                                            !room.isEnabled ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20" : getStatusColor(room.status)
                                        )}>
                                            {!room.isEnabled ? <Archive className="h-3.5 w-3.5 text-slate-500" /> : getStatusIcon(room.status)}
                                            {!room.isEnabled ? 'DEACTIVATED' : room.status}
                                        </span>
                                    </div>

                                    <div className="text-sm text-muted-foreground mb-4">
                                        <p className="font-bold text-card-foreground mb-3">{linkedTypeName}</p>
                                        <p className="mb-2">Floor: {room.floor ?? '-'}</p>

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {upcomingBookings.length > 0 && (
                                                <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {upcomingBookings.length} Upcoming {upcomingBookings.length === 1 ? 'Booking' : 'Bookings'}
                                                </div>
                                            )}
                                            {upcomingBlocks.length > 0 && (
                                                <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                    <Lock className="h-3 w-3" />
                                                    {upcomingBlocks.length} Upcoming {upcomingBlocks.length === 1 ? 'Block' : 'Blocks'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 dark:border-gray-800">
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {room.isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === room.id ? null : room.id);
                                                }}
                                                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>

                                            {activeMenuId === room.id && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute right-0 bottom-full mb-2 w-36 bg-card rounded-xl shadow-xl border border-border z-20 m-1 overflow-hidden"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(room)}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBlockingRoom(room);
                                                            setIsBlockModalOpen(true);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                                    >
                                                        <Lock className="h-3.5 w-3.5 text-amber-500" /> Block Room
                                                    </button>
                                                    {!room.isEnabled ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestoreRoom(room)}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 font-bold transition-colors cursor-pointer"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Restore Room
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDeletingRoom(room);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Click outside to close 3-dot menu */}
                {activeMenuId && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenuId(null)}
                        style={{ background: 'transparent' }}
                    />
                )}
            </div>

            {/* Block Room Modal */}
            {isBlockModalOpen && blockingRoom && (
                <BlockRoomModal
                    room={blockingRoom}
                    defaultCheckInTime={defaultCheckInTime}
                    defaultCheckOutTime={defaultCheckOutTime}
                    onClose={() => {
                        setIsBlockModalOpen(false);
                        setBlockingRoom(null);
                    }}
                    onSuccess={() => {
                        setIsBlockModalOpen(false);
                        setBlockingRoom(null);
                        loadRooms();
                    }}
                />
            )}

            {/* Room Schedule & Bookings Modal */}
            {isScheduleModalOpen && selectedRoomId && (
                <RoomScheduleModal
                    roomId={selectedRoomId}
                    selectedDate={selectedDate}
                    isOpen={isScheduleModalOpen}
                    onClose={() => {
                        setIsScheduleModalOpen(false);
                        setSelectedRoomId(null);
                    }}
                    onUnblockSuccess={loadRooms}
                />
            )}

            {/* Custom Confirm Modal for Room Deletion identical to PMS */}
            {deletingRoom && (
                <ConfirmModal
                    isOpen={!!deletingRoom}
                    onClose={() => setDeletingRoom(null)}
                    onConfirm={handleConfirmDelete}
                    isLoading={isDeleting}
                    variant={hasHistory ? 'warning' : 'danger'}
                    title={hasHistory ? `Deactivate Room ${deletingRoom.roomNumber}?` : `Permanently Delete Room ${deletingRoom.roomNumber}?`}
                    description={
                        hasHistory ? (
                            <span>
                                Room <strong className="text-foreground font-bold">{deletingRoom.roomNumber}</strong> has historical booking or block records.
                                <br /><br />
                                To protect past financial reports and audit logs, this room will be <strong className="text-amber-500 font-bold uppercase">DEACTIVATED</strong>. It will no longer receive new bookings, but can be restored anytime by toggling <em>"Show Disabled Rooms"</em>.
                            </span>
                        ) : (
                            <span>
                                Room <strong className="text-foreground font-bold">{deletingRoom.roomNumber}</strong> has zero historical bookings or blocks.
                                <br /><br />
                                This room will be <strong className="text-rose-500 font-bold uppercase">PERMANENTLY DELETED</strong> from the system database. This action cannot be undone.
                            </span>
                        )
                    }
                    confirmText={hasHistory ? "Deactivate Room" : "Permanently Delete"}
                />
            )}

            {/* Modal: Add New Room (Single Room + Batch Generator) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card text-card-foreground rounded-2xl max-w-lg w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                Add New Room
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Mode Selector Tabs */}
                        <div className="flex border-b border-border px-6 pt-3 gap-4 bg-muted/20">
                            <button
                                type="button"
                                onClick={() => setCreateMode('single')}
                                className={clsx(
                                    "pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
                                    createMode === 'single' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Single Room
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateMode('bulk')}
                                className={clsx(
                                    "pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                                    createMode === 'bulk' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                Batch Generator
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
                            {createMode === 'single' ? (
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-1">
                                        Room Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 101, Villa-1"
                                        value={formRoomNumber}
                                        onChange={(e) => setFormRoomNumber(e.target.value)}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <p className="text-xs text-muted-foreground">
                                        Quickly generate multiple rooms sequentially (e.g. 101 to 110, or DLX-1 to DLX-10).
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Prefix (Opt)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. A-, RM-"
                                                value={bulkPrefix}
                                                onChange={(e) => setBulkPrefix(e.target.value)}
                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Start # *</label>
                                            <input
                                                type="number"
                                                required
                                                value={bulkStart}
                                                onChange={(e) => setBulkStart(Number(e.target.value))}
                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">End # *</label>
                                            <input
                                                type="number"
                                                required
                                                value={bulkEnd}
                                                onChange={(e) => setBulkEnd(Number(e.target.value))}
                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-bold text-primary">
                                        Preview: {bulkPrefix}{bulkStart}, {bulkPrefix}{bulkStart + 1}, ... {bulkPrefix}{bulkEnd} ({Math.max(0, bulkEnd - bulkStart + 1)} rooms)
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Room Type *
                                </label>
                                <select
                                    required
                                    value={formRoomTypeId}
                                    onChange={(e) => setFormRoomTypeId(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold cursor-pointer"
                                >
                                    <option value="">Select Type</option>
                                    {roomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-1">
                                        Floor (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1"
                                        value={formFloor}
                                        onChange={(e) => setFormFloor(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-1">
                                        Initial Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as RoomStatus)}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold cursor-pointer"
                                    >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="CLEANING">Cleaning</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Special room features, balcony view, remarks..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-medium"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="formIsEnabled"
                                    checked={formIsEnabled}
                                    onChange={(e) => setFormIsEnabled(e.target.checked)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer"
                                />
                                <label htmlFor="formIsEnabled" className="ml-2 block text-sm font-medium text-foreground cursor-pointer">
                                    Room is enabled (Available for booking)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-colors cursor-pointer text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                    {createMode === 'bulk' ? 'Generate Rooms' : 'Save Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Room */}
            {isEditModalOpen && editingRoom && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card text-card-foreground rounded-2xl max-w-lg w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Edit2 className="h-5 w-5 text-blue-500" />
                                Edit Room {editingRoom.roomNumber}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateRoom} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Room Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formRoomNumber}
                                    onChange={(e) => setFormRoomNumber(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Room Type *
                                </label>
                                <select
                                    required
                                    value={formRoomTypeId}
                                    onChange={(e) => setFormRoomTypeId(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold cursor-pointer"
                                >
                                    <option value="">Select Type</option>
                                    {roomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-1">
                                        Floor (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1"
                                        value={formFloor}
                                        onChange={(e) => setFormFloor(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-foreground mb-1">
                                        Room Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as RoomStatus)}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold cursor-pointer"
                                    >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="CLEANING">Cleaning</option>
                                        <option value="OCCUPIED">Occupied</option>
                                        <option value="BLOCKED">Blocked</option>
                                        <option value="RESERVED">Reserved</option>
                                        <option value="OUT_TODAY">Out Today</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Additional room details..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="editIsEnabled"
                                        checked={formIsEnabled}
                                        onChange={(e) => setFormIsEnabled(e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer"
                                    />
                                    <label htmlFor="editIsEnabled" className="ml-2 block text-sm font-bold text-foreground cursor-pointer">
                                        Room is enabled (Available for booking)
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground ml-6 font-medium">
                                    Checking this box will restore a deactivated room and make it available for active guest bookings again.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-colors cursor-pointer text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                    Update Room
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoomsTab;
