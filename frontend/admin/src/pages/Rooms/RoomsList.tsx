import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import { Room, RoomStatus } from '../../types/room';
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
    Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';


export default function RoomsList() {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: rooms, isLoading, error } = useQuery<Room[]>({
        queryKey: ['rooms', statusFilter],
        queryFn: () => roomsService.getAll({ status: statusFilter || undefined }),
    });

    const deleteMutation = useMutation({
        mutationFn: roomsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setActiveMenuId(null);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to delete room');
        },
    });

    const handleDelete = (id: string, roomNumber: string) => {
        if (confirm(`Are you sure you want to delete room ${roomNumber}? This action cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };


    const getStatusColor = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE:
                return 'bg-green-100 text-green-800';
            case RoomStatus.OCCUPIED:
                return 'bg-blue-100 text-blue-800';
            case RoomStatus.MAINTENANCE:
                return 'bg-orange-100 text-orange-800';
            case RoomStatus.BLOCKED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
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
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Error loading rooms. Please try again.
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage hotel rooms</p>
                </div>
                <Link
                    to="/rooms/create"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Room
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by room number..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="BLOCKED">Blocked</option>
                        </select>
                    </div>
                </div>

                {/* Grid View for Rooms */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {rooms?.map((room) => (
                        <div
                            key={room.id}
                            className={clsx(
                                "border rounded-lg p-4 transition-all hover:shadow-md",
                                room.status === RoomStatus.AVAILABLE ? "border-gray-200 bg-white" :
                                    room.status === RoomStatus.OCCUPIED ? "border-blue-200 bg-blue-50" :
                                        room.status === RoomStatus.MAINTENANCE ? "border-orange-200 bg-orange-50" :
                                            "border-red-200 bg-red-50"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xl font-bold text-gray-900">
                                    {room.roomNumber}
                                </span>
                                <span className={clsx(
                                    "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                                    getStatusColor(room.status)
                                )}>
                                    {getStatusIcon(room.status)}
                                    {room.status}
                                </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-4">
                                <p className="font-medium text-gray-900">{room.roomType.name}</p>
                                <p>Floor: {room.floor ?? '-'}</p>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                                <span className="text-xs text-gray-500">
                                    {room.isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenuId(activeMenuId === room.id ? null : room.id)}
                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>

                                    {activeMenuId === room.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 z-10 m-1">
                                            <button
                                                onClick={() => navigate(`/rooms/edit/${room.id}`)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg"
                                            >
                                                <Edit2 className="h-3 w-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(room.id, room.roomNumber)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 last:rounded-b-lg"
                                            >
                                                <Trash2 className="h-3 w-3" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Click outside to close menu */}
                {activeMenuId && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setActiveMenuId(null)}
                        style={{ background: 'transparent' }}
                    />
                )}

                {rooms?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No rooms found.
                    </div>
                )}
            </div>
        </div>
    );
}
