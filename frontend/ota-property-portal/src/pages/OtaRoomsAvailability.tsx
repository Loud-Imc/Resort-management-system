import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Calendar, AlertCircle, Edit2, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

export default function OtaRoomsAvailability() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar parameters
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 10), 'yyyy-MM-dd'));
  const [availability, setAvailability] = useState<any[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // Add Room form
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  // Edit Room modal state
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomTypeId, setEditRoomTypeId] = useState('');
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [startDate, endDate]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [roomsRes, typesRes] = await Promise.all([
        otaService.getRooms(),
        otaService.getRoomTypes(),
      ]);
      setRooms(roomsRes);
      setRoomTypes(typesRes);
      if (typesRes.length > 0) {
        setRoomTypeId(typesRes[0].id);
      }
    } catch (e) {
      toast.error('Failed to load room allocations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setIsCalendarLoading(true);
    try {
      const res = await otaService.getCalendarAvailability(startDate, endDate);
      setAvailability(res);
    } catch (e) {
      toast.error('Failed to load availability matrix');
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !roomTypeId) {
      toast.error('Please input room number and category');
      return;
    }
    setIsSavingRoom(true);
    try {
      await otaService.createRoom({ roomNumber, roomTypeId });
      toast.success('Room unit added successfully');
      setRoomNumber('');
      const roomsRes = await otaService.getRooms();
      setRooms(roomsRes);
      fetchCalendar();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add room unit');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleStartEdit = (room: any) => {
    setEditingRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomTypeId(room.roomTypeId);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editRoomNumber.trim() || !editRoomTypeId) return;
    setIsUpdatingRoom(true);
    try {
      await otaService.updateRoom(editingRoom.id, {
        roomNumber: editRoomNumber,
        roomTypeId: editRoomTypeId,
      });
      toast.success('Room unit updated successfully');
      setEditingRoom(null);
      const roomsRes = await otaService.getRooms();
      setRooms(roomsRes);
      fetchCalendar();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update room unit');
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  // Delete Room Modal state
  const [deletingRoom, setDeletingRoom] = useState<{ id: string; number: string } | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const handleDeleteRoom = (id: string, number: string) => {
    setDeletingRoom({ id, number });
  };

  const confirmDeleteRoom = async () => {
    if (!deletingRoom) return;
    setIsDeletingRoom(true);
    try {
      const res: any = await otaService.deleteRoom(deletingRoom.id);
      toast.success(res?.message || 'Room unit deleted');
      setDeletingRoom(null);
      const roomsRes = await otaService.getRooms();
      setRooms(roomsRes);
      fetchCalendar();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete room unit');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get array of date strings in window range
  const datesInRange: string[] = [];
  if (availability.length > 0 && availability[0]?.dates) {
    Object.keys(availability[0].dates).forEach((d) => datesInRange.push(d));
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div>
        <h2 className="text-xl font-black text-foreground">Rooms & Grid Availability</h2>
        <p className="text-muted-foreground text-xs mt-0.5">Track physical room units and update the daily calendar grid availability.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add & List Room Numbers */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-foreground">Add Physical Room Unit</h3>
            <form onSubmit={handleAddRoom} className="space-y-3.5 text-xs text-foreground">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Identifier / Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 104"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Category / Type</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-muted-foreground font-semibold"
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSavingRoom}
                className="w-full py-2.5 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingRoom && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Add Unit</span>
              </button>
            </form>
          </div>

          <div className="p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col max-h-[360px] overflow-hidden">
            <h3 className="font-extrabold text-sm text-foreground mb-3">Room Units Catalog</h3>
            <div className="flex-1 overflow-y-auto divide-y divide-border pr-1">
              {rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4">No rooms defined yet.</p>
              ) : (
                rooms.map((r) => (
                  <div key={r.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-foreground block">{r.roomNumber}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {r.roomType?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                        title="Edit Unit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(r.id, r.roomNumber)}
                        className="p-1 text-muted-foreground hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"
                        title="Delete Unit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Dynamic Daily Calendar Availability Grid */}
        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-extrabold text-sm text-foreground">Sellable Calendar Matrix</h3>
            </div>

            <div className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="date"
                className="px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted-foreground font-semibold">to</span>
              <input
                type="date"
                className="px-2.5 py-1.5 bg-muted/40 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {isCalendarLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availability.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-muted-foreground/45 mb-2" />
              <p className="text-xs font-bold">Please add room units first to generate the grid layout.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                    <th className="p-3 border-r border-border min-w-[120px]">Room Type</th>
                    {datesInRange.map((dateStr) => (
                      <th key={dateStr} className="p-2 text-center min-w-[45px] border-r border-border font-extrabold leading-tight">
                        {format(new Date(dateStr), 'dd')}<br />
                        <span className="text-[8px] font-bold text-muted-foreground/75 uppercase">{format(new Date(dateStr), 'E')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {availability.map((row) => (
                    <tr key={row.roomTypeId} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-bold text-foreground border-r border-border min-w-[120px] bg-muted/5">
                        {row.roomTypeName}
                      </td>
                      {datesInRange.map((dateStr) => {
                        const cell = row.dates[dateStr];
                        const avail = cell ? cell.available : 0;
                        const booked = cell ? cell.booked : 0;
                        const total = cell ? cell.total : 0;
                        const isSoldOut = total > 0 && avail === 0;

                        return (
                          <td key={dateStr} className="p-2 border-r border-border text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs font-black leading-none ${
                                isSoldOut ? 'text-rose-500' : avail > 0 ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {avail}
                              </span>
                              <span className="text-[8px] text-muted-foreground/60 font-semibold mt-1 block">
                                {booked}/{total}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm text-foreground">Edit Room Unit</h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Number</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={editRoomNumber}
                  onChange={(e) => setEditRoomNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Category / Type</label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-muted-foreground font-semibold"
                  value={editRoomTypeId}
                  onChange={(e) => setEditRoomTypeId(e.target.value)}
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRoom}
                  className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground font-extrabold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal for Unit Deletion */}
      <ConfirmModal
        isOpen={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={confirmDeleteRoom}
        isLoading={isDeletingRoom}
        title={`Delete Room Unit ${deletingRoom?.number || ''}?`}
        description={
          <span>
            Are you sure you want to delete room <strong className="text-foreground font-bold">{deletingRoom?.number}</strong>?
            <br /><br />
            If this room has historical bookings, it will be soft-disabled (<span className="text-amber-500 font-bold">MAINTENANCE</span>) to preserve audit reports. If it has zero history, it will be permanently deleted.
          </span>
        }
        confirmText="Delete Unit"
      />
    </div>
  );
}

